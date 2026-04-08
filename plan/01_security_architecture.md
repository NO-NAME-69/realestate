# 1. Security Architecture — RP Module

> [!CAUTION]
> This is a **financial platform** handling real money (INR), PAN, Aadhaar, and bank details. Security is a cross-cutting concern embedded in every layer — not a bolt-on module.

---

## 1.1 Authentication & Session Management

### JWT Strategy (RS256 + HS256)

```typescript
// types/auth.ts
interface AccessTokenPayload {
  sub: string        // userId (UUID)
  role: UserRole
  sessionId: string  // UUID — ties token to DB session
  iat: number
  exp: number
}

// Access Token: RS256, 15min expiry, asymmetric keys
// Refresh Token: HS256, 7 days, separate secret (min 64 chars)
// Refresh stored as bcrypt hash in user_sessions — NEVER plaintext
```

**Critical rules:**
- Access token in `Authorization: Bearer` header — NEVER localStorage
- Refresh token in `HttpOnly + Secure + SameSite=Strict` cookie
- JWT payload: `{ sub, role, sessionId }` only — **zero PII**
- Refresh rotation: new token on every use, old immediately revoked

### Refresh Token Family Tracking

```typescript
// auth.service.ts — reuse detection
async function refreshAccessToken(refreshToken: string, sessionId: string) {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } })
  if (!session || session.is_revoked) {
    // Token reuse detected → compromise assumed
    await prisma.userSession.updateMany({
      where: { token_family: session?.token_family },
      data: { is_revoked: true }
    })
    writeAuditLog({ type: 'SESSION_REVOKED', reason: 'refresh_token_reuse' })
    throw new AppError('SESSION_COMPROMISED', 401)
  }
  
  const valid = await bcrypt.compare(
    Buffer.from(refreshToken, 'utf8').subarray(0, 72).toString(),
    session.token_hash
  )
  if (!valid) throw new AppError('INVALID_TOKEN', 401)

  // Rotate: revoke old, issue new in same family
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { is_revoked: true }
  })
  
  const newRefresh = crypto.randomBytes(64).toString('hex')
  const newSession = await prisma.userSession.create({
    data: {
      user_id: session.user_id,
      token_family: session.token_family,
      token_hash: await bcrypt.hash(
        Buffer.from(newRefresh, 'utf8').subarray(0, 72).toString(), 12
      ),
      ip_address: request.ip,
      user_agent_hash: sha256(request.headers['user-agent'] ?? ''),
      expires_at: addDays(new Date(), 7),
    }
  })
  
  return { accessToken: signAccess(session.user_id), refreshToken: newRefresh, sessionId: newSession.id }
}
```

**Max 3 active sessions per user** — 4th login rejected until one is revoked.

---

## 1.2 Password Security

```typescript
// lib/password.ts
const BCRYPT_ROUNDS = 12
const MAX_BCRYPT_INPUT = 72 // bytes — bcrypt silently ignores beyond this

const PasswordSchema = z.string()
  .min(8).max(128)
  .regex(/[A-Z]/, 'Requires uppercase')
  .regex(/[a-z]/, 'Requires lowercase')
  .regex(/[0-9]/, 'Requires digit')
  .regex(/[^A-Za-z0-9]/, 'Requires special character')

async function hashPassword(password: string): Promise<string> {
  const truncated = Buffer.from(password, 'utf8').subarray(0, MAX_BCRYPT_INPUT).toString()
  return bcrypt.hash(truncated, BCRYPT_ROUNDS)
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const truncated = Buffer.from(plain, 'utf8').subarray(0, MAX_BCRYPT_INPUT).toString()
  return bcrypt.compare(truncated, hash)
}
```

**Lockout policy** (Redis counter per `email:ip`):

| Attempts | Action |
|----------|--------|
| 1–3 | Track only |
| 4–5 | 30s delay before response |
| 6–9 | Lock 30 min, require OTP unlock |
| 10+ | Hard lock — admin manual unlock |

Additional: check HaveIBeenPwned (k-anonymity, first 5 SHA-1 chars), store last 5 password hashes to reject reuse.

---

## 1.3 Authorization (RBAC)

```typescript
// types/enums.ts
enum UserRole {
  SUPER_ADMIN     = 'SUPER_ADMIN',
  ADMIN           = 'ADMIN',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  TEAM_LEADER     = 'TEAM_LEADER',
  INVESTOR        = 'INVESTOR',
}

// middleware/authorize.ts — returns 404, NOT 403 (prevents enumeration)
function authorize(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(request.user.role)) {
      return reply.code(404).send({ error: 'Not found' })
    }
    await verifyResourceOwnership(request) // horizontal priv-esc check
  }
}
```

### Permission Matrix

| Resource | INVESTOR | TEAM_LEADER | FINANCE_MGR | ADMIN | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|
| Own profile R/W | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own wallet R | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own investment R | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own team R | — | ✓ | — | ✓ | ✓ |
| Any user data | — | — | — | ✓ | ✓ |
| Project CRUD | — | — | — | ✓ | ✓ |
| Sale initiate | — | — | — | ✓ | ✓ |
| Profit distribute | — | — | ✓ | ✓ | ✓ |
| System config | — | — | — | — | ✓ |
| Role assignment | — | — | — | — | ✓ |

---

## 1.4 Data Encryption (AES-256-GCM)

```typescript
// lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const encryptionKey = Buffer.from(env.ENCRYPTION_KEY, 'hex') // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !encHex) throw new Error('Invalid ciphertext format')
  const decipher = createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}
```

**Encrypted fields** (Prisma middleware intercepts create/update/read):
`pan_number`, `aadhaar_number`, `bank_account_number`, `bank_ifsc`, `upi_id`

Key rotation: decrypt all → re-encrypt with new key → swap. Separate keys per environment.

