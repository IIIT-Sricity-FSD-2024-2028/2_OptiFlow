import { execSync } from 'node:child_process';
import { prisma } from '../src/config/prisma.js';
import bcrypt from 'bcryptjs';

export function assertTestDatabase(databaseUrl) {
  const url = databaseUrl || process.env.DATABASE_URL || '';
  if (!url) {
    throw new Error('[SAFETY ERROR] DATABASE_URL is not set.');
  }

  // Parse DB name from URL: e.g. postgresql://user:pass@host:port/dbname?schema=public
  const parsed = new URL(url);
  const dbName = parsed.pathname.replace(/^\//, '').toLowerCase();

  if (!dbName.includes('test')) {
    throw new Error(
      `[SAFETY FATAL] Refusing to run tests! Database name "${dbName}" does NOT contain "test". URL: ${url}`
    );
  }

  return dbName;
}

export async function setupTestDatabase() {
  console.log('--- Test Database Setup ---');
  const dbName = assertTestDatabase(process.env.DATABASE_URL);
  console.log(`[Safety Check Passed] Database "${dbName}" verified as safe test database.`);

  console.log('[Migrations] Deploying migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });

  console.log('[Seeding] Seeding minimal test data (Platform Admin)...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.platformAdminUser.upsert({
    where: { email: 'admin@platform.com' },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: 'admin@platform.com',
      passwordHash,
      fullName: 'Global Platform Administrator',
      isActive: true,
    },
  });

  console.log(`[Seeding Complete] Platform Admin ready: ${admin.email}`);
  await prisma.$disconnect();
}

// Run directly if invoked as a script
if (process.argv[1]?.endsWith('setup-test-db.js')) {
  setupTestDatabase().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
