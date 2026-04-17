// seed-test-users.ts
// Creates 25 test INVESTOR users, each with ₹5000 (500000 paise) wallet balance.
// Run: npx tsx seed-test-users.ts

import { prisma, disconnectPrisma } from './src/config/database.js';
import bcrypt from 'bcrypt';

const WALLET_BALANCE_PAISE = 500000; // ₹5,000
const DEFAULT_PASSWORD = 'Test@1234';
const BCRYPT_ROUNDS = 10;

// 25 realistic Indian test users
const TEST_USERS = [
  { fullName: 'Aarav Mehta',       email: 'aarav.mehta@test.com',       mobile: '9100000001', address: 'Mumbai, Maharashtra' },
  { fullName: 'Vivaan Sharma',     email: 'vivaan.sharma@test.com',     mobile: '9100000002', address: 'Delhi, NCR' },
  { fullName: 'Aditya Patel',      email: 'aditya.patel@test.com',      mobile: '9100000003', address: 'Ahmedabad, Gujarat' },
  { fullName: 'Vihaan Gupta',      email: 'vihaan.gupta@test.com',      mobile: '9100000004', address: 'Jaipur, Rajasthan' },
  { fullName: 'Arjun Singh',       email: 'arjun.singh@test.com',       mobile: '9100000005', address: 'Lucknow, UP' },
  { fullName: 'Sai Kumar',         email: 'sai.kumar@test.com',         mobile: '9100000006', address: 'Hyderabad, Telangana' },
  { fullName: 'Reyansh Joshi',     email: 'reyansh.joshi@test.com',     mobile: '9100000007', address: 'Pune, Maharashtra' },
  { fullName: 'Ayaan Reddy',       email: 'ayaan.reddy@test.com',       mobile: '9100000008', address: 'Bengaluru, Karnataka' },
  { fullName: 'Krishna Iyer',      email: 'krishna.iyer@test.com',      mobile: '9100000009', address: 'Chennai, Tamil Nadu' },
  { fullName: 'Ishaan Malhotra',   email: 'ishaan.malhotra@test.com',   mobile: '9100000010', address: 'Chandigarh, Punjab' },
  { fullName: 'Ananya Desai',      email: 'ananya.desai@test.com',      mobile: '9100000011', address: 'Surat, Gujarat' },
  { fullName: 'Diya Nair',         email: 'diya.nair@test.com',         mobile: '9100000012', address: 'Kochi, Kerala' },
  { fullName: 'Myra Chauhan',      email: 'myra.chauhan@test.com',      mobile: '9100000013', address: 'Bhopal, MP' },
  { fullName: 'Sara Kapoor',       email: 'sara.kapoor@test.com',       mobile: '9100000014', address: 'Noida, UP' },
  { fullName: 'Aisha Saxena',      email: 'aisha.saxena@test.com',      mobile: '9100000015', address: 'Indore, MP' },
  { fullName: 'Navya Tiwari',      email: 'navya.tiwari@test.com',      mobile: '9100000016', address: 'Nagpur, Maharashtra' },
  { fullName: 'Pari Agarwal',      email: 'pari.agarwal@test.com',      mobile: '9100000017', address: 'Kolkata, West Bengal' },
  { fullName: 'Riya Bansal',       email: 'riya.bansal@test.com',       mobile: '9100000018', address: 'Gurgaon, Haryana' },
  { fullName: 'Saanvi Pillai',     email: 'saanvi.pillai@test.com',     mobile: '9100000019', address: 'Thiruvananthapuram, Kerala' },
  { fullName: 'Fatima Sheikh',     email: 'fatima.sheikh@test.com',     mobile: '9100000020', address: 'Nashik, Maharashtra' },
  { fullName: 'Kabir Verma',       email: 'kabir.verma@test.com',       mobile: '9100000021', address: 'Patna, Bihar' },
  { fullName: 'Dhruv Rastogi',     email: 'dhruv.rastogi@test.com',     mobile: '9100000022', address: 'Dehradun, Uttarakhand' },
  { fullName: 'Rohan Mishra',      email: 'rohan.mishra@test.com',      mobile: '9100000023', address: 'Varanasi, UP' },
  { fullName: 'Nikhil Yadav',      email: 'nikhil.yadav@test.com',      mobile: '9100000024', address: 'Ranchi, Jharkhand' },
  { fullName: 'Tanvi Bhatt',       email: 'tanvi.bhatt@test.com',       mobile: '9100000025', address: 'Vadodara, Gujarat' },
];

async function main() {
  console.log(`\n🚀 Seeding ${TEST_USERS.length} test users with ₹${WALLET_BALANCE_PAISE / 100} each...\n`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  let created = 0;
  let skipped = 0;

  for (const u of TEST_USERS) {
    // Skip if email already exists
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  ⏭  ${u.fullName} (${u.email}) — already exists, skipping`);
      skipped++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: u.email,
          mobile: u.mobile,
          passwordHash,
          fullName: u.fullName,
          address: u.address,
          status: 'ACTIVE',
          role: 'INVESTOR',
          isMobileVerified: true,
          isEmailVerified: true,
          passwordHistory: [passwordHash],
        },
      });

      // Create wallet with ₹5,000 balance
      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          balance: WALLET_BALANCE_PAISE,
        },
      });

      // Record an ADMIN_CREDIT transaction so the ledger stays consistent
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'ADMIN_CREDIT',
          amount: WALLET_BALANCE_PAISE,
          balanceBefore: 0,
          balanceAfter: WALLET_BALANCE_PAISE,
          status: 'COMPLETED',
          description: 'Test seed — initial ₹5,000 credit',
        },
      });
    });

    console.log(`  ✅ ${u.fullName.padEnd(20)} | ${u.email.padEnd(32)} | ${u.mobile} | ₹5,000`);
    created++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Created: ${created}  |  Skipped: ${skipped}  |  Total: ${TEST_USERS.length}`);
  console.log(`  Password for all test users: ${DEFAULT_PASSWORD}`);
  console.log(`  Wallet balance: ₹5,000 (${WALLET_BALANCE_PAISE} paise)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
