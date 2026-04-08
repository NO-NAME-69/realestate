# 2. TypeScript Project Structure

## 2.1 Strict Configuration

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": false,
    "skipLibCheck": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Rules:** Zero `any` — use `unknown` + type guards. No assertions (`as Type`) without runtime Zod validation. Zod schemas are single source of truth — derive TS types via `z.infer<>`.

---

## 2.2 Project Tree

```
src/
├── app.ts                          # Fastify instance + plugin registration
├── server.ts                       # Entry point: listen, graceful shutdown
├── config/
│   ├── env.ts                      # Zod-validated env vars (fail-fast)
│   ├── database.ts                 # Prisma client singleton + middleware
│   └── redis.ts                    # ioredis singleton
├── types/
│   ├── index.ts                    # Shared domain types, branded types
│   ├── fastify.d.ts                # request.user augmentation
│   └── enums.ts                    # UserRole, UserStatus, PlotStatus, etc.
├── schemas/
│   ├── auth.schema.ts              # Login, register, OTP, refresh
│   ├── wallet.schema.ts            # Top-up, withdrawal
│   ├── investment.schema.ts        # Create investment
│   ├── plot.schema.ts              # Hold, release, filters
│   ├── project.schema.ts           # CRUD, status transitions
│   └── shared.schema.ts            # UUID, Money, Pagination, DateRange
├── middleware/
│   ├── authenticate.ts             # JWT verify → request.user
│   ├── authorize.ts                # RBAC + resource ownership
│   ├── rateLimiter.ts              # Per-endpoint via Redis
│   ├── idempotency.ts              # Idempotency-Key enforcement
│   ├── validate.ts                 # Zod schema validation hook
│   ├── auditLogger.ts              # Automatic audit on sensitive routes
│   └── securityHeaders.ts          # OWASP headers
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts          # Route definitions
│   │   ├── auth.controller.ts      # Request/response handling
│   │   ├── auth.service.ts         # Business logic
│   │   └── auth.types.ts           # Module-local types
│   ├── user/                       # Profile, KYC, status
│   ├── wallet/                     # Top-up, balance, transactions
│   ├── team/                       # Create, invite, activate
│   ├── investment/                 # Invest, portfolio, eligibility
│   ├── project/                    # Admin CRUD, status lifecycle
│   ├── plot/                       # Inventory, hold, release
│   ├── sales/                      # Admin sale initiation
│   ├── profit/                     # Calculation, distribution
│   ├── admin/                      # Config, user mgmt, dashboard
│   └── notifications/              # Email (SendGrid), SMS (MSG91)
├── jobs/
│   ├── profitDistribution.job.ts   # BullMQ worker: atomic batch credit
│   ├── plotHoldExpiry.job.ts        # Daily: release expired holds
│   └── notifications.job.ts        # Async email/SMS dispatch
├── lib/
│   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt
│   ├── jwt.ts                      # RS256/HS256 sign/verify (typed)
│   ├── money.ts                    # Paise branded type, arithmetic
│   ├── razorpay.ts                 # SDK wrapper + webhook verify
│   ├── redis.ts                    # Lock, rate-limit, idempotency helpers
│   └── errors.ts                   # AppError hierarchy
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## 2.3 Money Handling (Branded Type)

```typescript
// lib/money.ts — ALL amounts in paise (1₹ = 100 paise), NEVER floats
declare const __brand: unique symbol
type Brand<T, B> = T & { [__brand]: B }
export type Paise = Brand<number, 'Paise'>

export function toPaise(rupees: number): Paise {
  return Math.round(rupees * 100) as Paise
}
export function toRupees(paise: Paise): number {
  return paise / 100
}
export function addPaise(a: Paise, b: Paise): Paise {
  return (a + b) as Paise
}
export function subtractPaise(a: Paise, b: Paise): Paise {
  if (a < b) throw new AppError('NEGATIVE_MONEY', 422)
  return (a - b) as Paise
}

// Profit distribution: integer division + remainder tracking
export function distributePaise(total: Paise, shares: number[]): { amounts: Paise[]; remainder: Paise } {
  const sumShares = shares.reduce((a, b) => a + b, 0)
  const amounts = shares.map(s => Math.floor((total * s) / sumShares) as Paise)
  const distributed = amounts.reduce((a, b) => (a + b) as Paise, 0 as Paise)
  return { amounts, remainder: (total - distributed) as Paise }
}
```

---

## 2.4 Environment Validation

```typescript
// config/env.ts — fail-fast on startup
const EnvSchema = z.object({
  NODE_ENV:                    z.enum(['development', 'staging', 'production']),
  PORT:                        z.coerce.number().int().min(1024).max(65535),
  DATABASE_URL:                z.string().url(),
  REDIS_URL:                   z.string().url(),
  JWT_SECRET:                  z.string().min(64),
  JWT_REFRESH_SECRET:          z.string().min(64),
  JWT_PUBLIC_KEY:              z.string().min(1),          // RS256 public key (PEM)
  JWT_PRIVATE_KEY:             z.string().min(1),          // RS256 private key (PEM)
  ENCRYPTION_KEY:              z.string().length(64),      // 32 bytes hex
  RAZORPAY_KEY_ID:             z.string().min(1),
  RAZORPAY_KEY_SECRET:         z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET:     z.string().min(1),
  SENDGRID_API_KEY:            z.string().startsWith('SG.'),
  MSG91_AUTH_KEY:              z.string().min(1),
  AWS_S3_BUCKET:               z.string().min(1),
  FRONTEND_URL:                z.string().url(),
  COMPANY_PROFIT_PCT:          z.coerce.number().min(0).max(100),
  MIN_INVESTMENT_PAISE:        z.coerce.number().int().min(10000),
  ACTIVATION_THRESHOLD_PAISE:  z.coerce.number().int().default(5000000),
  MIN_TEAM_SIZE:               z.coerce.number().int().default(20),
  REGISTRATION_FEE_PAISE:      z.coerce.number().int().default(50000),
})

export const env = EnvSchema.parse(process.env)
export type Env = z.infer<typeof EnvSchema>
// NEVER use process.env.X directly — always import { env } from '@/config/env'
```

---

## 2.5 Error Handling

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
    public readonly fields?: Record<string, string>
  ) {
    super(message ?? code)
    this.name = 'AppError'
  }
}

// Fastify error handler — NEVER leaks stack traces
fastify.setErrorHandler((error, request, reply) => {
  const isAppError = error instanceof AppError
  request.log.error({ err: error, requestId: request.id })

  if (error.statusCode === 401 || error.statusCode === 403) {
    writeAuditLog({ type: 'UNAUTHORIZED_ACCESS_ATTEMPT', actorId: request.user?.id })
  }

  reply.code(isAppError ? error.statusCode : 500).send({
    error: isAppError ? error.message : 'Internal server error',
    requestId: request.id,
    ...(isAppError && error.fields ? { fields: error.fields } : {}),
  })
})
```
