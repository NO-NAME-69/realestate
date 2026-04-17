// src/modules/auth/auth.service.ts
// Authentication business logic — registration, login, OTP, refresh token rotation

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { sha256 } from '../../lib/crypto.js';
import { writeAuditLog } from '../../lib/audit.js';
import {
  incrementLoginAttempts,
  resetLoginAttempts,
  isAccountLocked,
  lockAccount,
  storeOTP,
  verifyOTP,
} from '../../lib/redis.js';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../lib/errors.js';
import type { RegisterInput, LoginInput } from '../../schemas/auth.schema.js';
import { UserRole } from '../../types/enums.js';

const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_INPUT = 72; // bytes
const MAX_ACTIVE_SESSIONS = 3;

function truncateForBcrypt(password: string): string {
  return Buffer.from(password, 'utf8').subarray(0, MAX_BCRYPT_INPUT).toString();
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(truncateForBcrypt(password), BCRYPT_ROUNDS);
}

async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(truncateForBcrypt(plain), hash);
}

// ━━━━━━━━ REGISTER ━━━━━━━━

export async function registerUser(
  input: RegisterInput,
  ip: string,
  userAgent: string,
): Promise<{ userId: string; message: string }> {
  // Check duplicates
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { mobile: input.mobile }],
      deletedAt: null,
    },
  });

  if (existing) {
    throw new ConflictError('Email or mobile already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: input.email,
        mobile: input.mobile,
        passwordHash,
        fullName: input.full_name,
        address: input.address,
        passwordHistory: [passwordHash],
      },
    });

    // Create wallet with zero balance
    await tx.wallet.create({ data: { userId: u.id } });

    // Handle referral if provided
    if (input.referral_code) {
      const team = await tx.team.findUnique({
        where: { referralCode: input.referral_code },
      });
      if (team) {
        await tx.teamMember.create({
          data: { teamId: team.id, userId: u.id },
        });
        await tx.team.update({
          where: { id: team.id },
          data: { memberCount: { increment: 1 } },
        });
        await tx.referral.create({
          data: {
            referrerId: team.leaderId,
            refereeId: u.id,
            bonusPaise: env.REFERRAL_BONUS_PAISE,
          },
        });

        // Recompute team leader activation
        await recomputeActivation(tx, team.leaderId);
      }
    }

    return u;
  });

  // Generate and store OTP
  const otp = generateOTP();
  await storeOTP(user.mobile, otp, 300); // 5 min TTL

  void writeAuditLog({
    type: 'USER_REGISTERED',
    actorId: user.id,
    actorRole: 'INVESTOR',
    targetType: 'user',
    targetId: user.id,
    ipAddress: ip,
    userAgentHash: sha256(userAgent),
    payload: { email: user.email },
    result: 'SUCCESS',
  });

  return { userId: user.id, message: 'OTP sent to mobile for verification' };
}

// ━━━━━━━━ CHECK AVAILABILITY ━━━━━━━━

export async function checkAvailability(
  field: 'email' | 'mobile',
  value: string,
): Promise<{ available: boolean }> {
  const where = field === 'email'
    ? { email: value, deletedAt: null }
    : { mobile: value, deletedAt: null };

  const existing = await prisma.user.findFirst({ where });
  return { available: !existing };
}

// ━━━━━━━━ LOGIN ━━━━━━━━

export async function loginUser(
  input: LoginInput,
  ip: string,
  userAgent: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  user: { id: string; role: UserRole; status: string };
}> {
  // Check account lockout
  const locked = await isAccountLocked(input.identifier);
  if (locked) {
    throw new AppError('ACCOUNT_LOCKED', 423, 'Account temporarily locked. Try again later.');
  }

  // Find user by email or mobile
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.identifier }, { mobile: input.identifier }],
      deletedAt: null,
    },
  });

  if (!user) {
    await trackFailedLogin(input.identifier, ip, userAgent);
    throw new UnauthorizedError('Invalid credentials');
  }

  // Verify password
  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    await trackFailedLogin(input.identifier, ip, userAgent, user.id);
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check max sessions
  const activeSessions = await prisma.userSession.count({
    where: { userId: user.id, isRevoked: false, expiresAt: { gt: new Date() } },
  });
  if (activeSessions >= MAX_ACTIVE_SESSIONS) {
    // Revoke oldest session
    const oldest = await prisma.userSession.findFirst({
      where: { userId: user.id, isRevoked: false },
      orderBy: { createdAt: 'asc' },
    });
    if (oldest) {
      await prisma.userSession.update({
        where: { id: oldest.id },
        data: { isRevoked: true },
      });
    }
  }

  // Create session with token family
  const tokenFamily = uuidv4();
  const refreshToken = signRefreshToken({
    userId: user.id,
    sessionId: '', // will be updated after session creation
    family: tokenFamily,
  });

  const refreshHash = await bcrypt.hash(truncateForBcrypt(refreshToken), BCRYPT_ROUNDS);

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenFamily,
      tokenHash: refreshHash,
      ipAddress: ip,
      userAgentHash: sha256(userAgent),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role as UserRole,
    sessionId: session.id,
  });

  // Reset login attempts
  await resetLoginAttempts(input.identifier, ip);

  void writeAuditLog({
    type: 'USER_LOGIN_SUCCESS',
    actorId: user.id,
    actorRole: user.role,
    targetType: 'user',
    targetId: user.id,
    ipAddress: ip,
    userAgentHash: sha256(userAgent),
    payload: {},
    result: 'SUCCESS',
  });

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
    user: { id: user.id, role: user.role as UserRole, status: user.status },
  };
}

