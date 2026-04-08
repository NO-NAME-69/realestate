# 7. Testing Strategy

## Unit Tests (Vitest) — 80%+ coverage on `src/lib/` and services

| Test Suite | Key Cases |
|---|---|
| **Money (lib/money.ts)** | `toPaise(100.33)` → `10033`, `distributePaise` with remainders, overflow protection, branded type safety |
| **Crypto (lib/crypto.ts)** | Encrypt/decrypt round-trip, invalid ciphertext format, wrong key fails, empty string handling |
| **JWT (lib/jwt.ts)** | Sign/verify RS256, expired token rejects, tampered payload rejects, missing fields fail Zod |
| **Password** | bcrypt 72-byte truncation works, password policy rejects weak, history prevents reuse |
| **Activation Logic** | Team=20 → ACTIVE, investment ≥ ₹50k → ACTIVE, team=19 AND invest=₹49k → INACTIVE, both paths = 'BOTH' |
| **Profit Formula** | Integer division, remainder tracking, zero investors, loss scenario (negative profit), single investor gets 100% |

```typescript
// Example: money distribution test
describe('distributePaise', () => {
  it('handles remainder correctly', () => {
    const result = distributePaise(10033 as Paise, [1, 1, 1])
    expect(result.amounts).toEqual([3344, 3344, 3344])
    expect(result.remainder).toBe(1) // 1 paise → company
  })
})
```

---

## Integration Tests (Vitest + Supertest + Testcontainers)

> Real PostgreSQL 16 + Redis 7 containers — **NO mocks for DB/cache**.

| Test Scenario | What It Validates |
|---|---|
| **Concurrent wallet deductions** | Two parallel investment requests for same user — only one succeeds, no negative balance |
| **Double webhook delivery** | Send same Razorpay webhook twice — wallet credited once, second returns silently |
| **Token refresh reuse** | Use refresh token → get new one → reuse old → entire family invalidated |
| **Wallet below zero** | Direct SQL insert with negative amount → DB CHECK constraint rejects |
| **Profit distribution: 0 investors** | Sale with no investments → marks distributed, no errors |
| **Plot hold expiry job** | Create hold, advance time 31 days, run job → plot released, user notified |
| **Plot hold race** | Two users hold same plot simultaneously → only one succeeds |
| **Investment triggers activation** | User invests ₹50k → status flips to ACTIVE |

```typescript
// Example: concurrent wallet test
it('prevents double-spend via row locking', async () => {
  // Setup: user with ₹1000 balance
  const results = await Promise.allSettled([
    api.post('/investments').send({ amount_paise: 80000 }), // ₹800
    api.post('/investments').send({ amount_paise: 80000 }), // ₹800
  ])
  const successes = results.filter(r => r.status === 'fulfilled' && r.value.status === 201)
  expect(successes.length).toBe(1) // only one can succeed
  const wallet = await getWalletBalance(userId)
  expect(wallet.balance).toBe(20000) // ₹200 remaining
})
```

---

## Security Tests (MUST run in CI)

| Test | Expected Result |
|---|---|
| SQL injection in search params (`'; DROP TABLE--`) | Zod validation rejects, 422 returned |
| JWT with wrong secret | 401, audit log created |
| Expired JWT | 401 |
| Tampered JWT payload (changed role) | 401, signature mismatch |
| Rate limit breach (6 logins in 1 min) | 429 returned |
| Access other user's wallet | 404 (not 403) |
| Access other user's investment | 404 |
| Webhook with invalid HMAC signature | 401, `WEBHOOK_SIGNATURE_FAILURE` audit |
| Request without Idempotency-Key on financial endpoint | 400 |
| Password > 72 bytes | Truncated, hash still works |

---

## CI Pipeline Gates (GitHub Actions)

```yaml
# All gates must pass — fail pipeline on any failure
steps:
  - name: TypeScript compile
    run: npx tsc --noEmit

  - name: Lint (ESLint + security plugin)
    run: npx eslint src/ --max-warnings 0

  - name: Dependency audit
    run: npm audit --audit-level=high  # fail on high+critical

  - name: Unit tests
    run: npx vitest run --coverage
    # Coverage threshold: 80% on src/lib/, src/modules/*/service

  - name: Integration tests (Testcontainers)
    run: npx vitest run tests/integration/
    # Requires Docker in CI runner

  - name: Security tests
    run: npx vitest run tests/integration/security/
```
