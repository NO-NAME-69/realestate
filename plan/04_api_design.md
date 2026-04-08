# 4. API Design

> All endpoints versioned under `/api/v1/`. UUIDs only for path params. Cursor-based pagination on all lists.

**Response envelope:**
```typescript
// Success: { data: T, meta?: { cursor?: string, hasMore: boolean } }
// Error:   { error: string, requestId: string, fields?: Record<string, string> }
```

---

## Auth Module

| Method | Route | Auth | Rate Limit | Idempotent | Description |
|--------|-------|------|------------|:----------:|-------------|
| POST | `/auth/register` | public | 10/hr/IP | Yes | Register + pay ₹500 fee |
| POST | `/auth/verify-otp` | public | 10/hr/IP | No | Verify mobile OTP |
| POST | `/auth/login` | public | 5/min/IP | No | Email/mobile + password |
| POST | `/auth/refresh` | cookie | 20/hr/user | No | Rotate refresh token |
| POST | `/auth/logout` | bearer | 100/min/user | No | Revoke session |
| POST | `/auth/forgot-password` | public | 3/hr/IP | No | Send reset OTP |
| POST | `/auth/reset-password` | public | 3/hr/IP | No | Reset with OTP |
| PUT | `/auth/change-password` | bearer | 100/min/user | No | Change with current pw |

**Key schemas:**
```typescript
const RegisterSchema = z.object({
  full_name: z.string().min(2).max(200),
  email: z.string().email().max(255),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  password: PasswordSchema,
  address: z.string().max(500).optional(),
  referral_code: z.string().max(20).optional(),
})

const LoginSchema = z.object({
  identifier: z.string().min(1), // email or mobile
  password: z.string().min(1).max(128),
})
```

---

## Wallet Module

| Method | Route | Auth | Rate Limit | Idempotent | Description |
|--------|-------|------|------------|:----------:|-------------|
| GET | `/wallet/balance` | bearer | 100/min/user | No | Current balance + summary |
| POST | `/wallet/topup/initiate` | bearer | 10/hr/user | Yes | Create Razorpay order |
| POST | `/wallet/topup/verify` | bearer | 10/hr/user | Yes | Verify payment + credit |
| GET | `/wallet/transactions` | bearer | 100/min/user | No | Paginated transaction history |
| GET | `/wallet/transactions/:id` | bearer | 100/min/user | No | Single transaction detail |

```typescript
const TopupInitiateSchema = z.object({
  amount_paise: z.number().int().min(50000).max(10000000_00), // ₹500 – ₹1Cr
  payment_mode: z.enum(['UPI', 'CARD', 'NETBANKING']).optional(),
})

// Response: { data: { order_id, amount_paise, razorpay_key_id } }
```

---

## Investment Module

| Method | Route | Auth | Rate Limit | Idempotent | Description |
|--------|-------|------|------------|:----------:|-------------|
| POST | `/investments` | bearer(ACTIVE) | 20/hr/user | Yes | Create investment |
| GET | `/investments` | bearer | 100/min/user | No | User's investments |
| GET | `/investments/:id` | bearer | 100/min/user | No | Investment detail |
| GET | `/investments/portfolio` | bearer | 100/min/user | No | Portfolio summary |

```typescript
const CreateInvestmentSchema = z.object({
  project_id: z.string().uuid(),
  plot_id: z.string().uuid().optional(),
  amount_paise: z.number().int().min(env.MIN_INVESTMENT_PAISE),
  is_reinvestment: z.boolean().default(false),
  source_profit_id: z.string().uuid().optional(),
})
```

**Security errors:** 404 if user inactive (not 403), 422 insufficient balance, 409 plot not available.

---

## Plot Module

| Method | Route | Auth | Rate Limit | Idempotent | Description |
|--------|-------|------|------------|:----------:|-------------|
| GET | `/plots` | bearer | 100/min/user | No | List with filters |
| GET | `/plots/:id` | bearer | 100/min/user | No | Plot detail |
| POST | `/plots/:id/hold` | bearer(ACTIVE) | 10/hr/user | Yes | Hold plot (30 days) |
| DELETE | `/plots/:id/hold` | bearer | 100/min/user | No | Release hold manually |
| GET | `/plots/held` | bearer | 100/min/user | No | User's held plots |

```typescript
const PlotFilterSchema = z.object({
  project_id: z.string().uuid().optional(),
  type: z.nativeEnum(PlotType).optional(),
  status: z.nativeEnum(PlotStatus).optional(),
  min_price_paise: z.number().int().optional(),
  max_price_paise: z.number().int().optional(),
  min_size_sqft: z.number().int().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
})
```

