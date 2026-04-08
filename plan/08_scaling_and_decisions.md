# 8. Scaling Plan

## Scale Milestones

### 1,000 Users (MVP Launch)
- Current architecture as designed — single app server
- Monitor: slow queries via `pg_stat_statements`, connection count
- Add **PgBouncer** for connection pooling (max 20 per app user)
- Redis single instance sufficient
- BullMQ single worker per queue

### 10,000 Users
- **Read replica** for reporting queries (dashboards, analytics)
- **Redis caching** for project/plot listings (5-min TTL, invalidate on update)
- BullMQ concurrency tuning: profit distribution worker `concurrency: 3`
- Review and optimize N+1 queries in Prisma (use `include` judiciously)
- Implement cursor-based pagination (already designed) — verify no offset usage leaked in

### 100,000 Users
- **Extract auth as separate microservice** (JWT validation is stateless — scales independently)
- **Partition** `transactions` and `audit_logs` tables by `created_at` (monthly range partitions)
- Evaluate **Prisma → native pg driver** for hot paths (wallet operations, high-frequency reads)
- Redis cluster for rate limiting and idempotency
- Separate BullMQ Redis instance from application Redis
- Consider read-through cache layer for investment portfolio queries

### Security Re-evaluation

| Milestone | Action |
|---|---|
| **10K users** | Engage external penetration tester. Review all rate limits. |
| **100K users** | SOC 2 Type II audit consideration. Dedicated security engineer. WAF rule tuning. |
| **Every 6 months** | Dependency audit, secret rotation, access review |

---

# 9. Design Decisions & Fixes

> What changed from the original SRS/Flowcharts and **why**.

## Critical Overrides

| # | SRS/Flowchart | Architecture Decision | Rationale |
|---|---|---|---|
| 1 | **Activation: 20-member team only** | **Dual-path:** `team ≥ 20` OR `investment ≥ ₹50,000` | SRS locks out solo investors. Business should not require team to invest with real money. Dual-path opens direct investment channel. |
| 2 | **MySQL or PostgreSQL** | **PostgreSQL 16 only** | ACID, row-level locking (`FOR UPDATE`), RLS, `TIMESTAMPTZ`, `JSONB`, `CHECK` constraints. MySQL lacks RLS and has weaker locking semantics for financial use. |
| 3 | **Sequelize/TypeORM** | **Prisma ORM** | Type-safe queries from schema, migration support, no raw SQL injection surface. Middleware for transparent encryption. |
| 4 | **Express.js implied** | **Fastify 4.x** | 2x perf over Express, built-in schema validation, native TypeScript, structured logging via Pino. |
| 5 | **No money type specified** | **Integer paise (branded type)** | JavaScript floats lose precision (`0.1 + 0.2 ≠ 0.3`). ALL money stored/computed as integer paise. `Paise` branded type prevents accidental rupee/paise mixing at compile time. |
| 6 | **Sequential IDs in data models** | **UUID v4 for all IDs** | Sequential IDs leak entity count, enable enumeration attacks (`/users/1`, `/users/2`…). UUIDs are non-guessable. |
| 7 | **403 for unauthorized** | **404 for unauthorized + not-found** | Returning 403 confirms resource exists to attacker. 404 for both prevents resource enumeration. |
| 8 | **"Account lockout after 5 attempts"** | **Exponential backoff: 3→delay, 6→30min lock, 10→hard lock** | SRS's flat 5-attempt lockout is too aggressive for real users, too simple for attackers. Graduated response balances UX and security. |
| 9 | **No idempotency mentioned** | **Mandatory on all financial mutations** | Financial duplicates (double-charge, double-credit) are catastrophic. Idempotency-Key header + Redis + DB unique constraint. |
| 10 | **"AES-256" for encryption** | **AES-256-GCM with authenticated encryption** | SRS mentions AES-256 but not the mode. AES-CBC has padding oracle attacks. GCM provides both confidentiality and integrity. |

## Security Additions (Not in SRS)

| Addition | Why |
|---|---|
| **Refresh token family tracking** | SRS mentions sessions but not reuse detection. Token reuse = compromise signal → invalidate entire family. |
| **bcrypt 72-byte truncation** | bcrypt silently ignores bytes >72. Attacker can send 10MB password → valid hash. Must truncate before hashing. |
| **Constant-time comparison** | SRS mentions "webhook verification" but not timing attacks. `crypto.timingSafeEqual` for all secret comparisons. |
| **Razorpay raw body verification** | Webhook signature must be verified on raw bytes, NOT parsed JSON (serialization changes hash). Route uses `rawBody: true`. |
| **Audit log append-only at DB level** | SRS mentions audit logging but not tamper-proofing. DB user has INSERT-only on `audit_logs` — no UPDATE/DELETE even if app is compromised. |
| **Row-level security (RLS)** | SRS mentions RBAC at app level but not database level. RLS adds defense-in-depth — even SQL injection can't read other users' data. |
| **Money branded type** | Not in SRS. TypeScript compile-time safety prevents paise/rupee confusion. Pattern: `type Paise = Brand<number, 'Paise'>`. |
| **Profit distribution remainder policy** | SRS doesn't address integer division remainders. Policy: remainder credited to company account, explicitly documented. |

## SRS Requirements Deferred to Phase 2

| SRS Requirement | Reason |
|---|---|
| REQ-RV-005: Auto-reinvestment | Complex smart-matching algorithm needs more design. Manual reinvest in MVP. |
| REQ-RA-013: Custom report builder | Low ROI for MVP. Standard reports cover 90% of needs. |
| REQ-UM-004: KYC/AML integration | Requires third-party vendor selection and legal review. Not blocking for MVP. |
| REQ-PH-009: Plot comparison UI | Frontend feature — backend data already available. |
| REQ-WM-011: Wallet withdrawal | Requires bank transfer integration, compliance review. Profit stays in wallet for MVP. |
| REQ-UD-014: Dashboard personalization | Nice-to-have. Fixed dashboard layout for MVP. |

## SRS Contradictions Fixed

| Issue | Fix |
|---|---|
| SRS says "team of 20 required" but also "investment-based eligibility" | Unified as dual-path activation with clear precedence. |
| Flowchart says "Plot value ≤ 50% of team value OR 10x investment" but SRS says "stricter of team value or investment limit" | Architecture uses: **with team → `min(team_value*0.5, investment*10)`**, **no team → `investment*10`**. "Stricter" interpretation for team users, investment-only for solo. |
| SRS lists both cascading referral bonuses and "referral tracking" | Architecture: **fixed one-time bonus only**. No cascading. No MLM structure. Referrals tracked for attribution, not compensation chains. |
| SRS Module 3 mentions "Payment Approval System" for wallet top-up | Removed for MVP. Razorpay handles payment approval. Admin approval adds friction to user flow without clear security benefit. |
