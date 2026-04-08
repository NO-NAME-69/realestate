// src/modules/team/team.routes.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../config/database.js';
import { AppError, NotFoundError } from '../../lib/errors.js';
import { v4 as uuidv4 } from 'uuid';

export async function teamRoutes(fastify: FastifyInstance): Promise<void> {
  // Create team (one per user)
  fastify.post('/', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const existing = await prisma.team.findUnique({ where: { leaderId: request.user.id } });
      if (existing) throw new AppError('TEAM_EXISTS', 409, 'You already have a team');

      const referralCode = uuidv4().slice(0, 8).toUpperCase();
      const team = await prisma.team.create({
        data: { leaderId: request.user.id, referralCode },
      });

      // Update user role to TEAM_LEADER
      await prisma.user.update({
        where: { id: request.user.id },
        data: { role: 'TEAM_LEADER' },
      });

      void reply.code(201).send({ data: team });
    },
  });

  // Get my team
  fastify.get('/mine', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const team = await prisma.team.findUnique({
        where: { leaderId: request.user.id },
        include: { _count: { select: { members: true } } },
      });
      if (!team) throw new NotFoundError('Team');
      void reply.send({ data: team });
    },
  });

  // Get team members
  fastify.get('/mine/members', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const team = await prisma.team.findUnique({ where: { leaderId: request.user.id } });
      if (!team) throw new NotFoundError('Team');

      const members = await prisma.teamMember.findMany({
        where: { teamId: team.id },
        include: { user: { select: { id: true, fullName: true, email: true, status: true, totalInvestment: true, createdAt: true } } },
        orderBy: { joinedAt: 'desc' },
      });
      void reply.send({ data: members });
    },
  });

  // Get team performance stats
  fastify.get('/mine/stats', {
    preHandler: [authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const team = await prisma.team.findUnique({
        where: { leaderId: request.user.id },
        include: { members: { include: { user: { select: { status: true, totalInvestment: true } } } } },
      });
      if (!team) throw new NotFoundError('Team');

      const activeMembers = team.members.filter((m) => m.user.status === 'ACTIVE').length;
      const totalInvestment = team.members.reduce((sum, m) => sum + m.user.totalInvestment, 0);

      void reply.send({
        data: {
          teamId: team.id,
          referralCode: team.referralCode,
          totalMembers: team.memberCount,
          activeMembers,
          inactiveMembers: team.memberCount - activeMembers,
          teamValue: team.teamValue,
          totalInvestment,
        },
      });
    },
  });
}
