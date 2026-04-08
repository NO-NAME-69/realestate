# 5. Business Logic Flows

## Flow 1: Registration + OTP + Activation Check

```typescript
async function registerUser(data: RegisterInput): Promise<{ userId: string }> {
  // 1. Validate with Zod (already done by middleware)
  // 2. Check duplicate (email + mobile)
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { mobile: data.mobile }], deleted_at: null }
  })
  if (existing) throw new AppError('DUPLICATE_USER', 409)

  // 3. Create Razorpay order for ₹500 registration fee
  const order = await razorpay.orders.create({
    amount: env.REGISTRATION_FEE_PAISE, currency: 'INR',
    receipt: `reg_${crypto.randomUUID()}`
  })

  // 4. Create user in PENDING state (not yet INACTIVE — awaiting payment)
  const passwordHash = await hashPassword(data.password)
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: data.email, mobile: data.mobile,
        password_hash: passwordHash, full_name: data.full_name,
        address: data.address, status: 'INACTIVE',
      }
    })
    await tx.wallet.create({ data: { user_id: u.id, balance: 0 } })

    // Track referral (attribution only — fixed bonus, NOT cascading)
    if (data.referral_code) {
      const team = await tx.team.findUnique({ where: { referral_code: data.referral_code } })
      if (team) {
        await tx.referral.create({
          data: { referrer_id: team.leader_id, referee_id: u.id }
        })
        await tx.teamMember.create({ data: { team_id: team.id, user_id: u.id } })
        await tx.team.update({
          where: { id: team.id },
          data: { member_count: { increment: 1 } }
        })
        // Recompute activation for team leader
        await recomputeActivation(tx, team.leader_id)
      }
    }
    return u
  })

  // 5. Send OTP for mobile verification (async job)
  await notificationQueue.add('send-otp', { userId: user.id, mobile: data.mobile })
  writeAuditLog({ type: 'USER_REGISTERED', actorId: user.id })

  return { userId: user.id, orderId: order.id }
}

// RACE CONDITION: Duplicate registration race
// PREVENTION: UNIQUE constraint on email + mobile in DB. Second insert fails with P2002.
```

### Dual-Path Activation Recomputation

```typescript
async function recomputeActivation(tx: PrismaTransaction, userId: string): Promise<void> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.status === 'ACTIVE') return // already active — no downgrade

  const teamMembership = await tx.teamMember.findFirst({
    where: { user_id: userId },
    include: { team: true }
  })
  const teamSize = teamMembership?.team.member_count ?? 0
  const totalInvestment = user.total_investment // paise

  const activateByTeam = teamSize >= env.MIN_TEAM_SIZE
  const activateByInvestment = totalInvestment >= env.ACTIVATION_THRESHOLD_PAISE

  if (activateByTeam || activateByInvestment) {
    const reason = activateByTeam && activateByInvestment ? 'BOTH'
      : activateByTeam ? 'TEAM' : 'INVESTMENT'
    await tx.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', activation_reason: reason }
    })
    await notificationQueue.add('activation', { userId, reason })
  }
}
// Called on: investment confirmation, team member join
```

---

## Flow 2: Investment Flow

```typescript
async function createInvestment(
  userId: string, input: CreateInvestmentInput, idempotencyKey: string
): Promise<Investment> {
  // 1. Verify user is ACTIVE
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.status !== 'ACTIVE') throw new AppError('USER_NOT_ACTIVE', 403)

  // 2. Verify project is investable
  const project = await prisma.project.findUniqueOrThrow({ where: { id: input.project_id } })
  if (!['READY_FOR_SALE', 'UNDER_DEVELOPMENT', 'APPROVED'].includes(project.status)) {
    throw new AppError('PROJECT_NOT_INVESTABLE', 422)
  }

  // 3. If plot specified, verify it's available
  if (input.plot_id) {
    const plot = await prisma.plot.findUniqueOrThrow({ where: { id: input.plot_id } })
    if (plot.status !== 'AVAILABLE' && plot.status !== 'HELD') {
      throw new AppError('PLOT_NOT_AVAILABLE', 422)
    }
  }

  // 4. ATOMIC: deduct wallet + create investment record
  return prisma.$transaction(async (tx) => {
    // Row-level lock on wallet
    const wallet = await tx.$queryRaw<Wallet[]>`
      SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `
    if (!wallet[0]) throw new AppError('WALLET_NOT_FOUND', 404)
    if (wallet[0].balance < input.amount_paise) {
      throw new AppError('INSUFFICIENT_BALANCE', 422)
    }

    const newBalance = wallet[0].balance - input.amount_paise

    await tx.wallet.update({
      where: { user_id: userId },
      data: { balance: newBalance }
    })

    await tx.transaction.create({
      data: {
        wallet_id: wallet[0].id, type: 'INVESTMENT_DEBIT',
        amount: input.amount_paise,
        balance_before: wallet[0].balance, balance_after: newBalance,
        status: 'COMPLETED', idempotency_key: idempotencyKey,
      }
    })

    const investment = await tx.investment.create({
      data: {
        user_id: userId, project_id: input.project_id,
        plot_id: input.plot_id, amount: input.amount_paise,
        is_reinvestment: input.is_reinvestment,
      }
    })

    // Update user's cached total_investment
    await tx.user.update({
      where: { id: userId },
      data: { total_investment: { increment: input.amount_paise } }
    })

    // Update team value if user is in a team
    const membership = await tx.teamMember.findFirst({ where: { user_id: userId } })
    if (membership) {
      await tx.team.update({
        where: { id: membership.team_id },
        data: { team_value: { increment: input.amount_paise } }
      })
    }

    // Recompute activation (in case investment crosses ₹50k threshold)
    await recomputeActivation(tx, userId)

    return investment
  })
  // RACE CONDITION: Concurrent deductions exceeding balance
  // PREVENTION: SELECT ... FOR UPDATE locks wallet row. DB CHECK(balance >= 0) as safety net.
  // RACE CONDITION: Double investment from duplicate request
  // PREVENTION: Idempotency key checked in middleware + UNIQUE(wallet_id, idempotency_key)
}
```

