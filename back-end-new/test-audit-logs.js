import assert from 'node:assert/strict';
import { prisma } from './src/config/prisma.js';
import { createApp } from './src/app.js';
import jwt from 'jsonwebtoken';
import { env } from './src/config/env.js';

console.log('======================================================================');
console.log('           RUNNING TEST-AUDIT-LOGS.JS (SECTION 2.6)                   ');
console.log('======================================================================\n');

async function runTests() {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const admin = await prisma.platformAdminUser.findFirst({
      where: { isActive: true },
    });
    assert.ok(admin, 'Active platform admin required');

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'platform_admin', type: 'platform_admin' },
      env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 1. Test listing audit logs with company and admin included
    console.log('1. Testing GET /api/platform/audit-logs listing...');
    const listRes = await fetch(`${baseUrl}/api/platform/audit-logs?page=1&pageSize=10`, { headers });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(listBody.success);
    assert.ok(Array.isArray(listBody.data.items));
    if (listBody.data.items.length > 0) {
      const first = listBody.data.items[0];
      assert.ok(first.adminUser, 'adminUser must be included');
      assert.ok('company' in first, 'company must be selected/included in audit logs');
    }
    console.log('✓ Audit logs list returns items with adminUser and company.');

    // 2. Test date range filtering
    console.log('\n2. Testing date range filtering...');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dateRes = await fetch(
      `${baseUrl}/api/platform/audit-logs?startDate=${yesterday.toISOString()}&endDate=${now.toISOString()}`,
      { headers }
    );
    assert.equal(dateRes.status, 200);
    console.log('✓ Valid date range filter returns 200.');

    // Invalid date range should throw 400
    const invalidDateRes = await fetch(
      `${baseUrl}/api/platform/audit-logs?startDate=${now.toISOString()}&endDate=${yesterday.toISOString()}`,
      { headers }
    );
    assert.equal(invalidDateRes.status, 400, 'startDate after endDate must return 400');
    console.log('✓ Inverted date range returns 400 as expected.');

    // 3. Test free text search
    console.log('\n3. Testing free text search (q)...');
    const searchRes = await fetch(`${baseUrl}/api/platform/audit-logs?q=admin`, { headers });
    assert.equal(searchRes.status, 200);
    console.log('✓ Free text search returns 200.');

    // 4. Test export endpoint
    console.log('\n4. Testing GET /api/platform/audit-logs/export...');
    const exportRes = await fetch(`${baseUrl}/api/platform/audit-logs/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(exportRes.status, 200);
    assert.equal(exportRes.headers.get('content-type'), 'text/csv; charset=utf-8');
    const csvContent = await exportRes.text();
    assert.ok(csvContent.startsWith('ID,Timestamp,Admin Name'), 'CSV header must be present');

    // Verify audit log row for audit.export was written
    const exportAudit = await prisma.platformAuditLog.findFirst({
      where: { action: 'audit.export' },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(exportAudit, 'audit.export action must be recorded in PlatformAuditLog');
    console.log('✓ CSV export generated and audited with audit.export row.');

    console.log('\n======================================================================');
    console.log('           ALL AUDIT LOG BACKEND TESTS PASSED (100%)!                ');
    console.log('======================================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
