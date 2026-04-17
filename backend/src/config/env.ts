// src/config/env.ts
// Zod-validated environment variables — fail-fast on startup
// NEVER use process.env.X directly — always import { env } from this module

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3000),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),

  // JWT — HS256 for simplicity, RS256 keys optional for production
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  // External services — optional in dev
  SENDGRID_API_KEY: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Frontend
  FRONTEND_URL: z.string().min(1),
  ALLOWED_ORIGINS: z.string().optional(),

  // Business config
  COMPANY_PROFIT_PCT: z.coerce.number().min(0).max(100).default(30),
  MIN_INVESTMENT_PAISE: z.coerce.number().int().min(10000).default(50000),
  ACTIVATION_THRESHOLD_PAISE: z.coerce.number().int().default(5000000),
  MIN_TEAM_SIZE: z.coerce.number().int().default(20),
  REGISTRATION_FEE_PAISE: z.coerce.number().int().default(50000),
  REFERRAL_BONUS_PAISE: z.coerce.number().int().default(5000),
});

function validateEnv(): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`❌ Environment validation failed:\n${formatted}`);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof EnvSchema>;