---

## Flow 3: Profit Distribution (BullMQ Job)

```typescript
// jobs/profitDistribution.job.ts
async function processProfitDistribution(job: Job<{ saleId: string }>): Promise<void> {
  const { saleId } = job.data

  await prisma.$transaction(async (tx) => {
    // 1. Lock sale row
    const sale = await tx.$queryRaw<Sale[]>`
      SELECT * FROM sales WHERE id = ${saleId} FOR UPDATE
    `
    if (!sale[0]) throw new Error('Sale not found')
    if (sale[0].is_distributed) throw new Error('Already distributed')

    // 2. Get all investments for this project
    const investments = await tx.investment.findMany({
      where: { project_id: sale[0].project_id, deleted_at: null }
    })
    if (investments.length === 0) {
      // Mark as distributed with zero — log the edge case
      await tx.sale.update({ where: { id: saleId }, data: { is_distributed: true } })
      return
    }

    // 3. Calculate profit (integer paise)
    const grossProfit = sale[0].final_price - sale[0].base_price
    const companyPct = await getSystemConfig(tx, 'COMPANY_PROFIT_PCT')
    const companyShare = Math.floor((grossProfit * companyPct) / 100)
    const investorPool = grossProfit - companyShare

    // 4. LOSS SCENARIO: Default = Company absorbs
    // Configurable via SystemConfig 'LOSS_HANDLING' = 'COMPANY_ABSORBS' | 'PRO_RATA_DEDUCT'
    if (grossProfit <= 0) {
      const lossPolicy = await getSystemConfig(tx, 'LOSS_HANDLING')
      if (lossPolicy === 'COMPANY_ABSORBS') {
        // Record zero distribution, mark complete
        for (const inv of investments) {
          await tx.profitDistribution.create({
            data: {
              sale_id: saleId, user_id: inv.user_id,
              investment_amount: inv.amount,
              total_invested: investments.reduce((s, i) => s + i.amount, 0),
              gross_profit: grossProfit, company_share: 0,
              investor_pool: 0, user_profit: 0, status: 'COMPLETED',
            }
          })
        }
        await tx.sale.update({ where: { id: saleId }, data: { is_distributed: true } })
        return
      }
      // PRO_RATA_DEDUCT requires separate consent flow — Phase 2
      throw new AppError('LOSS_REQUIRES_CONSENT', 422)
    }

    // 5. Integer division with remainder tracking
    const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0)
    let distributed = 0

    for (const inv of investments) {
      const userProfit = Math.floor((investorPool * inv.amount) / totalInvested)
      distributed += userProfit

      // Create distribution record
      await tx.profitDistribution.create({
        data: {
          sale_id: saleId, user_id: inv.user_id,
          investment_amount: inv.amount, total_invested: totalInvested,
          gross_profit: grossProfit, company_share: companyShare,
          investor_pool: investorPool, user_profit: userProfit, status: 'COMPLETED',
        }
      })

      // Credit wallet (with row lock)
      await tx.$executeRaw`
        UPDATE wallets SET balance = balance + ${userProfit},
        updated_at = NOW() WHERE user_id = ${inv.user_id}
      `

      // Transaction record
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { user_id: inv.user_id } })
      await tx.transaction.create({
        data: {
          wallet_id: wallet.id, type: 'PROFIT_CREDIT', amount: userProfit,
          balance_before: wallet.balance - userProfit, balance_after: wallet.balance,
          status: 'COMPLETED', description: `Profit from sale ${saleId}`,
        }
      })
    }

    // 6. Remainder → company account (documented policy)
    const remainder = investorPool - distributed
    // Log remainder for reconciliation

    await tx.sale.update({ where: { id: saleId }, data: { is_distributed: true } })
  })

  // 7. Notify AFTER successful commit
  const distributions = await prisma.profitDistribution.findMany({ where: { sale_id: saleId } })
  for (const dist of distributions) {
    await notificationQueue.add('profit-credited', {
      userId: dist.user_id, amount: dist.user_profit, saleId
    })
  }

  // RACE CONDITION: Double distribution trigger
  // PREVENTION: SELECT ... FOR UPDATE on sale row + is_distributed flag + UNIQUE(sale_id, user_id)
  // RACE CONDITION: Partial failure mid-distribution
  // PREVENTION: Single PostgreSQL transaction — all-or-nothing rollback
}
```