// ━━━━━━━━ REFRESH TOKEN ━━━━━━━━

export async function refreshAccessToken(
  refreshToken: string,
  sessionId: string,
  ip: string,
  userAgent: string,
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });

  if (!session) throw new UnauthorizedError('Invalid session');

  // Reuse detection: if session is already revoked, it's a reuse attack
  if (session.isRevoked) {
    // Invalidate ENTIRE token family
    await prisma.userSession.updateMany({
      where: { tokenFamily: session.tokenFamily },
      data: { isRevoked: true },
    });
    void writeAuditLog({
      type: 'SESSION_REVOKED',
      actorId: session.userId,
      actorRole: null,
      targetType: 'session',
      targetId: session.id,
      ipAddress: ip,
      userAgentHash: sha256(userAgent),
      payload: { reason: 'refresh_token_reuse', family: session.tokenFamily },
      result: 'FAILURE',
      failureReason: 'Refresh token reuse detected — entire family invalidated',
    });
    throw new UnauthorizedError('Session compromised. Please login again.');
  }

  // Verify token hash
  const valid = await bcrypt.compare(truncateForBcrypt(refreshToken), session.tokenHash);
  if (!valid) throw new UnauthorizedError('Invalid refresh token');

  // Check expiry
  if (session.expiresAt < new Date()) throw new UnauthorizedError('Refresh token expired');

  // Rotate: revoke old, create new in same family
  await prisma.userSession.update({
    where: { id: session.id },
    data: { isRevoked: true },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const newRefreshToken = signRefreshToken({
    userId: user.id,
    sessionId: '',
    family: session.tokenFamily,
  });

  const newRefreshHash = await bcrypt.hash(truncateForBcrypt(newRefreshToken), BCRYPT_ROUNDS);

  const newSession = await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenFamily: session.tokenFamily,
      tokenHash: newRefreshHash,
      ipAddress: ip,
      userAgentHash: sha256(userAgent),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role as UserRole,
    sessionId: newSession.id,
  });

  return { accessToken, refreshToken: newRefreshToken, sessionId: newSession.id };
}

// ━━━━━━━━ LOGOUT ━━━━━━━━

export async function logoutUser(sessionId: string): Promise<void> {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { isRevoked: true },
  });
}

// ━━━━━━━━ VERIFY OTP ━━━━━━━━

export async function verifyMobileOTP(mobile: string, otp: string): Promise<boolean> {
  const valid = await verifyOTP(mobile, otp);
  if (!valid) return false;

  await prisma.user.updateMany({
    where: { mobile, deletedAt: null },
    data: { isMobileVerified: true },
  });
  return true;
}

// ━━━━━━━━ ACTIVATION RECOMPUTATION ━━━━━━━━

export async function recomputeActivation(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
): Promise<void> {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user || user.status === 'ACTIVE') return;

  // Check team path
  const membership = await tx.teamMember.findFirst({
    where: { userId },
    include: { team: true },
  });
  const teamSize = membership?.team.memberCount ?? 0;
  const activateByTeam = teamSize >= env.MIN_TEAM_SIZE;

  // Check investment path
  const activateByInvestment = user.totalInvestment >= env.ACTIVATION_THRESHOLD_PAISE;

  if (activateByTeam || activateByInvestment) {
    const reason =
      activateByTeam && activateByInvestment
        ? 'BOTH'
        : activateByTeam
          ? 'TEAM'
          : 'INVESTMENT';

    await tx.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', activationReason: reason },
    });
  }
}

// ━━━━━━━━ HELPERS ━━━━━━━━

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function trackFailedLogin(
  identifier: string,
  ip: string,
  userAgent: string,
  userId?: string,
): Promise<void> {
  const attempts = await incrementLoginAttempts(identifier, ip);

  void writeAuditLog({
    type: 'USER_LOGIN_FAILURE',
    actorId: userId ?? null,
    actorRole: null,
    targetType: 'user',
    targetId: userId ?? null,
    ipAddress: ip,
    userAgentHash: sha256(userAgent),
    payload: { attempts, identifier: identifier.slice(0, 3) + '***' },
    result: 'FAILURE',
    failureReason: 'Invalid credentials',
  });

  // Lockout escalation
  if (attempts >= 10) {
    await lockAccount(identifier, 86400); // 24h hard lock
  } else if (attempts >= 6) {
    await lockAccount(identifier, 1800); // 30 min
  }
}
