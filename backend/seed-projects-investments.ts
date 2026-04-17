// seed-projects-investments.ts
// Adds 3 new projects with affordable plots, then simulates investments from test users.
// Run: npx tsx seed-projects-investments.ts

import { prisma, disconnectPrisma } from './src/config/database.js';
import { randomUUID } from 'crypto';

// ━━━━━━━━ NEW PROJECTS ━━━━━━━━

const NEW_PROJECTS = [
  {
    id: randomUUID(),
    name: 'Royal Palm Residency',
    type: 'Residential',
    location: 'Hoshangabad Road, Bhopal, MP',
    description: 'Luxury residential plots surrounded by lush greenery. Gated community with 24/7 security, clubhouse, swimming pool, and children\'s play area. Walking distance from Habibganj Railway Station.',
    totalAreaSqft: 80000,
    totalCost: 500000000,   // ₹50 lakh
    estimatedValue: 800000000, // ₹80 lakh
    status: 'READY_FOR_SALE' as const,
    plots: [
      // 10 affordable plots at ₹2,000 each (200000 paise) — within test user budget
      ...Array.from({ length: 10 }, (_, i) => ({
        plotNumber: `RP-${101 + i}`,
        sizeSqft: 800 + (i * 50),
        price: 200000,  // ₹2,000
        type: i < 3 ? 'CORNER' as const : i < 7 ? 'MIDDLE' as const : 'DOUBLE_ROAD' as const,
        facing: ['North', 'South', 'East', 'West', 'North-East'][i % 5],
        roadWidthFt: [30, 40, 60][i % 3],
        status: 'AVAILABLE' as const,
      })),
      // 5 premium plots
      ...Array.from({ length: 5 }, (_, i) => ({
        plotNumber: `RP-${201 + i}`,
        sizeSqft: 1500 + (i * 200),
        price: 500000,  // ₹5,000
        type: 'CORNER' as const,
        facing: 'East',
        roadWidthFt: 60,
        status: 'AVAILABLE' as const,
      })),
    ],
  },
  {
    id: randomUUID(),
    name: 'Sunrise Tech Park',
    type: 'Commercial',
    location: 'Vijay Nagar, Indore, MP',
    description: 'Premium commercial plots in the heart of IT corridor. Ideal for office spaces, retail showrooms, and co-working hubs. Excellent connectivity via BRT and upcoming metro line.',
    totalAreaSqft: 120000,
    totalCost: 800000000,
    estimatedValue: 1200000000,
    status: 'UNDER_DEVELOPMENT' as const,
    plots: [
      ...Array.from({ length: 12 }, (_, i) => ({
        plotNumber: `STP-${301 + i}`,
        sizeSqft: 1000 + (i * 100),
        price: 150000,  // ₹1,500
        type: i % 3 === 0 ? 'CORNER' as const : 'MIDDLE' as const,
        facing: ['North', 'South', 'East', 'West'][i % 4],
        roadWidthFt: [40, 60][i % 2],
        status: 'AVAILABLE' as const,
      })),
    ],
  },
  {
    id: randomUUID(),
    name: 'Lake View Heights',
    type: 'Residential',
    location: 'Upper Lake, Bhopal, MP',
    description: 'Exclusive lake-facing residential plots with panoramic views. Premium gated community with manicured gardens, jogging track, and meditation zone. Just 5 minutes from New Market.',
    totalAreaSqft: 60000,
    totalCost: 400000000,
    estimatedValue: 700000000,
    status: 'APPROVED' as const,
    plots: [
      ...Array.from({ length: 8 }, (_, i) => ({
        plotNumber: `LVH-${401 + i}`,
        sizeSqft: 1200 + (i * 150),
        price: 300000,  // ₹3,000
        type: i < 2 ? 'DOUBLE_ROAD' as const : i < 5 ? 'CORNER' as const : 'MIDDLE' as const,
        facing: ['North-East', 'East', 'South-East', 'North'][i % 4],
        roadWidthFt: [40, 60, 80][i % 3],
        status: 'AVAILABLE' as const,
      })),
    ],
  },
];

