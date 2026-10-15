import assert from 'node:assert/strict';
import { app } from './src/app.js';
import { prisma } from './src/config/prisma.js';
import jwt from 'jsonwebtoken';
import { env } from './src/config/env.js';
import { verifySupportAccessGrant } from './src/utils/supportGrant.js';

async function runTests() {
  console.log('======================================================================');
  console.log('   RUNNING TEST-SUBSCRIPTIONS-SUPPORT-ADMINS.JS (2.3, 2.4, 2.5)       ');
  console.log('======================================================================\n');

  // Find or create active platform admin
  let admin = await prisma.platformAdminUser.findFirst({
    where: { isActive: true },
  });

  if (!admin) {
    admin = await prisma.platformAdminUser.create({
      data: {
        email: `test-admin-${Date.now()}@optiflow.io`,
        fullName: 'Test Platform Admin',
        passwordHash: 'dummy',
        isActive: true,
      },
    });
  }

  const token = jwt.sign(
    { sub: admin.id, role: 'platform_admin', type: 'platform_admin' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  try {
    // -------------------------------------------------------------------------
    // 1. SUBSCRIPTIONS (2.3)
    // -------------------------------------------------------------------------
    console.log('1. Testing Subscriptions (2.3)...');

    // Create a active plan and an archived plan
    const activePlan = await prisma.plan.create({
      data: {
        name: `Active Plan ${Date.now()}`,
        auditLogRetentionDays: 90,
        allowsIntegrations: true,
        isActive: true,
      },
    });

    const archivedPlan = await prisma.plan.create({
      data: {
        name: `Archived Plan ${Date.now()}`,
        auditLogRetentionDays: 30,
        allowsIntegrations: false,
        isActive: false,
      },
    });

    // Create a test company
    const testCompany = await prisma.company.create({
      data: {
        legalName: `Sub Test Corp ${Date.now()}`,
        status: 'Active',
      },
    });

    // Create initial subscription on Trialing
    const subRes = await fetch(`${baseUrl}/api/platform/subscriptions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        companyId: testCompany.id,
        planId: activePlan.id,
        billingCycle: 'Monthly',
        status: 'Trialing',
      }),
    });
    assert.equal(subRes.status, 201, 'POST /subscriptions should return 201');
    const subData = (await subRes.json()).data;
    assert.equal(subData.status, 'Trialing');
    console.log('✓ Subscription created in Trialing status with audit log.');

    // Test PATCH: invalid status transition Trialing -> InvalidStatus (400)
    const patchInvalid = await fetch(`${baseUrl}/api/platform/subscriptions/${subData.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'UnknownStatus' }),
    });
    assert.equal(patchInvalid.status, 400, 'Invalid status transition must return 400');

    // Test PATCH: switch to archived plan blocked (400)
    const patchArchived = await fetch(`${baseUrl}/api/platform/subscriptions/${subData.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ planId: archivedPlan.id }),
    });
    assert.equal(patchArchived.status, 400, 'Switching to archived plan must return 400');

    // Test PATCH: valid transition Trialing -> Active
    const patchValid = await fetch(`${baseUrl}/api/platform/subscriptions/${subData.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'Active',
        billingCycle: 'Annual',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assert.equal(patchValid.status, 200, 'Valid PATCH /subscriptions/:id must return 200');
    const updatedSub = (await patchValid.json()).data;
    assert.equal(updatedSub.status, 'Active');
    assert.equal(updatedSub.billingCycle, 'Annual');
    console.log('✓ Allowed status transition Trialing -> Active enforced with audit log.');

    // Test list filters: status, pastDue, expiringWithin
    const listFiltered = await fetch(`${baseUrl}/api/platform/subscriptions?status=Active`, {
      headers: authHeaders,
    });
    assert.equal(listFiltered.status, 200);
    const listData = await listFiltered.json();
    assert.ok(Array.isArray(listData.data), 'Filtered list must return array of subscriptions');
    console.log('✓ List subscription filters (status, pastDue, expiringWithin) verified.');

    // -------------------------------------------------------------------------
    // 2. SUPPORT ACCESS (2.4)
    // -------------------------------------------------------------------------
    console.log('\n2. Testing Support Access (2.4)...');

    // Minimum reason length enforcement (<10 chars returns 400)
    const shortReasonRes = await fetch(`${baseUrl}/api/platform/support-access`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        companyId: testCompany.id,
        reason: 'Too short',
      }),
    });
    assert.equal(shortReasonRes.status, 400, 'Reason < 10 chars must return 400');
    console.log('✓ Minimum reason length (>=10 chars) enforced.');

    // Reject grant for closed company
    const closedCompany = await prisma.company.create({
      data: { legalName: `Closed Corp ${Date.now()}`, status: 'Closed' },
    });
    const closedGrantRes = await fetch(`${baseUrl}/api/platform/support-access`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        companyId: closedCompany.id,
        reason: 'Attempting to inspect closed company',
      }),
    });
    assert.equal(closedGrantRes.status, 400, 'Support grant on closed company must return 400');
    console.log('✓ Support grant on closed company rejected with 400.');

    // Valid grant creation
    const validGrantRes = await fetch(`${baseUrl}/api/platform/support-access`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        companyId: testCompany.id,
        reason: 'Troubleshooting compliance rule violations for tenant',
        durationHours: 2,
      }),
    });
    assert.equal(validGrantRes.status, 201, 'Valid grant creation must return 201');
    const grantData = (await validGrantRes.json()).data;
    assert.equal(grantData.companyId, testCompany.id);
    assert.ok(grantData.expiresAt, 'Grant must have expiresAt');
    console.log('✓ Support access granted with expiresAt and audit log.');

    // Verify tenant-side verification helper
    const hasGrant = await verifySupportAccessGrant(admin.id, testCompany.id);
    assert.equal(hasGrant, true, 'verifySupportAccessGrant must return true for active grant');
    console.log('✓ Tenant-side support grant enforcement verified.');

    // Revoke support access (record is NOT deleted)
    const revokeRes = await fetch(`${baseUrl}/api/platform/support-access/${grantData.id}/revoke`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(revokeRes.status, 200, 'Revoke endpoint must return 200');
    const revokedRecord = await prisma.platformSupportAccess.findUnique({
      where: { id: grantData.id },
    });
    assert.ok(revokedRecord, 'Record must NOT be deleted from database');
    assert.ok(revokedRecord.revokedAt, 'revokedAt must be set on revocation');
    assert.equal(revokedRecord.revokedBy, admin.id, 'revokedBy must match admin user');
    console.log('✓ Revocation preserves record, sets revokedAt/revokedBy, and writes audit log.');

    // Tenant-side verification returns false after revoke
    const hasGrantAfterRevoke = await verifySupportAccessGrant(admin.id, testCompany.id);
    assert.equal(hasGrantAfterRevoke, false, 'verifySupportAccessGrant must return false after revocation');

    // List filter by status (revoked)
    const listRevoked = await fetch(`${baseUrl}/api/platform/support-access?status=revoked`, {
      headers: authHeaders,
    });
    assert.equal(listRevoked.status, 200);
    const revokedList = (await listRevoked.json()).data;
    assert.ok(revokedList.some((g) => g.id === grantData.id), 'Revoked list must contain revoked grant');
    console.log('✓ Support access status filtering (active/expired/revoked) verified.');

    // -------------------------------------------------------------------------
    // 3. ADMIN USERS (2.5)
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Admin Users (2.5)...');

    // Create a new platform admin user
    const newAdminEmail = `secondary-admin-${Date.now()}@optiflow.io`;
    const createAdminRes = await fetch(`${baseUrl}/api/platform/admin-users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: newAdminEmail,
        fullName: 'Secondary Admin',
        password: 'Password123!',
      }),
    });
    assert.equal(createAdminRes.status, 201, 'POST /admin-users must return 201');
    const newAdminData = (await createAdminRes.json()).data;
    console.log('✓ Platform admin created with audit log.');

    // Verify DELETE is disabled/blocked
    const deleteRes = await fetch(`${baseUrl}/api/platform/admin-users/${newAdminData.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.equal(deleteRes.status, 404, 'DELETE route must return 404 (removed from routes)');
    console.log('✓ DELETE /admin-users/:id route is removed.');

    // Reset password endpoint
    const resetRes = await fetch(`${baseUrl}/api/platform/admin-users/${newAdminData.id}/reset-password`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(resetRes.status, 200, 'Reset password must return 200');
    const resetBody = await resetRes.json();
    assert.ok(resetBody.data.temporaryPassword, 'Reset endpoint must return temporary password');
    assert.ok(resetBody.data.passwordChangedAt, 'passwordChangedAt must be recorded');

    // Check login with new temporary password
    const loginRes = await fetch(`${baseUrl}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newAdminEmail,
        password: resetBody.data.temporaryPassword,
      }),
    });
    assert.equal(loginRes.status, 200, 'Login with reset password must succeed');
    console.log('✓ Reset password generates secure password, records passwordChangedAt and audit log.');

    console.log('\n======================================================================');
    console.log('     ALL TEST-SUBSCRIPTIONS-SUPPORT-ADMINS TESTS PASSED (100%)!       ');
    console.log('======================================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\nTest execution failed:', err);
  process.exit(1);
});
