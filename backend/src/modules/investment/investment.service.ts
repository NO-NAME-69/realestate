// src/modules/investment/investment.service.ts
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { writeAuditLog } from '../../lib/audit.js';
import { AppError, NotFoundError, InsufficientBalanceError } from '../../lib/errors.js';
import { recomputeActivation } from '../auth/auth.service.js';
import type { CreateInvestmentInput } from '../../schemas/investment.schema.js';

export async function createInvestment(
  userId: string,
  input: CreateInvestmentInput,
  idempotencyKey: string,
) {
  return prisma.$transaction(async (tx) => {
    // 1. Verify user is ACTIVE
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status !== 'ACTIVE') {
      throw new AppError('USER_NOT_ACTIVE', 422, 'Account must be active to invest');
    }

    // 2. Verify project is investable
    const project = await tx.project.findUniqueOrThrow({ where: { id: input.project_id } });
    if (!['READY_FOR_SALE', 'UNDER_DEVELOPMENT', 'APPROVED'].includes(project.status)) {
      throw new AppError('PROJECT_NOT_INVESTABLE', 422, 'Project not accepting investments');
    }

    // 3. Verify amount meets minimum
    if (input.amount_paise < env.MIN_INVESTMENT_PAISE) {
      throw new AppError('BELOW_MINIMUM', 422, 'Investment below minimum amount');
    }

    // 4. If plot specified, verify availability
    if (input.plot_id) {
      const plot = await tx.plot.findUniqueOrThrow({ where: { id: input.plot_id } });
      if (plot.status === 'SOLD') {
        throw new AppError('PLOT_NOT_AVAILABLE', 422, 'Plot is already sold');
      }
    }

    // 5. ATOMIC wallet deduction with row-level lock
    const wallets = await tx.$queryRaw<Array<{ id: string; balance: number }>>`
      SELECT id, balance FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE
    `;
    const wallet = wallets[0];
    if (!wallet) throw new NotFoundError('Wallet');
    if (wallet.balance < input.amount_paise) throw new InsufficientBalanceError();

    const newBalance = wallet.balance - input.amount_paise;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'INVESTMENT_DEBIT',
        amount: input.amount_paise,
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        status: 'COMPLETED',
        idempotencyKey,
        description: `Investment in project ${project.name}`,
      },
    });

    const investment = await tx.investment.create({
      data: {
        userId,
        projectId: input.project_id,
        plotId: input.plot_id,
        amount: input.amount_paise,
        isReinvestment: input.is_reinvestment,
        sourceProfitId: input.source_profit_id,
      },
    });

    // Update cached total_investment
    await tx.user.update({
      where: { id: userId },
      data: { totalInvestment: { increment: input.amount_paise } },
    });

    // Update team value if user is in a team
    const membership = await tx.teamMember.findFirst({ where: { userId } });
    if (membership) {
      await tx.team.update({
        where: { id: membership.teamId },
        data: { teamValue: { increment: input.amount_paise } },
      });
    }

    // Recompute activation (might cross ₹50k threshold)
    await recomputeActivation(tx, userId);

    void writeAuditLog({
      type: 'INVESTMENT_CREATED',
      actorId: userId,
      actorRole: user.role,
      targetType: 'investment',
      targetId: investment.id,
      ipAddress: null,
      userAgentHash: null,
      payload: { amount: input.amount_paise, projectId: input.project_id },
      result: 'SUCCESS',
    });

    return investment;
  });
}

export async function getUserInvestments(userId: string, cursor?: string, limit = 20) {
  const investments = await prisma.investment.findMany({
    where: { userId, deletedAt: null },
    include: { project: { select: { name: true, type: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = investments.length > limit;
  const data = hasMore ? investments.slice(0, limit) : investments;

  return { investments: data, meta: { hasMore, cursor: data[data.length - 1]?.id } };
}

export async function getPortfolio(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const investments = await prisma.investment.findMany({
    where: { userId, deletedAt: null },
    include: { project: { select: { name: true, type: true, status: true } } },
  });

  const profits = await prisma.profitDistribution.findMany({
    where: { userId, status: 'COMPLETED' },
  });

  const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);
  const totalProfit = profits.reduce((sum, p) => sum + p.userProfit, 0);

  return {
    totalInvested,
    totalProfit,
    activeInvestments: investments.length,
    roi: totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(2) : '0.00',
    investments,
  };
}
