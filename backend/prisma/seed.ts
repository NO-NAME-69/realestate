import { prisma } from '../src/config/database.js';
import { ProjectStatus, PlotStatus, UserStatus, UserRole, PlotType } from '../src/generated/prisma/enums.js';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Setup Admin Config
    console.log('Configuring system parameters...');
    const configKeys = [
      { key: 'minPurchaseAmount', value: '500000' },
      { key: 'kycEligibility', value: '50000' },
      { key: 'maxPlots', value: '10' },
      { key: 'holdDuration', value: '7' },
      { key: 'notifyUserRegistration', value: 'true' },
      { key: 'notifyKyc', value: 'true' },
      { key: 'notifyTransactions', value: 'true' },
      { key: 'notifySales', value: 'true' },
      { key: 'gatewayProvider', value: 'Razorpay' },
      { key: 'platformName', value: 'PropVault Master' },
      { key: 'supportEmail', value: 'support@propvault.in' }
    ];
    for (const c of configKeys) {
      await prisma.systemConfig.upsert({
        where: { key: c.key },
        update: { value: c.value },
        create: { key: c.key, value: c.value }
      });
    }

    // 2. Create Users
    console.log('Creating users...');
    const passwordHash = await bcrypt.hash('Password123!', 10);
    
    await prisma.user.upsert({
      where: { email: 'investor1@example.com' },
      update: {},
      create: {
        email: 'investor1@example.com',
        mobile: '9998887771',
        passwordHash,
        fullName: 'Rahul Sharma',
        status: UserStatus.ACTIVE,
        role: UserRole.INVESTOR,
        isEmailVerified: true,
        isMobileVerified: true,
        wallet: { create: { balance: 150000000 } }
      }
    });

    await prisma.user.upsert({
      where: { email: 'investor2@example.com' },
      update: {},
      create: {
        email: 'investor2@example.com',
        mobile: '9998887772',
        passwordHash,
        fullName: 'Priya Verma',
        status: UserStatus.ACTIVE,
        role: UserRole.INVESTOR,
        isEmailVerified: true,
        isMobileVerified: true,
        wallet: { create: { balance: 500000000 } }
      }
    });

    // 3. Create Projects
    console.log('Creating projects...');
    const p1id = '00000000-0000-0000-0000-000000000001';
    await prisma.project.upsert({
      where: { id: p1id },
      update: {},
      create: {
        id: p1id,
        name: 'Sunrise Meadows',
        type: 'Residential',
        location: 'Bhopal, MP',
        description: 'Prime residential plots with state-of-the-art amenities.',
        totalAreaSqft: 50000,
        totalCost: 1000000000,
        estimatedValue: 1500000000,
        status: ProjectStatus.READY_FOR_SALE,
        plots: {
          create: Array.from({ length: 20 }).map((_, i) => ({
            plotNumber: `A-${100 + i}`,
            sizeSqft: 1500,
            price: 150000000,
            type: PlotType.CORNER,
            status: i < 5 ? PlotStatus.SOLD : PlotStatus.AVAILABLE
          }))
        }
      }
    });

    const p2id = '00000000-0000-0000-0000-000000000002';
    await prisma.project.upsert({
      where: { id: p2id },
      update: {},
      create: {
        id: p2id,
        name: 'Green Valley Estate',
        type: 'Commercial',
        location: 'Indore, MP',
        description: 'Fastest growing commercial hub for premium investments.',
        totalAreaSqft: 120000,
        totalCost: 1000000000,
        estimatedValue: 1500000000,
        status: ProjectStatus.UNDER_DEVELOPMENT,
        plots: {
          create: Array.from({ length: 30 }).map((_, i) => ({
            plotNumber: `C-${200 + i}`,
            sizeSqft: 2000,
            price: 500000000,
            type: PlotType.MIDDLE,
            status: i < 8 ? PlotStatus.SOLD : (i === 8 ? PlotStatus.HELD : PlotStatus.AVAILABLE)
          }))
        }
      }
    });

    console.log('✅ Seeding completed! Database is fully populated with mock records.');

  } catch (error: any) {
    console.error('❌ Error during seeding:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
