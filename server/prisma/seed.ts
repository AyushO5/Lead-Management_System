import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

// ─────────────────────────────────────────────────────────────────────────────
// Seed script — run via: npx prisma db seed
// Reads ADMIN_SEED_PASSWORD and MEMBER_SEED_PASSWORD from environment.
// Uses upsert so repeated runs are idempotent.
// ─────────────────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const connectionString = requireEnv('DATABASE_URL');
  const adminPassword    = requireEnv('ADMIN_SEED_PASSWORD');
  const memberPassword   = requireEnv('MEMBER_SEED_PASSWORD');

  // Create a standalone Prisma client (not the singleton) for the seed script
  const adapter = new PrismaPg({ connectionString });
  const prisma  = new PrismaClient({ adapter });

  try {
    const adminHash  = await bcrypt.hash(adminPassword,  SALT_ROUNDS);
    const memberHash = await bcrypt.hash(memberPassword, SALT_ROUNDS);

    const admin = await prisma.user.upsert({
      where:  { email: 'admin@example.com' },
      update: { passwordHash: adminHash },
      create: {
        name:         'Admin User',
        email:        'admin@example.com',
        passwordHash: adminHash,
        role:         'ADMIN',
      },
    });

    const member = await prisma.user.upsert({
      where:  { email: 'member@example.com' },
      update: { passwordHash: memberHash },
      create: {
        name:         'Member User',
        email:        'member@example.com',
        passwordHash: memberHash,
        role:         'MEMBER',
      },
    });

    console.log('✅ Seed complete');
    console.log(`   Admin  → id: ${admin.id}  email: ${admin.email}`);
    console.log(`   Member → id: ${member.id}  email: ${member.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
