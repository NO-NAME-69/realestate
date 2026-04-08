// src/config/database.ts
// Prisma 7.x client singleton with PrismaPg driver adapter

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { env } from './env.js';

function createPrismaClient(): PrismaClient {
  // Prisma 7.x requires a driver adapter
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
  });

  return prisma;
}

// Singleton
let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient();
  }
  return prismaInstance;
}

export const prisma = getPrisma();

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