---

## Project Module

| Method | Route | Auth | Rate Limit | Idempotent | Description |
|--------|-------|------|------------|:----------:|-------------|
| GET | `/projects` | bearer | 100/min/user | No | List active projects |
| GET | `/projects/:id` | bearer | 100/min/user | No | Project detail + plots |
| POST | `/projects` | bearer(ADMIN) | 50/min/admin | Yes | Create project |
| PUT | `/projects/:id` | bearer(ADMIN) | 50/min/admin | Yes | Update project |
| PUT | `/projects/:id/status` | bearer(ADMIN) | 50/min/admin | No | Transition status |

---

## Admin Module

| Method | Route | Auth | Rate Limit | Idempotent | Description |
|--------|-------|------|------------|:----------:|-------------|
| GET | `/admin/users` | bearer(ADMIN) | 50/min/admin | No | List users (paginated) |
| GET | `/admin/users/:id` | bearer(ADMIN) | 50/min/admin | No | User detail + wallet |
| PUT | `/admin/users/:id/status` | bearer(ADMIN) | 50/min/admin | No | Activate/suspend user |
| PUT | `/admin/users/:id/role` | bearer(SUPER_ADMIN) | 50/min/admin | No | Change user role |
| POST | `/admin/sales` | bearer(ADMIN) | 50/min/admin | Yes | Initiate plot sale |
| PUT | `/admin/sales/:id/confirm` | bearer(ADMIN) | 50/min/admin | Yes | Confirm sale |
| POST | `/admin/profit/distribute/:saleId` | bearer(ADMIN,FINANCE_MGR) | 50/min/admin | Yes | Trigger profit distribution |
| GET | `/admin/config` | bearer(SUPER_ADMIN) | 50/min/admin | No | System config |
| PUT | `/admin/config/:key` | bearer(SUPER_ADMIN) | 50/min/admin | No | Update config |
| GET | `/admin/audit-logs` | bearer(ADMIN) | 50/min/admin | No | Audit log viewer |
| GET | `/admin/dashboard` | bearer(ADMIN) | 50/min/admin | No | Admin analytics |

```typescript
const InitiateSaleSchema = z.object({
  plot_id: z.string().uuid(),
  buyer_name: z.string().min(2).max(200),
  buyer_mobile: z.string().regex(/^[6-9]\d{9}$/),
  buyer_email: z.string().email().optional(),
  buyer_pan: PANSchema.optional(),
  buyer_aadhaar: AadhaarSchema.optional(),
  base_price_paise: z.number().int().positive(),
  negotiated_price_paise: z.number().int().positive(),
  final_price_paise: z.number().int().positive(),
  payment_terms: z.enum(['FULL', 'INSTALLMENT']),
})
```

---

## Webhook Module

| Method | Route | Auth | Rate Limit | Description |
|--------|-------|------|------------|-------------|
| POST | `/webhooks/razorpay` | signature | 1000/min/IP | Razorpay payment events |

**No auth middleware** — uses raw body + HMAC-SHA256 signature verification. Separate router.

```typescript
// Route config: { config: { rawBody: true } }
// 1. Verify signature (constant-time) → reject if invalid
// 2. Check idempotency (payment_id in Redis) → skip if already processed
// 3. Parse JSON only AFTER verification
// 4. Credit wallet → audit log → notify user
```

---

## User Module

| Method | Route | Auth | Rate Limit | Description |
|--------|-------|------|------------|-------------|
| GET | `/users/me` | bearer | 100/min/user | Current user profile |
| PUT | `/users/me` | bearer | 100/min/user | Update profile |
| PUT | `/users/me/kyc` | bearer | 100/min/user | Upload KYC docs |
| GET | `/users/me/dashboard` | bearer | 100/min/user | Dashboard stats |
| GET | `/users/me/activation-status` | bearer | 100/min/user | Activation check |

## Team Module

| Method | Route | Auth | Rate Limit | Description |
|--------|-------|------|------------|-------------|
| POST | `/teams` | bearer | 100/min/user | Create team |
| GET | `/teams/mine` | bearer(TEAM_LEADER) | 100/min/user | Team details |
| GET | `/teams/mine/members` | bearer(TEAM_LEADER) | 100/min/user | Team members list |
| GET | `/teams/mine/stats` | bearer(TEAM_LEADER) | 100/min/user | Team performance |
