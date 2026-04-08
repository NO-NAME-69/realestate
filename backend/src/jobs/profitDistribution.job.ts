// src/jobs/profitDistribution.job.ts
// BullMQ worker: distributes profit from a sale to all investors pro-rata

import { Worker, type Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { writeAuditLog } from '../lib/audit.js';
import type { Paise } from '../lib/money.js';

interface ProfitDistributionData {
  saleId: string;
}

async function processProfitDistribution(job: Job<ProfitDistributionData>): Promise<void> {
  const { saleId } = job.data;

  await prisma.$transaction(async (tx) => {
    // 1. Lock sale row
    const sales = await tx.$queryRaw<Array<{
      id: string; project_id: string; base_price: number;
      final_price: number; is_distributed: boolean;
    }>>`
      SELECT * FROM sales WHERE id = ${saleId}::uuid FOR UPDATE
    `;
    const sale = sales[0];
    if (!sale) throw new Error(`Sale ${saleId} not found`);
    if (sale.is_distributed) throw new Error(`Sale ${saleId} already distributed`);

    // 2. Get all investments for this project
    const investments = await tx.investment.findMany({
      where: { projectId: sale.project_id, deletedAt: null },
    });

    if (investments.length === 0) {
      await tx.sale.update({ where: { id: saleId }, data: { isDistributed: true } });
      return;
    }

    // 3. Calculate profit (integer paise)
    const grossProfit = sale.final_price - sale.base_price;
    const companyPct = env.COMPANY_PROFIT_PCT;
    const companyShare = Math.floor((grossProfit * companyPct) / 100);
    const investorPool = grossProfit - companyShare;

    // 4. Loss scenario check
    if (grossProfit <= 0) {
      // Company absorbs — record zero distributions
      for (const inv of investments) {
        await tx.profitDistribution.create({
          data: {
            saleId, userId: inv.userId,
            investmentAmount: inv.amount,
            totalInvested: investments.reduce((s, i) => s + i.amount, 0),
            grossProfit, companyShare: 0, investorPool: 0, userProfit: 0,
            status: 'COMPLETED',
          },
        });
      }
      await tx.sale.update({ where: { id: saleId }, data: { isDistributed: true } });
      return;
    }

    // 5. Distribute proportionally (integer division)
    const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);
    let distributed = 0;

    for (const inv of investments) {
      const userProfit = Math.floor((investorPool * inv.amount) / totalInvested);
      distributed += userProfit;

      await tx.profitDistribution.create({
        data: {
          saleId, userId: inv.userId,
          investmentAmount: inv.amount, totalInvested,
          grossProfit, companyShare, investorPool, userProfit,
          status: 'COMPLETED',
        },
      });

      // Credit wallet atomically
      await tx.$executeRaw`
        UPDATE wallets SET balance = balance + ${userProfit},
        updated_at = NOW() WHERE user_id = ${inv.userId}::uuid
      `;

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: inv.userId } });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'PROFIT_CREDIT',
          amount: userProfit,
          balanceBefore: wallet.balance - userProfit,
          balanceAfter: wallet.balance,
          status: 'COMPLETED',
          description: `Profit from sale ${saleId}`,
        },
      });
    }

    // 6. Remainder → company (documented policy)
    const remainder = investorPool - distributed;
    // Logged for reconciliation
    await tx.sale.update({ where: { id: saleId }, data: { isDistributed: true } });

    void writeAuditLog({
      type: 'PROFIT_DISTRIBUTED',
      actorId: null, actorRole: 'SYSTEM', targetType: 'sale', targetId: saleId,
      ipAddress: null, userAgentHash: null,
      payload: {
        investors: investments.length, grossProfit, companyShare,
        investorPool, distributed, remainder,
      },
      result: 'SUCCESS',
    });
  });
}

// Start worker
export function startProfitDistributionWorker(): Worker {
  const worker = new Worker<ProfitDistributionData>(
    'profit-distribution',
    processProfitDistribution,
    {
      connection: redis,
      concurrency: 1, // Sequential to avoid race conditions
      limiter: { max: 5, duration: 60000 },
    },
  );

  worker.on('completed', (job) => {
    // eslint-disable-next-line no-console
    console.log(`✅ Profit distribution completed: ${job.id ?? 'unknown'}`);
  });

  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`❌ Profit distribution failed: ${job?.id ?? 'unknown'}`, err);
  });

  return worker;
}