---

## 1.5 Financial Transaction Security

### Idempotency Middleware

```typescript
// middleware/idempotency.ts
async function idempotencyMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const key = request.headers['idempotency-key'] as string | undefined
  if (!key) return reply.code(400).send({ error: 'Idempotency-Key required' })

  const cacheKey = `idempotency:${request.user.id}:${key}`
  const existing = await redis.get(cacheKey)

  if (existing) {
    const cached = JSON.parse(existing)
    if (cached.payloadHash === hashPayload(request.body)) {
      return reply.code(cached.statusCode).send(cached.body) // safe replay
    }
    return reply.code(422).send({ error: 'Idempotency key reused with different payload' })
  }

  reply.addHook('onSend', async (_req, _rep, payload) => {
    await redis.setex(cacheKey, 86400, JSON.stringify({
      payloadHash: hashPayload(request.body),
      statusCode: reply.statusCode,
      body: payload,
    }))
  })
}
```

### Atomic Wallet Operations (Row-Level Locking)

```typescript
// wallet.service.ts
async function deductFromWallet(
  tx: PrismaTransaction, userId: string, amount: Paise, idempotencyKey: string
): Promise<void> {
  // SELECT ... FOR UPDATE — blocks concurrent deductions
  const wallet = await tx.$queryRaw<Wallet[]>`
    SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
  `
  if (!wallet[0]) throw new AppError('WALLET_NOT_FOUND', 404)
  if (wallet[0].balance < amount) throw new AppError('INSUFFICIENT_BALANCE', 422)

  await tx.wallet.update({
    where: { user_id: userId },
    data: { balance: { decrement: amount } },
  })
  await tx.transaction.create({
    data: {
      wallet_id: wallet[0].id, type: 'INVESTMENT_DEBIT',
      amount, idempotency_key: idempotencyKey, status: 'COMPLETED',
    },
  })
}
```

### Razorpay Webhook Verification

```typescript
// lib/razorpay.ts — constant-time comparison
function verifyRazorpayWebhook(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
// Route MUST use rawBody: true — parse JSON AFTER verification
```

---

## 1.6 Rate Limiting

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `POST /auth/register` | 10 | 1 hour | IP |
| `POST /auth/login` | 5 | 1 min | IP |
| `POST /auth/forgot-password` | 3 | 1 hour | IP |
| `POST /auth/refresh` | 20 | 1 hour | User |
| `POST /wallet/topup` | 10 | 1 hour | User |
| `POST /investments` | 20 | 1 hour | User |
| `POST /plots/:id/hold` | 10 | 1 hour | User |
| `GET /* (auth)` | 100 | 1 min | User |
| `GET /* (public)` | 30 | 1 min | IP |
| Admin endpoints | 50 | 1 min | Admin |
| `POST /webhooks/razorpay` | 1000 | 1 min | IP |

---

## 1.7 Security Headers & CORS

```typescript
// middleware/securityHeaders.ts
fastify.addHook('onSend', async (_, reply) => {
  reply.headers({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  })
  reply.removeHeader('X-Powered-By')
  reply.removeHeader('Server')
})

// CORS — explicit origin, never '*'
fastify.register(cors, {
  origin: [env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
  credentials: true,
  maxAge: 86400,
})
```

---

## 1.8 Audit Logging (Append-Only)

```typescript
type AuditEventType =
  | 'USER_REGISTERED' | 'USER_LOGIN_SUCCESS' | 'USER_LOGIN_FAILURE' | 'USER_LOGOUT'
  | 'PASSWORD_CHANGED' | 'PASSWORD_RESET_REQUESTED'
  | 'MFA_ENABLED' | 'MFA_DISABLED' | 'SESSION_REVOKED'
  | 'WALLET_TOPUP_INITIATED' | 'WALLET_TOPUP_COMPLETED'
  | 'INVESTMENT_CREATED' | 'PLOT_HELD' | 'PLOT_HOLD_RELEASED'
  | 'PROFIT_DISTRIBUTED' | 'SALE_INITIATED' | 'SALE_CONFIRMED'
  | 'USER_ROLE_CHANGED' | 'SYSTEM_CONFIG_CHANGED'
  | 'ADMIN_MANUAL_WALLET_CREDIT' | 'RATE_LIMIT_BREACH'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT' | 'WEBHOOK_SIGNATURE_FAILURE'

// DB user has INSERT-only on audit_logs — NO UPDATE, NO DELETE
async function writeAuditLog(event: AuditEntry): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO audit_logs
      (event_type, actor_id, actor_role, target_type, target_id,
       ip_address, user_agent_hash, payload, result, failure_reason)
    VALUES (${event.type}, ${event.actorId}, ${event.actorRole},
            ${event.targetType}, ${event.targetId},
            ${event.ipAddress}::inet, ${event.userAgentHash},
            ${JSON.stringify(event.payload)}::jsonb,
            ${event.result}, ${event.failureReason ?? null})
  `
}
```

---

## 1.9 Infrastructure Security

```
Internet → Cloudflare (WAF + DDoS) → Load Balancer (HTTPS termination)
  → App Servers (private subnet, port 3000 from LB only)
    → PostgreSQL (private subnet, port 5432 from app only)
    → Redis (private subnet, port 6379 from app only)
```

**PostgreSQL roles:** `app_rw` (CRUD on app tables), `app_ro` (SELECT only — reporting), `app_audit` (INSERT only on `audit_logs`), `migrations` (DDL — deployment only).

**RLS** on: `users`, `wallets`, `investments`, `transactions` — users can only SELECT/UPDATE own rows.

**Secret rotation:** JWT keys every 180 days (with overlap), encryption key annually (with re-encryption), DB passwords every 90 days, API keys every 90 days.
