# 6. MVP Roadmap (Phase 1)

## Effort Estimates (2 TypeScript Developers)

| # | Module | Weeks | Security Complexity | Blocking Dependencies |
|---|--------|:-----:|:-------------------:|----------------------|
| 1 | **Auth + Security Core** | 3.0 | 🔴 High | None — start here |
| 2 | **Wallet + Payments** | 2.5 | 🔴 High | Auth |
| 3 | **Investment Engine** | 2.0 | 🔴 High | Auth, Wallet |
| 4 | **Team + Activation** | 1.5 | 🟡 Medium | Auth |
| 5 | **Project + Plot CRUD** | 2.0 | 🟡 Medium | Auth |
| 6 | **Plot Holding** | 1.5 | 🟡 Medium | Auth, Team, Investment, Plot |
| 7 | **Sales + Profit Dist.** | 2.5 | 🔴 High | Investment, Plot, Wallet |
| 8 | **Admin Panel APIs** | 2.0 | 🟡 Medium | All modules |
| 9 | **Notifications + Jobs** | 1.5 | 🟢 Low | Auth, Wallet |
| 10 | **Testing + CI/CD** | 2.0 | 🟡 Medium | Parallel — continuous |
| 11 | **Infrastructure Setup** | 1.0 | 🔴 High | Week 1 |
| | **Total** | **~20 weeks** | | |

> With parallel work (2 devs), realistic delivery: **12–14 weeks**.

## Dependency Graph

```
Week 1-3:   [Infra] ─→ [Auth+Security] ─→  ┐
Week 2-4:                                     ├→ [Wallet+Payments]
Week 3-5:   [Team+Activation] ──────────────→├→ [Investment Engine]
Week 3-5:   [Project+Plot CRUD] ────────────→┘
Week 6-7:   [Plot Holding] (needs Team, Investment, Plot)
Week 7- [x] Admin: user mgmt, sales, profit distribution, config, audit logs
  - [x] Built User Management Dashboard
  - [x] Built Project Management Dashboard
  - [x] Built Sales/Plot tracking UI
  - [x] Built Audit Logs Viewer
  - [x] Built System Config Editor
- [x] Webhooks: Razorpay raw body signature verifications + Jobs] (iterative)
Week 1-14:  [Testing + CI/CD] (continuous)
```

## Phase 2 Exclusions (Post-MVP)

- Auto-reinvestment engine with smart matching
- Advanced analytics / custom report builder
- KYC/AML integration (third-party verification)
- TOTP 2FA for investors (SMS OTP is MVP)
- Plot comparison UI
- Auto-approval workflows
- Mobile app (React Native)
- Withdrawal to bank account
