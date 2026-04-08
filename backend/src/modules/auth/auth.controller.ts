// src/modules/auth/auth.controller.ts
// Request/response handling for auth endpoints

import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyMobileOTP,
} from './auth.service.js';
import type {
  RegisterInput,
  LoginInput,
  VerifyOTPInput,
} from '../../schemas/auth.schema.js';

export async function registerController(
  request: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await registerUser(
    request.body,
    request.ip,
    String(request.headers['user-agent'] ?? ''),
  );
  void reply.code(201).send({ data: result });
}

export async function loginController(
  request: FastifyRequest<{ Body: LoginInput }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await loginUser(
    request.body,
    request.ip,
    String(request.headers['user-agent'] ?? ''),
  );

  // Set refresh token as HttpOnly cookie
  void reply.setCookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  void reply.send({
    data: {
      accessToken: result.accessToken,
      sessionId: result.sessionId,
      user: result.user,
    },
  });
}

export async function refreshController(
  request: FastifyRequest<{ Body: { session_id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const refreshToken = request.cookies['refreshToken'];
  if (!refreshToken) {
    void reply.code(401).send({ error: 'No refresh token', requestId: request.id });
    return;
  }

  const result = await refreshAccessToken(
    refreshToken,
    request.body.session_id,
    request.ip,
    String(request.headers['user-agent'] ?? ''),
  );

  void reply.setCookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60,
  });

  void reply.send({
    data: {
      accessToken: result.accessToken,
      sessionId: result.sessionId,
    },
  });
}

export async function logoutController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await logoutUser(request.user.sessionId);
  void reply.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
  void reply.send({ data: { message: 'Logged out successfully' } });
}

export async function verifyOTPController(
  request: FastifyRequest<{ Body: VerifyOTPInput }>,
  reply: FastifyReply,
): Promise<void> {
  const valid = await verifyMobileOTP(request.body.mobile, request.body.otp);
  if (!valid) {
    void reply.code(422).send({ error: 'Invalid or expired OTP', requestId: request.id });
    return;
  }
  void reply.send({ data: { message: 'Mobile verified successfully' } });
}
