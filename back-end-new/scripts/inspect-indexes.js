import { prisma } from '../src/config/prisma.js';

async function main() {
  const indexes = await prisma.$queryRaw`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename IN ('companies', 'subscriptions', 'platform_audit_logs', 'platform_admin_users')
    ORDER BY tablename, indexname;
  `;
  console.log(JSON.stringify(indexes, null, 2));

  const explainCompanies = await prisma.$queryRaw`
    EXPLAIN SELECT * FROM companies WHERE status = 'Active';
  `;
  console.log('EXPLAIN Companies status:');
  explainCompanies.forEach(r => console.log(r['QUERY PLAN']));

  const explainSubs = await prisma.$queryRaw`
    EXPLAIN SELECT * FROM subscriptions WHERE status = 'Active' AND "currentPeriodEnd" > NOW();
  `;
  console.log('\nEXPLAIN Subscriptions status + periodEnd:');
  explainSubs.forEach(r => console.log(r['QUERY PLAN']));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
