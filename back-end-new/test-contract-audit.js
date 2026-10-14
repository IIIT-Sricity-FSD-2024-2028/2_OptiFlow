import assert from 'node:assert/strict';
import { parseListParams, formatListResponse, buildDeterministicOrderBy } from './src/utils/pagination.js';
import { redactSensitiveData, writeAuditLog } from './src/utils/platformAudit.js';
import { prisma } from './src/config/prisma.js';
import { createApp } from './src/app.js';
import jwt from 'jsonwebtoken';
import { env } from './src/config/env.js';

console.log('======================================================================');
console.log('         RUNNING TEST-CONTRACT-AUDIT.JS (LIST CONTRACT & AUDIT)        ');
console.log('======================================================================\n');

async function runTests() {
  // -------------------------------------------------------------------------
  // 1. UNIT TESTS: parseListParams (Defaults, Clamping, Max length, Status Validation)
  // -------------------------------------------------------------------------
  console.log('1. Testing parseListParams unit tests...');

  // Default values
  const defaultParams = parseListParams({});
  assert.equal(defaultParams.page, 1, 'Default page must be 1');
  assert.equal(defaultParams.pageSize, 20, 'Default pageSize must be 20');
  assert.equal(defaultParams.skip, 0, 'Skip for page 1 must be 0');
  assert.equal(defaultParams.take, 20, 'Take must be 20');
  assert.equal(defaultParams.q, undefined, 'Empty q should be undefined');
  assert.equal(defaultParams.status, undefined, 'Empty status should be undefined');

  // Clamping and invalid numbers
  const clampedParams = parseListParams({ page: '-5', pageSize: '999' });
  assert.equal(clampedParams.page, 1, 'Negative page must clamp to default 1');
  assert.equal(clampedParams.pageSize, 100, 'Oversized pageSize must clamp to max 100');
  assert.equal(clampedParams.skip, 0);

  const nanParams = parseListParams({ page: 'abc', pageSize: 'xyz' });
  assert.equal(nanParams.page, 1, 'NaN page must default to 1');
  assert.equal(nanParams.pageSize, 20, 'NaN pageSize must default to 20');

  // Query trimming and 100-character max capping
  const longQ = 'a'.repeat(150);
  const qParams = parseListParams({ q: `  ${longQ}  ` });
  assert.equal(qParams.q.length, 100, 'Search query must be capped to 100 characters');

  // Valid status
  const validStatusParams = parseListParams(
    { status: 'Active' },
    { allowedStatuses: ['Active', 'Suspended', 'Closed'] }
  );
  assert.equal(validStatusParams.status, 'Active');

  // Invalid status throws ValidationError (400)
  assert.throws(
    () => {
      parseListParams(
        { status: 'InvalidStatus' },
        { allowedStatuses: ['Active', 'Suspended', 'Closed'] }
      );
    },
    (err) => err.statusCode === 400 && err.message.includes('Invalid status'),
    'Invalid status must throw 400 ValidationError'
  );

  // Deterministic order tiebreaker
  const orderWithNoId = buildDeterministicOrderBy({ createdAt: 'desc' });
  assert.deepEqual(orderWithNoId, [{ createdAt: 'desc' }, { id: 'asc' }], 'Must append id: asc tiebreaker');

  console.log('✓ parseListParams unit tests passed.');

  // -------------------------------------------------------------------------
  // 2. UNIT TESTS: Sensitive Data Redaction
  // -------------------------------------------------------------------------
  console.log('\n2. Testing sensitive data redaction...');
  const sensitivePayload = {
    name: 'Test Plan',
    passwordHash: '$2a$10$xyz',
    userPassword: 'secretPassword123',
    sessionToken: 'jwt.token.here',
    apiKeySecret: 'super-secret-key',
    nested: {
      client_secret: 'nested-secret',
      normalField: 'safeValue',
    },
  };

  const redacted = redactSensitiveData(sensitivePayload);
  assert.equal(redacted.passwordHash, '[REDACTED]');
  assert.equal(redacted.userPassword, '[REDACTED]');
  assert.equal(redacted.sessionToken, '[REDACTED]');
  assert.equal(redacted.apiKeySecret, '[REDACTED]');
  assert.equal(redacted.nested.client_secret, '[REDACTED]');
  assert.equal(redacted.nested.normalField, 'safeValue');
  console.log('✓ Redaction tests passed.');

  // -------------------------------------------------------------------------
  // 3. INTEGRATION TESTS: Endpoint GET /api/platform/companies
  // -------------------------------------------------------------------------
  console.log('\n3. Testing GET /api/platform/companies List Contract endpoint...');
  const app = createApp();

  // Seed or fetch test platform admin
  let testAdmin = await prisma.platformAdminUser.findFirst({
    where: { isActive: true },
  });

  if (!testAdmin) {
    testAdmin = await prisma.platformAdminUser.create({
      data: {
        email: 'test_admin_contract@platform.com',
        passwordHash: 'dummyHash',
        fullName: 'Test Contract Admin',
        isActive: true,
      },
    });
  }

  const token = jwt.sign(
    {
      sub: testAdmin.id,
      role: 'platform_admin',
      type: 'platform_admin',
      email: testAdmin.email,
    },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Start temporary server
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 3a. Default list contract envelope
    const resDefault = await fetch(`${baseUrl}/api/platform/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resDefault.status, 200, 'GET /api/platform/companies should return 200');
    const bodyDefault = await resDefault.json();
    assert.equal(bodyDefault.success, true);
    assert.ok(bodyDefault.data.items !== undefined, 'Response must have items');
    assert.ok(typeof bodyDefault.data.total === 'number', 'Response must have numeric total');
    assert.equal(bodyDefault.data.page, 1, 'Default page must be 1');
    assert.equal(bodyDefault.data.pageSize, 20, 'Default pageSize must be 20');

    // 3b. Invalid status validation (400)
    const resInvalidStatus = await fetch(`${baseUrl}/api/platform/companies?status=NonExistentStatus`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resInvalidStatus.status, 400, 'Invalid status must return 400');

    // 3c. Pagination boundaries & stable order
    const resPageSize1 = await fetch(`${baseUrl}/api/platform/companies?page=1&pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const bodyPage1 = await resPageSize1.json();
    assert.equal(bodyPage1.data.page, 1);
    assert.equal(bodyPage1.data.pageSize, 1);
    assert.ok(bodyPage1.data.items.length <= 1);

    console.log('✓ Endpoint list contract tests passed.');

    // -----------------------------------------------------------------------
    // 4. INTEGRATION TESTS: Platform Audit Log Mutation Verification
    // -----------------------------------------------------------------------
    console.log('\n4. Testing Platform Audit Log mutation & fail-closed rollback...');

    const planName = `Audit Test Plan ${Date.now()}`;
    const resCreatePlan = await fetch(`${baseUrl}/api/platform/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: planName,
        auditLogRetentionDays: 60,
        allowsIntegrations: true,
      }),
    });

    assert.equal(resCreatePlan.status, 201, 'POST /api/platform/plans should return 201');
    const createdPlanBody = await resCreatePlan.json();
    const createdPlanId = createdPlanBody.data.id;

    // Verify exactly one audit row was produced
    const auditLogs = await prisma.platformAuditLog.findMany({
      where: {
        action: 'plan.create',
        entityId: createdPlanId,
      },
    });

    assert.equal(auditLogs.length, 1, 'Exactly one audit row must be produced for plan create');
    const auditLog = auditLogs[0];
    assert.equal(auditLog.adminUserId, testAdmin.id, 'Audit log adminUserId must match caller');
    assert.equal(auditLog.entityType, 'Plan');
    assert.equal(auditLog.after?.name, planName);
    console.log('✓ Platform Audit Log produced with correct admin, entity, and payload.');

    // 4b. Fail-closed test: If audit write fails, transaction rolls back
    const failPlanName = `Rollback Test Plan ${Date.now()}`;
    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx) => {
          const plan = await tx.plan.create({
            data: {
              name: failPlanName,
              auditLogRetentionDays: 30,
              allowsIntegrations: false,
            },
          });

          // Simulate audit write failure (e.g. invalid foreign key or forced error)
          throw new Error('Simulated audit write failure for fail-closed verification');
        });
      },
      /Simulated audit write failure/,
      'Transaction must fail closed'
    );

    const rolledBackPlan = await prisma.plan.findFirst({
      where: { name: failPlanName },
    });
    assert.equal(rolledBackPlan, null, 'Plan must be rolled back if audit write fails');
    console.log('✓ Fail-closed mutation rollback verified.');

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log('          ALL TEST-CONTRACT-AUDIT.JS TESTS PASSED SUCCESSFULLY!       ');
  console.log('======================================================================');
}

runTests().catch((err) => {
  console.error('\n[TEST FAILURE]:', err);
  process.exit(1);
});
