import { PrismaClient, UserRole, BonusType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ──────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rewardplatform.com' },
    update: {},
    create: {
      email: 'admin@rewardplatform.com',
      username: 'superadmin',
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ── Demo users ──────────────────────────────────────────────────────────
  const userPassword = await bcrypt.hash('User@123456', 12);
  const demoUsers = await Promise.all(
    ['alice', 'bob', 'charlie', 'diana', 'evan'].map((name) =>
      prisma.user.upsert({
        where: { email: `${name}@example.com` },
        update: {},
        create: {
          email: `${name}@example.com`,
          username: name,
          password: userPassword,
          role: UserRole.USER,
        },
      }),
    ),
  );
  console.log(`✅ Demo users: ${demoUsers.map((u) => u.username).join(', ')}`);

  // ── Wallets ─────────────────────────────────────────────────────────────
  const allUsers = [admin, ...demoUsers];
  await Promise.all(
    allUsers.map((user) =>
      prisma.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      }),
    ),
  );
  console.log('✅ Wallets created');

  // ── Check-in config ─────────────────────────────────────────────────────
  const config = await prisma.checkinConfig.create({
    data: {
      name: 'Default Reward Config',
      isEnabled: true,
      resetOnMissedDay: true,
      baseRewardAmount: 10,
      maxStreakDay: 30,
    },
  });

  // ── Reward rules ─────────────────────────────────────────────────────────
  const rules = [
    { streakDay: 1, rewardAmount: 10, bonusMultiplier: 1.0, label: 'Day 1 — Welcome' },
    { streakDay: 2, rewardAmount: 15, bonusMultiplier: 1.0, label: 'Day 2' },
    { streakDay: 3, rewardAmount: 20, bonusMultiplier: 1.0, label: 'Day 3' },
    { streakDay: 4, rewardAmount: 20, bonusMultiplier: 1.0, label: 'Day 4' },
    { streakDay: 5, rewardAmount: 25, bonusMultiplier: 1.0, label: 'Day 5' },
    { streakDay: 6, rewardAmount: 25, bonusMultiplier: 1.0, label: 'Day 6' },
    { streakDay: 7, rewardAmount: 50, bonusMultiplier: 2.0, label: 'Day 7 — Weekly Jackpot 🎉' },
    { streakDay: 14, rewardAmount: 100, bonusMultiplier: 3.0, label: 'Day 14 — Fortnight Bonus 🚀' },
    { streakDay: 30, rewardAmount: 500, bonusMultiplier: 5.0, label: 'Day 30 — Monthly Legend 👑' },
  ];

  await Promise.all(
    rules.map((rule) =>
      prisma.rewardRule.create({ data: { configId: config.id, ...rule } }),
    ),
  );
  console.log(`✅ ${rules.length} reward rules created`);

  // ── Admin shortcut user (admin / admin) ──────────────────────────────
  const easyAdminPass = await bcrypt.hash('admin', 12);
  const easyAdmin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {},
    create: {
      email: 'admin@admin.com',
      username: 'admin',
      password: easyAdminPass,
      role: UserRole.ADMIN,
    },
  });
  await prisma.wallet.upsert({
    where: { userId: easyAdmin.id },
    update: {},
    create: { userId: easyAdmin.id },
  });
  console.log('✅ Easy admin: admin@admin.com / admin');

  // ── Lucky Draw config ───────────────────────────────────────────────────
  const luckyDrawConfig = await prisma.luckyDrawConfig.create({
    data: {
      name: 'Default Wheel',
      isEnabled: true,
      costPerSpin: 0,
      maxSpinsPerDay: 3,
    },
  });

  const luckyDrawSlots = [
    { label: '10 Coins',      rewardAmount: 10,   weight: 40, color: '#3B82F6', position: 0 },
    { label: '20 Coins',      rewardAmount: 20,   weight: 25, color: '#8B5CF6', position: 1 },
    { label: '50 Coins',      rewardAmount: 50,   weight: 15, color: '#10B981', position: 2 },
    { label: '100 Coins',     rewardAmount: 100,  weight: 10, color: '#F59E0B', position: 3 },
    { label: 'Better Luck',   rewardAmount: 0,    weight: 30, color: '#6B7280', position: 4 },
    { label: '200 Coins',     rewardAmount: 200,  weight: 5,  color: '#EF4444', position: 5 },
    { label: '5 Coins',       rewardAmount: 5,    weight: 50, color: '#06B6D4', position: 6 },
    { label: '500 JACKPOT',   rewardAmount: 500,  weight: 1,  color: '#F97316', position: 7 },
  ];

  await Promise.all(
    luckyDrawSlots.map((slot) =>
      prisma.luckyDrawSlot.create({ data: { configId: luckyDrawConfig.id, ...slot } }),
    ),
  );
  console.log(`✅ Lucky Draw: ${luckyDrawSlots.length} slots created`);

  // ── Sample bonus campaign ────────────────────────────────────────────────
  await prisma.bonusCampaign.create({
    data: {
      name: 'May 2026 Welcome Bonus',
      description: 'Special bonus for all active users in May 2026',
      type: BonusType.EVENT,
      amount: 50,
      multiplier: 1,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
      isActive: true,
      createdById: admin.id,
    },
  });
  console.log('✅ Sample bonus campaign created');

  console.log('\n🎉 Seeding complete!\n');
  console.log('Default credentials:');
  console.log('  Super Admin:  admin@rewardplatform.com / Admin@123456');
  console.log('  Admin:        admin@admin.com / admin');
  console.log('  User:         alice@example.com / User@123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