async function main() {
  console.log('\n🏗️  Seeding projects, plots & investments...\n');

  // ━━━━━━━━ STEP 1: Create Projects & Plots ━━━━━━━━
  const projectIds: string[] = [];
  for (const proj of NEW_PROJECTS) {
    const existing = await prisma.project.findFirst({ where: { name: proj.name } });
    if (existing) {
      console.log(`  ⏭  Project "${proj.name}" already exists, skipping creation`);
      projectIds.push(existing.id);
      continue;
    }

    const { plots, ...projectData } = proj;
    await prisma.project.create({
      data: {
        ...projectData,
        plots: { create: plots },
      },
    });
    projectIds.push(proj.id);
    console.log(`  ✅ Project "${proj.name}" — ${plots.length} plots created`);
  }

  // ━━━━━━━━ STEP 2: Load test users ━━━━━━━━
  const testUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: '@test.com' },
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: { wallet: true },
    orderBy: { fullName: 'asc' },
  });

  if (testUsers.length === 0) {
    console.log('\n  ⚠  No test users found! Run seed-test-users.ts first.\n');
    return;
  }
  console.log(`\n  📋 Found ${testUsers.length} active test users\n`);

  // ━━━━━━━━ STEP 3: Load investable plots ━━━━━━━━
  const availablePlots = await prisma.plot.findMany({
    where: {
      projectId: { in: projectIds },
      status: 'AVAILABLE',
      deletedAt: null,
    },
    include: { project: { select: { name: true, status: true } } },
    orderBy: { price: 'asc' },
  });

  // Only pick plots from investable projects
  const investablePlots = availablePlots.filter(p =>
    ['READY_FOR_SALE', 'UNDER_DEVELOPMENT', 'APPROVED'].includes(p.project.status)
  );

  console.log(`  📋 Found ${investablePlots.length} investable plots across ${projectIds.length} projects\n`);

  // ━━━━━━━━ STEP 4: Simulate investments ━━━━━━━━
  let investmentCount = 0;
  let plotIndex = 0;
  const MIN_INVESTMENT = 100000; // ₹1,000 in paise (from env)

  for (const user of testUsers) {
    if (!user.wallet) continue;
    const walletBalance = user.wallet.balance;

    // Each user makes 1-2 investments if they can afford it
    const investmentsPerUser = Math.min(2, Math.floor(walletBalance / MIN_INVESTMENT));

    for (let i = 0; i < investmentsPerUser && plotIndex < investablePlots.length; i++) {
      const plot = investablePlots[plotIndex];
      // Invest the plot's price or what they can afford
      const investAmount = Math.min(plot.price, walletBalance - (i * MIN_INVESTMENT));
      if (investAmount < MIN_INVESTMENT) continue;

      try {
        await prisma.$transaction(async (tx) => {
          // Lock & debit wallet
          const wallets = await tx.$queryRaw<Array<{ id: string; balance: number }>>`
            SELECT id, balance FROM wallets WHERE user_id = ${user.id}::uuid FOR UPDATE
          `;
          const w = wallets[0];
          if (!w || w.balance < investAmount) return;

          const newBalance = w.balance - investAmount;

          await tx.wallet.update({
            where: { userId: user.id },
            data: { balance: newBalance },
          });

          await tx.transaction.create({
            data: {
              walletId: w.id,
              type: 'INVESTMENT_DEBIT',
              amount: investAmount,
              balanceBefore: w.balance,
              balanceAfter: newBalance,
              status: 'COMPLETED',
              description: `Investment in ${plot.project.name} — Plot ${plot.plotNumber}`,
            },
          });

          await tx.investment.create({
            data: {
              userId: user.id,
              projectId: plot.projectId,
              plotId: plot.id,
              amount: investAmount,
            },
          });

          // Update user total investment
          await tx.user.update({
            where: { id: user.id },
            data: { totalInvestment: { increment: investAmount } },
          });
        });

        const rupees = (investAmount / 100).toLocaleString('en-IN');
        console.log(`  💰 ${user.fullName.padEnd(20)} invested ₹${rupees.padStart(8)} → ${plot.project.name} / ${plot.plotNumber}`);
        investmentCount++;
        plotIndex++;
      } catch (err: any) {
        console.log(`  ❌ ${user.fullName} — ${err.message || 'investment failed'}`);
      }
    }
  }

  // ━━━━━━━━ SUMMARY ━━━━━━━━
  const finalStats = await prisma.investment.count();
  const totalInvested = await prisma.investment.aggregate({ _sum: { amount: true } });

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  New investments made this run: ${investmentCount}`);
  console.log(`  Total investments in DB:       ${finalStats}`);
  console.log(`  Total invested value:          ₹${((totalInvested._sum.amount ?? 0) / 100).toLocaleString('en-IN')}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
