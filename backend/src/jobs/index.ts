// src/jobs/index.ts
// Start all BullMQ workers

import { startProfitDistributionWorker } from './profitDistribution.job.js';
import { startPlotHoldExpiryWorker } from './plotHoldExpiry.job.js';

export function startAllWorkers(): void {
  startProfitDistributionWorker();
  startPlotHoldExpiryWorker();

  // eslint-disable-next-line no-console
  console.log('🔧 All BullMQ workers started');
}
