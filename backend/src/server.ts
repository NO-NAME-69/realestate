// src/server.ts
// Entry point — listen, graceful shutdown

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './config/database.js';
import { disconnectRedis } from './config/redis.js';

async function main(): Promise<void> {
  const app = await buildApp();

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await app.close();
        await disconnectPrisma();
        await disconnectRedis();
        app.log.info('Server shut down successfully');
        process.exit(0);
      } catch (err) {
        app.log.error(err, 'Error during shutdown');
        process.exit(1);
      }
    });
  }

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason) => {
    app.log.error(reason, 'Unhandled rejection');
    process.exit(1);
  });

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 Server running on port ${String(env.PORT)} [${env.NODE_ENV}]`);
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

void main();
