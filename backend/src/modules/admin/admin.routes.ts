// src/modules/admin/admin.routes.ts
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { idempotencyMiddleware } from '../../middleware/idempotency.js';
import { UserRole } from '../../types/enums.js';
import { prisma } from '../../config/database.js';
import { NotFoundError } from '../../lib/errors.js';
import { writeAuditLog } from '../../lib/audit.js';
import { Queue } from 'bullmq';
import { redis } from '../../config/redis.js';

const profitQueue = new Queue('profit-distribution', { connection: redis });

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  const adminAuth = [authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN)];
  const financeAuth = [authenticate, authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)];

  // User management
  fastify.get('/users', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { cursor?: string; limit?: string; status?: string };
      const limit = Math.min(parseInt(query.limit ?? '20', 10), 50);
      const where: Record<string, unknown> = { deletedAt: null };
      if (query.status) where['status'] = query.status;

      const users = await prisma.user.findMany({
        where,
        select: { id: true, email: true, mobile: true, fullName: true, status: true, role: true, totalInvestment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const hasMore = users.length > limit;
      const data = hasMore ? users.slice(0, limit) : users;
      void reply.send({ data, meta: { hasMore, cursor: data[data.length - 1]?.id } });
    },
  });

  fastify.get('/users/:id', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: (request.params as { id: string }).id },
        include: { wallet: { select: { balance: true } }, _count: { select: { investments: true, plotHolds: true } } },
      });
      if (!user) throw new NotFoundError('User');
      void reply.send({ data: user });
    },
  });

  // Change user status
  fastify.put('/users/:id/status', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply: FastifyReply) => {
      const user = await prisma.user.update({
        where: { id: (request.params as { id: string }).id },
        data: { status: (request.body as { status: string }).status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED' },
        select: { id: true, status: true },
      });
      void writeAuditLog({
        type: 'USER_ROLE_CHANGED', actorId: request.user.id, actorRole: request.user.role,
        targetType: 'user', targetId: user.id, ipAddress: request.ip, userAgentHash: null,
        payload: { newStatus: user.status }, result: 'SUCCESS',
      });
      void reply.send({ data: user });
    },
  });

  // Role assignment (SUPER_ADMIN only)
  fastify.put('/users/:id/role', {
    preHandler: [authenticate, authorize(UserRole.SUPER_ADMIN)],
    handler: async (request: FastifyRequest<{ Params: { id: string }; Body: { role: string } }>, reply: FastifyReply) => {
      const user = await prisma.user.update({
        where: { id: (request.params as { id: string }).id },
        data: { role: (request.body as { role: string }).role as UserRole },
        select: { id: true, role: true },
      });
      void writeAuditLog({
        type: 'USER_ROLE_CHANGED', actorId: request.user.id, actorRole: request.user.role,
        targetType: 'user', targetId: user.id, ipAddress: request.ip, userAgentHash: null,
        payload: { newRole: user.role }, result: 'SUCCESS',
      });
      void reply.send({ data: user });
    },
  });

  // Initiate sale
  fastify.post('/sales', {
    preHandler: [...adminAuth, idempotencyMiddleware],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      const sale = await prisma.$transaction(async (tx) => {
        const plot = await tx.plot.findUniqueOrThrow({ where: { id: body['plot_id'] as string } });
        if (plot.status === 'SOLD') throw new NotFoundError('Plot is already sold');

        await tx.plot.update({ where: { id: plot.id }, data: { status: 'SOLD' } });

        return tx.sale.create({
          data: {
            plotId: body['plot_id'] as string,
            projectId: plot.projectId,
            buyerName: body['buyer_name'] as string,
            buyerMobile: body['buyer_mobile'] as string,
            buyerEmail: (body['buyer_email'] as string) ?? null,
            buyerPan: (body['buyer_pan'] as string) ?? null,
            buyerAadhaar: (body['buyer_aadhaar'] as string) ?? null,
            basePrice: body['base_price_paise'] as number,
            negotiatedPrice: body['negotiated_price_paise'] as number,
            finalPrice: body['final_price_paise'] as number,
            initiatedBy: request.user.id,
          },
        });
      });
      void writeAuditLog({
        type: 'SALE_INITIATED', actorId: request.user.id, actorRole: request.user.role,
        targetType: 'sale', targetId: sale.id, ipAddress: request.ip, userAgentHash: null,
        payload: { plotId: sale.plotId, finalPrice: sale.finalPrice }, result: 'SUCCESS',
      });
      void reply.code(201).send({ data: sale });
    },
  });

  // Trigger profit distribution
  fastify.post('/profit/distribute/:saleId', {
    preHandler: [...financeAuth, idempotencyMiddleware],
    handler: async (request: FastifyRequest<{ Params: { saleId: string } }>, reply: FastifyReply) => {
      const saleId = (request.params as { saleId: string }).saleId;
      const sale = await prisma.sale.findUniqueOrThrow({ where: { id: saleId } });
      if (sale.isDistributed) throw new NotFoundError('Sale already distributed');

      // Add to BullMQ queue — NOT inline processing
      await profitQueue.add('distribute', { saleId }, {
        jobId: `profit_${saleId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      void reply.send({ data: { message: 'Profit distribution queued', saleId } });
    },
  });

  // Get recent sales and stats
  fastify.get('/sales', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { cursor?: string; limit?: string };
      const limit = Math.min(parseInt(query.limit ?? '20', 10), 50);

      const [totalRevenue, totalPlotsSold, avgSaleValue, recentSales] = await Promise.all([
        prisma.sale.aggregate({ _sum: { finalPrice: true } }),
        prisma.sale.count(),
        prisma.sale.aggregate({ _avg: { finalPrice: true } }),
        prisma.sale.findMany({
          include: { plot: { select: { plotNumber: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit + 1,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        })
      ]);

      const hasMore = recentSales.length > limit;
      const data = hasMore ? recentSales.slice(0, limit) : recentSales;
      
      void reply.send({ 
        stats: {
          totalRevenueCollected: totalRevenue._sum.finalPrice ?? 0,
          totalPlotsSold,
          avgSaleValue: avgSaleValue._avg.finalPrice ?? 0
        },
        data: data.map(s => ({
          ...s,
          plotNumber: s.plot.plotNumber
        })), 
        meta: { hasMore, cursor: data[data.length - 1]?.id } 
      });
    },
  });

  // System config (SUPER_ADMIN)
  fastify.get('/config', {
    preHandler: adminAuth,
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const configs = await prisma.systemConfig.findMany();
      void reply.send({ data: configs });
    },
  });

  fastify.put('/config/:key', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest<{ Params: { key: string }; Body: { value: string } }>, reply: FastifyReply) => {
      const config = await prisma.systemConfig.upsert({
        where: { key: (request.params as { key: string }).key },
        update: { value: (request.body as { value: string }).value, updatedBy: request.user.id },
        create: { key: (request.params as { key: string }).key, value: (request.body as { value: string }).value, updatedBy: request.user.id },
      });
      void writeAuditLog({
        type: 'SYSTEM_CONFIG_CHANGED', actorId: request.user.id, actorRole: request.user.role,
        targetType: 'config', targetId: config.id, ipAddress: request.ip, userAgentHash: null,
        payload: { key: config.key }, result: 'SUCCESS',
      });
      void reply.send({ data: config });
    },
  });

  // Dashboard stats
  fastify.get('/dashboard', {
    preHandler: adminAuth,
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const [
        userCount, activeUsers, totalInvestment, totalSales, activeProjects,
        recentUsers, recentSales, recentLogs
      ] = await Promise.all([
        prisma.user.count({ where: { deletedAt: null } }),
        prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
        prisma.investment.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
        prisma.sale.aggregate({ _sum: { finalPrice: true }, _count: true }),
        prisma.project.count({ where: { status: { in: ['READY_FOR_SALE', 'UNDER_DEVELOPMENT'] }, deletedAt: null } }),
        prisma.user.findMany({
          where: { createdAt: { gte: sixMonthsAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.sale.findMany({
          where: { createdAt: { gte: sixMonthsAgo } },
          select: { createdAt: true, finalPrice: true },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.auditLog.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: { id: true, eventType: true, targetType: true, createdAt: true, payload: true }
        })
      ]);

      // Group time-series data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
      const userGrowthMap: Record<string, number> = {};
      const propValueMap: Record<string, number> = {};
      
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const key = monthNames[d.getMonth()] as string;
        userGrowthMap[key] = 0;
        propValueMap[key] = 0;
      }

      let cumulativeUsers = userCount - recentUsers.length; // Base number before 6 months
      recentUsers.forEach(u => {
        const key = monthNames[u.createdAt.getMonth()] as string;
        if (userGrowthMap[key] !== undefined) {
          userGrowthMap[key] = userGrowthMap[key]! + 1;
        }
      });
      
      const userGrowthData = Object.keys(userGrowthMap).map(key => {
        cumulativeUsers += userGrowthMap[key]!;
        return { name: key, users: cumulativeUsers };
      });

      recentSales.forEach(s => {
        const key = monthNames[s.createdAt.getMonth()] as string;
        if (propValueMap[key] !== undefined) {
          propValueMap[key] = propValueMap[key]! + s.finalPrice;
        }
      });

      const propertyValueData = Object.keys(propValueMap).map(key => ({
        name: key,
        value: Number((propValueMap[key]! / 10000000).toFixed(2)) // Convert paise to Cr approximation
      }));

      // Map AuditLog to UI activity
      const recentActivity = recentLogs.map(log => {
        const isSale = log.targetType === 'sale';
        const isUser = log.targetType === 'user';
        const isConfig = log.targetType === 'config';
        
        let icon = '⚙️'; let color = '#64748b'; let bg = 'rgba(100, 116, 139, 0.1)'; let text = log.eventType;
        if (isSale) { icon = '💰'; color = '#10b981'; bg = 'rgba(16, 185, 129, 0.1)'; text = `Sale updated (${log.eventType})`; }
        if (isUser) { icon = '👤'; color = '#3b82f6'; bg = 'rgba(59, 130, 246, 0.1)'; text = `User acted (${log.eventType})`; }

        return {
          id: log.id, text, time: log.createdAt.toISOString(), icon, color, bg
        };
      });

      void reply.send({
        data: {
          stats: {
            totalUsers: { value: userCount, trend: "+0% from last month" },
            totalPropertyValue: { value: `₹${((totalInvestment._sum.amount ?? 0) / 10000000).toFixed(2)}Cr`, trend: "+0% from last month" },
            totalRevenue: { value: `₹${((totalSales._sum.finalPrice ?? 0) / 10000000).toFixed(2)}Cr`, trend: "+0% from last month" },
            activeProjects: { value: activeProjects, trend: "+0 new this month" }
          },
          propertyValueData,
          userGrowthData,
          revenueVsCostData: [
            { name: 'Q1', revenue: 0.8, cost: 0.3 }, // Mock data since costs aren't tracked yet
            { name: 'Q2', revenue: 1.2, cost: 0.5 },
            { name: 'Q3', revenue: 2.1, cost: 0.9 },
            { name: 'Q4', revenue: 3.2, cost: 1.2 },
          ],
          recentActivity
        },
      });
    },
  });

  // Audit logs
  fastify.get('/audit-logs', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { cursor?: string; limit?: string; event_type?: string };
      const limit = Math.min(parseInt(query.limit ?? '20', 10), 50);
      const where: Record<string, unknown> = {};
      if (query.event_type) where['eventType'] = query.event_type;

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const hasMore = logs.length > limit;
      const data = hasMore ? logs.slice(0, limit) : logs;
      void reply.send({ data, meta: { hasMore, cursor: data[data.length - 1]?.id } });
    },
  });

  // Global transactions (for wallet page)
  fastify.get('/transactions', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { limit?: string; type?: string; status?: string };
      const limit = Math.min(parseInt(query.limit ?? '50', 10), 100);
      const where: Record<string, unknown> = {};
      if (query.type && query.type !== 'ALL') where['type'] = query.type;
      if (query.status && query.status !== 'ALL') where['status'] = query.status;

      const [transactions, totals] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: { wallet: { include: { user: { select: { fullName: true, email: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        Promise.all([
          prisma.transaction.aggregate({ where: { type: 'WALLET_TOPUP', status: 'COMPLETED' }, _sum: { amount: true } }),
          prisma.transaction.aggregate({ where: { type: 'WITHDRAWAL', status: 'COMPLETED' }, _sum: { amount: true } }),
          prisma.transaction.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
        ])
      ]);

      const data = transactions.map(t => ({
        id: t.id.substring(0, 12),
        userId: t.wallet.user?.email ? t.wallet.userId : 'unknown',
        user: { fullName: t.wallet.user?.fullName ?? 'Unknown', email: t.wallet.user?.email ?? '' },
        amount: t.amount,
        type: t.type,
        status: t.status,
        referenceId: t.referenceId,
        createdAt: t.createdAt,
      }));

      const stats = [
        { label: 'Total Deposits', value: totals[0]._sum.amount ?? 0, icon: '💰', color: '#16a34a' },
        { label: 'Total Withdrawals', value: totals[1]._sum.amount ?? 0, icon: '💸', color: '#dc2626' },
        { label: 'Pending txns', value: totals[2]._sum.amount ?? 0, icon: '⏳', color: '#d97706' },
      ];

      void reply.send({ data, stats });
    },
  });

  // All plots (for plots management page)
  fastify.get('/plots', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as { limit?: string; status?: string };
      const limit = Math.min(parseInt(query.limit ?? '100', 10), 200);
      const where: Record<string, unknown> = {};
      if (query.status && query.status !== 'ALL') where['status'] = query.status;

      const [plots, projects] = await Promise.all([
        prisma.plot.findMany({
          where,
          include: { project: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      ]);

      const data = plots.map(p => ({
        id: p.id,
        projectId: p.projectId,
        project: { name: p.project.name },
        plotNumber: p.plotNumber,
        sizeSqft: p.sizeSqft,
        price: p.price,
        status: p.status,
        type: p.type,
      }));

      void reply.send({ data, projects });
    },
  });

  // Ownership ledger (sales with ownership info)
  fastify.get('/ledger', {
    preHandler: adminAuth,
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const sales = await prisma.sale.findMany({
        include: {
          plot: { select: { plotNumber: true, sizeSqft: true } },
          project: { select: { name: true, totalAreaSqft: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const data = sales.map(s => ({
        id: s.id,
        userId: s.initiatedBy,
        user: { fullName: s.buyerName, email: s.buyerEmail ?? '' },
        projectId: s.projectId,
        project: { name: s.project.name, totalAreaSqft: s.project.totalAreaSqft },
        plots: [`#${s.plot.plotNumber}`],
        totalSqft: s.plot.sizeSqft,
        purchaseValue: s.finalPrice,
        ownershipPercentage: s.project.totalAreaSqft > 0 ? Number(((s.plot.sizeSqft / s.project.totalAreaSqft) * 100).toFixed(2)) : 0,
        registeredAt: s.createdAt,
      }));

      const stats = {
        totalOwners: new Set(sales.map(s => s.buyerName)).size,
        totalPlots: sales.length,
        totalValue: sales.reduce((sum, s) => sum + s.finalPrice, 0),
      };

      void reply.send({ data, stats });
    },
  });
}
