// prisma.config.ts — Prisma 7.x configuration file
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Load .env manually for Prisma CLI
import { config } from 'dotenv';
config({ path: path.resolve(import.meta.dirname ?? '.', '.env') });

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname ?? '.', 'prisma', 'schema.prisma'),
  migrate: {
    schema: path.join(import.meta.dirname ?? '.', 'prisma', 'schema.prisma'),
  },
  datasource: {
    url: process.env['DATABASE_URL'] ?? '',
  },
});
