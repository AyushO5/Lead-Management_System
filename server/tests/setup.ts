// tests/setup.ts
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// ── Step 1: Load .env.test BEFORE anything else ───────────────────────────────
dotenv.config({ path: '.env.test' });

// ── Step 2: Force NODE_ENV to 'test' ─────────────────────────────────────────
process.env.NODE_ENV = 'test';

// ── Step 3: Validate TEST_DATABASE_URL exists ─────────────────────────────────
const rawTestUrl = process.env.TEST_DATABASE_URL;
if (!rawTestUrl) {
  throw new Error('TEST_DATABASE_URL is not defined in .env.test');
}

// ── Step 4: Parse and validate the URL (no credentials logged) ────────────────
let parsedTestUrl: URL;
try {
  parsedTestUrl = new URL(rawTestUrl);
} catch {
  throw new Error('TEST_DATABASE_URL is not a valid URL');
}

const dbName   = parsedTestUrl.pathname.replace(/^\//, '').split('?')[0];
const dbHost   = parsedTestUrl.hostname;
const dbPort   = parsedTestUrl.port || '5432';

if (dbName !== 'lead_management_test') {
  throw new Error(`Safety check failed: expected database "lead_management_test", got "${dbName}"`);
}
if (dbHost !== 'localhost') {
  throw new Error(`Safety check failed: expected host "localhost", got "${dbHost}"`);
}
if (dbPort !== '5433') {
  throw new Error(`Safety check failed: expected port "5433", got "${dbPort}"`);
}

// Safe to log – no credentials
console.log(`Test database verified: database=${dbName} host=${dbHost} port=${dbPort}`);

// ── Step 5: Apply migrations to the test database ────────────────────────────
console.log('Applying migrations to test database...');
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: rawTestUrl },
});

// ── Step 6: Dynamically import Prisma AFTER env is set ───────────────────────
const { prisma } = await import('../src/lib/prisma');

// ── Step 7: Verify actual DB connection via SQL (no private internals) ────────
const result = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
const connectedDb = result[0]?.current_database;
if (connectedDb !== 'lead_management_test') {
  await prisma.$disconnect();
  throw new Error(
    `Safety check failed: Prisma is connected to "${connectedDb}" instead of "lead_management_test". Aborting.`
  );
}

console.log(`Prisma connection confirmed: database=${connectedDb}`);

// ── Lifecycle hooks ───────────────────────────────────────────────────────────
afterAll(async () => {
  await prisma.$disconnect();
});
