// src/jobs/plotHoldExpiry.job.ts
// BullMQ worker: releases expired plot holds

import { Worker, Queue, type Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { writeAuditLog } from '../lib/audit.js';

interface PlotHoldExpiryData {
  batchSize?: number;
}

// Schedule this queue with a repeatable job
export const plotHoldExpiryQueue = new Queue('plot-hold-expiry', { connection: redis });

async function processExpiredHolds(job: Job<PlotHoldExpiryData>): Promise<void> {
  const batchSize = job.data.batchSize ?? 50;

  const expiredHolds = await prisma.plotHold.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: new Date() },
    },
    take: batchSize,
    include: { plot: { select: { id: true } } },
  });

  if (expiredHolds.length === 0) return;

  for (const hold of expiredHolds) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.plotHold.update({
          where: { id: hold.id },
          data: { status: 'RELEASED_EXPIRED', releasedAt: new Date() },
        });
        await tx.plot.update({
          where: { id: hold.plotId },
          data: { status: 'AVAILABLE' },
        });
      });

      void writeAuditLog({
        type: 'PLOT_HOLD_RELEASED',
        actorId: null, actorRole: 'SYSTEM', targetType: 'plot', targetId: hold.plotId,
        ipAddress: null, userAgentHash: null,
        payload: { holdId: hold.id, userId: hold.userId, reason: 'expired' },
        result: 'SUCCESS',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to release hold ${hold.id}:`, err);
      // Individual hold failure doesn't stop batch
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Released ${String(expiredHolds.length)} expired plot holds`);
}

// Start worker
export function startPlotHoldExpiryWorker(): Worker {
  const worker = new Worker<PlotHoldExpiryData>(
    'plot-hold-expiry',
    processExpiredHolds,
    {
      connection: redis,
      concurrency: 1,
    },
  );

  // Schedule repeatable: run every 15 minutes
  void plotHoldExpiryQueue.add(
    'check-expired',
    { batchSize: 50 },
    {
      repeat: { pattern: '*/15 * * * *' }, // Every 15 minutes
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  return worker;
}
