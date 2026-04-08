// src/modules/user/user.routes.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../lib/errors.js';
import { env } from '../../config/env.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // Get current user profile
  fastify.get('/me', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true, email: true, mobile: true, fullName: true, address: true,
          dateOfBirth: true, occupation: true, profilePhotoUrl: true,
          status: true, role: true, isMobileVerified: true, isEmailVerified: true,
          activationReason: true, totalInvestment: true, createdAt: true,
        },
      });
      if (!user) throw new NotFoundError('User');
      void reply.send({ data: user });
    },
  });

  // Update profile
  fastify.put('/me', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const allowedFields = ['fullName', 'address', 'dateOfBirth', 'occupation', 'panNumber', 'aadhaarNumber', 'bankAccountNumber', 'bankIfsc', 'upiId'];
      const update: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (field in body) update[field] = body[field];
      }
      const user = await prisma.user.update({
        where: { id: request.user.id },
        data: update,
        select: { id: true, fullName: true, email: true, status: true },
      });
      void reply.send({ data: user });
    },
  });

  // Get dashboard stats
  fastify.get('/me/dashboard', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.id;
      const [user, wallet, investmentCount, plotHoldCount, profitTotal] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { status: true, role: true, totalInvestment: true } }),
        prisma.wallet.findUnique({ where: { userId }, select: { balance: true } }),
        prisma.investment.count({ where: { userId, deletedAt: null } }),
        prisma.plotHold.count({ where: { userId, status: 'ACTIVE' } }),
        prisma.profitDistribution.aggregate({ where: { userId, status: 'COMPLETED' }, _sum: { userProfit: true } }),
      ]);

      const teamMembership = await prisma.teamMember.findFirst({
        where: { userId },
        include: { team: { select: { memberCount: true, teamValue: true } } },
      });

      void reply.send({
        data: {
          status: user.status,
          role: user.role,
          walletBalance: wallet?.balance ?? 0,
          totalInvested: user.totalInvestment,
          totalProfit: profitTotal._sum.userProfit ?? 0,
          activeInvestments: investmentCount,
          plotsHeld: plotHoldCount,
          teamSize: teamMembership?.team.memberCount ?? 0,
          teamValue: teamMembership?.team.teamValue ?? 0,
        },
      });
    },
  });

  // Get activation status
  fastify.get('/me/activation-status', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: request.user.id },
        select: { status: true, activationReason: true, totalInvestment: true },
      });

      const teamMembership = await prisma.teamMember.findFirst({
        where: { userId: request.user.id },
        include: { team: { select: { memberCount: true } } },
      });

      void reply.send({
        data: {
          status: user.status,
          activationReason: user.activationReason,
          paths: {
            team: { current: teamMembership?.team.memberCount ?? 0, required: env.MIN_TEAM_SIZE, met: (teamMembership?.team.memberCount ?? 0) >= env.MIN_TEAM_SIZE },
            investment: { current: user.totalInvestment, required: env.ACTIVATION_THRESHOLD_PAISE, met: user.totalInvestment >= env.ACTIVATION_THRESHOLD_PAISE },
          },
        },
      });
    },
  });
}
