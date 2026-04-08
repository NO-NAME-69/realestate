import { prisma, disconnectPrisma } from './src/config/database.js';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function main() {
  const adminEmail = 'admin@rpinvestments.com';
  const adminMobile = '9999999999';
  const plainPassword = 'AdminPassword123!';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log(`Admin user already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 12);
  const userId = randomUUID();
  const walletId = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        email: adminEmail,
        mobile: adminMobile,
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        wallet: {
          create: {
            id: walletId,
            balance: 1000000000 // ₹1 Cr initial balance
          }
        }
      }
    });
  });

  console.log('✅ SUPER_ADMIN created successfully!');
  console.log('--- Credentials ---');
  console.log(`Email:    ${adminEmail}`);
  console.log(`Mobile:   ${adminMobile}`);
  console.log(`Password: ${plainPassword}`);
  console.log('-------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