---

## Flow 4: Plot Hold

```typescript
async function holdPlot(userId: string, plotId: string, idempotencyKey: string): Promise<PlotHold> {
  return prisma.$transaction(async (tx) => {
    // 1. Verify user is ACTIVE
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.status !== 'ACTIVE') throw new AppError('USER_NOT_ACTIVE', 404)

    // 2. Check max holds per user (e.g., 5)
    const activeHolds = await tx.plotHold.count({
      where: { user_id: userId, status: 'ACTIVE' }
    })
    if (activeHolds >= 5) throw new AppError('MAX_HOLDS_REACHED', 422)

    // 3. Lock plot row + check availability
    const plot = await tx.$queryRaw<Plot[]>`
      SELECT * FROM plots WHERE id = ${plotId} FOR UPDATE
    `
    if (!plot[0] || plot[0].status !== 'AVAILABLE') {
      throw new AppError('PLOT_NOT_AVAILABLE', 422)
    }

    // 4. Calculate eligibility (dual-path)
    const membership = await tx.teamMember.findFirst({
      where: { user_id: userId }, include: { team: true }
    })

    let maxHoldValue: number
    if (membership) {
      // With team: min(team_value * 0.5, user_investment * 10)
      const teamLimit = Math.floor(membership.team.team_value * 0.5)
      const investmentLimit = user.total_investment * 10
      maxHoldValue = Math.min(teamLimit, investmentLimit)
    } else {
      // No team: user_investment * 10
      maxHoldValue = user.total_investment * 10
    }

    // Sum current held plot values
    const currentHeldValue = await tx.plotHold.findMany({
      where: { user_id: userId, status: 'ACTIVE' },
      include: { plot: true }
    })
    const totalHeld = currentHeldValue.reduce((s, h) => s + h.plot.price, 0)

    if (totalHeld + plot[0].price > maxHoldValue) {
      throw new AppError('HOLD_LIMIT_EXCEEDED', 422)
    }

    // 5. Create hold + update plot status
    await tx.plot.update({ where: { id: plotId }, data: { status: 'HELD' } })
    const hold = await tx.plotHold.create({
      data: {
        user_id: userId, plot_id: plotId, status: 'ACTIVE',
        expires_at: addDays(new Date(), 30),
      }
    })

    writeAuditLog({ type: 'PLOT_HELD', actorId: userId, targetId: plotId })
    return hold
  })
  // RACE CONDITION: Two users holding same plot simultaneously
  // PREVENTION: SELECT ... FOR UPDATE on plot row — second request sees 'HELD' status
}
```

---

## Flow 5: Razorpay Webhook

```typescript
async function handleRazorpayWebhook(rawBody: Buffer, signature: string): Promise<void> {
  // 1. Verify signature (BEFORE parsing JSON)
  if (!verifyRazorpayWebhook(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
    writeAuditLog({ type: 'WEBHOOK_SIGNATURE_FAILURE' })
    throw new AppError('INVALID_SIGNATURE', 401)
  }

  // 2. Parse AFTER verification
  const payload = JSON.parse(rawBody.toString('utf8'))
  const event = RazorpayWebhookSchema.parse(payload)

  // 3. Idempotency check (payment_id)
  const paymentId = event.payload.payment.entity.id
  const idempotencyKey = `webhook:${paymentId}`
  const alreadyProcessed = await redis.get(idempotencyKey)
  if (alreadyProcessed) return // silent success — already credited

  // 4. Handle event
  if (event.event === 'payment.captured') {
    const { order_id, amount } = event.payload.payment.entity

    // Find user by order reference
    const order = await prisma.transaction.findFirst({
      where: { reference_id: order_id, type: 'WALLET_TOPUP', status: 'PENDING' }
    })
    if (!order) return // orphaned webhook — log and ignore

    await prisma.$transaction(async (tx) => {
      // Credit wallet with row lock
      const wallet = await tx.$queryRaw<Wallet[]>`
        SELECT * FROM wallets WHERE id = ${order.wallet_id} FOR UPDATE
      `
      const newBalance = wallet[0]!.balance + amount

      await tx.wallet.update({
        where: { id: order.wallet_id },
        data: { balance: newBalance }
      })
      await tx.transaction.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          balance_before: wallet[0]!.balance, balance_after: newBalance
        }
      })
    })

    // Mark processed in Redis (24h TTL)
    await redis.setex(idempotencyKey, 86400, 'processed')
    writeAuditLog({ type: 'WALLET_TOPUP_COMPLETED', targetId: order.wallet_id })

    // Notify user (async)
    await notificationQueue.add('topup-success', { walletId: order.wallet_id, amount })
  }
  // RACE CONDITION: Duplicate webhook delivery
  // PREVENTION: Redis idempotency check + DB transaction + UNIQUE constraint on idempotency_key
}
```
