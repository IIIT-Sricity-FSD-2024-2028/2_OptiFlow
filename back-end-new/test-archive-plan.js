import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { prisma } from './src/config/prisma.js';
import { env } from './src/config/env.js';
import { createApp } from './src/app.js';

async function runArchivePlanTests() {
  console.log('======================================================================');
  console.log('         RUNNING TEST-ARCHIVE-PLAN.JS (PLAN ARCHIVE & GUARDS)         ');
  console.log('======================================================================\n');

  // 1. Get or create a platform admin user for authenticated requests
  let admin = await prisma.platformAdminUser.findFirst({
    where: { isActive: true },
  });

  if (!admin) {
    admin = await prisma.platformAdminUser.create({
      data: {
        email: `archive-test-admin-${Date.now()}@optiflow.io`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
        fullName: 'Archive Test Admin',
        isActive: true,
      },
    });
  }

  const token = jwt.sign(
    {
      sub: admin.id,
      role: 'platform_admin',
      type: 'platform_admin',
      email: admin.email,
    },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let createdPlanId = null;

  try {
    // 2. Create a new test plan
    console.log('1. Creating a test plan...');
    const createRes = await fetch(`${baseUrl}/api/platform/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `Archive Target Plan ${Date.now()}`,
        auditLogRetentionDays: 90,
        allowsIntegrations: false,
      }),
    });

    assert.equal(createRes.status, 201, 'POST /api/platform/plans must return 201');
    const createData = await createRes.json();
    assert.equal(createData.success, true);
    assert.equal(createData.data.isActive, true, 'New plan must default to isActive = true');
    createdPlanId = createData.data.id;
    console.log('✓ Test plan created with isActive = true.');

    // 3. Archive the plan via PATCH
    console.log('\n2. Archiving the plan via PATCH /api/platform/plans/:id with { isActive: false }...');
    const archiveRes = await fetch(`${baseUrl}/api/platform/plans/${createdPlanId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: false }),
    });

    assert.equal(archiveRes.status, 200, 'PATCH /api/platform/plans/:id must return 200');
    const archiveData = await archiveRes.json();
    assert.equal(archiveData.success, true);
    assert.equal(archiveData.data.isActive, false, 'Plan isActive must now be false');
    console.log('✓ Plan successfully marked as isActive = false.');

    // 4. Verify audit log entry
    console.log('\n3. Verifying PlatformAuditLog action plan.archive...');
    const auditLogs = await prisma.platformAuditLog.findMany({
      where: {
        entityId: createdPlanId,
        action: 'plan.archive',
      },
    });

    assert.equal(auditLogs.length, 1, 'Exactly one plan.archive audit log must be recorded');
    assert.equal(auditLogs[0].adminUserId, admin.id);
    assert.equal(auditLogs[0].entityType, 'Plan');
    assert.equal(auditLogs[0].after?.isActive, false);
    console.log('✓ Fail-closed PlatformAuditLog verified for plan.archive.');

    // 5. Test guard: Cannot assign archived plan to subscription
    console.log('\n4. Verifying subscription guard against archived plan...');
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: { legalName: `Test Company ${Date.now()}` },
      });
    }

    const subRes = await fetch(`${baseUrl}/api/platform/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        companyId: company.id,
        planId: createdPlanId,
        billingCycle: 'Monthly',
      }),
    });

    assert.equal(subRes.status, 400, 'Subscription on archived plan must return 400 Bad Request');
    const subData = await subRes.json();
    assert.match(
      subData.message || subData.error || '',
      /archived plan/i,
      'Error message must state cannot assign archived plan'
    );
    console.log('✓ Guard verified: Archived plan assignment rejected with 400.');

    // 6. Test list filtering
    console.log('\n5. Verifying list filtering by isActive...');
    const listActiveRes = await fetch(`${baseUrl}/api/platform/plans?isActive=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listActiveData = await listActiveRes.json();
    const activeItems = listActiveData.data;
    assert.ok(
      !activeItems.some((p) => p.id === createdPlanId),
      'Archived plan must not appear in isActive=true query'
    );

    const listAllRes = await fetch(`${baseUrl}/api/platform/plans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listAllData = await listAllRes.json();
    const allItems = listAllData.data;
    assert.ok(
      allItems.some((p) => p.id === createdPlanId && p.isActive === false),
      'Archived plan must appear in complete list with isActive=false'
    );
    console.log('✓ List queries properly respect and reflect isActive status.');

    // 6. Test Unarchive
    console.log('\n6. Unarchiving the plan via PATCH /api/platform/plans/:id with { isActive: true }...');
    const unarchiveRes = await fetch(`${baseUrl}/api/platform/plans/${createdPlanId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: true }),
    });

    assert.equal(unarchiveRes.status, 200, 'Unarchive must return 200');
    const unarchiveData = await unarchiveRes.json();
    assert.equal(unarchiveData.data.isActive, true, 'Plan isActive must now be true');

    const unarchiveAuditLogs = await prisma.platformAuditLog.findMany({
      where: {
        entityId: createdPlanId,
        action: 'plan.unarchive',
      },
    });
    assert.equal(unarchiveAuditLogs.length, 1, 'Exactly one plan.unarchive audit log must be recorded');
    console.log('✓ Unarchive verified: Plan is active and plan.unarchive audit log recorded.');

    console.log('\n======================================================================');
    console.log('          ALL TEST-ARCHIVE-PLAN.JS TESTS PASSED SUCCESSFULLY!          ');
    console.log('======================================================================\n');
  } finally {
    server.close();
    // Cleanup created test records
    if (createdPlanId) {
      await prisma.platformAuditLog.deleteMany({
        where: { entityId: createdPlanId },
      });
      await prisma.plan.delete({
        where: { id: createdPlanId },
      }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runArchivePlanTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
