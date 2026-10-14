import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './src/config/prisma.js';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';

console.log('======================================================================');
console.log('         RUNNING TEST-STEP10.JS (PLATFORM ADMIN SESSION HANDLING)      ');
console.log('======================================================================\n');

async function runSessionTests() {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testEmail = `admin_session_test_${Date.now()}@platform.com`;
  const initialPassword = 'InitialPassword123!';
  const initialPasswordHash = await bcrypt.hash(initialPassword, 10);

  // Create isolated platform admin for this test run
  const admin = await prisma.platformAdminUser.create({
    data: {
      email: testEmail,
      passwordHash: initialPasswordHash,
      fullName: 'Session Test Administrator',
      isActive: true,
    },
  });

  try {
    // -----------------------------------------------------------------------
    // 1. LOGIN WITH COOKIE AND EXPIRY
    // -----------------------------------------------------------------------
    console.log('1. Testing Platform Admin login & httpOnly cookie issuance...');
    const loginRes = await fetch(`${baseUrl}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });

    assert.equal(loginRes.status, 200, 'Login should succeed with status 200');
    const loginBody = await loginRes.json();
    const token1 = loginBody.data.token;
    assert.ok(token1, 'Token must be present in body');

    // Check Set-Cookie header
    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(setCookieHeader, 'Set-Cookie header must be present on login');
    assert.ok(setCookieHeader.includes('HttpOnly'), 'Cookie must have HttpOnly');
    assert.ok(setCookieHeader.includes('SameSite=Strict'), 'Cookie must have SameSite=Strict');
    assert.ok(setCookieHeader.includes('Path=/api/platform'), 'Cookie path must be /api/platform');
    console.log('✓ Login issued valid token and httpOnly cookie with strict flags.');

    // -----------------------------------------------------------------------
    // 2. AUTHENTICATION VIA COOKIE & VIA BEARER
    // -----------------------------------------------------------------------
    console.log('\n2. Testing authentication via Cookie and Bearer header...');

    // Via Bearer header
    const meBearerRes = await fetch(`${baseUrl}/api/platform/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.equal(meBearerRes.status, 200, 'Auth via Bearer header should succeed');

    // Via Cookie header
    const meCookieRes = await fetch(`${baseUrl}/api/platform/auth/me`, {
      headers: { Cookie: `token=${token1}` },
    });
    assert.equal(meCookieRes.status, 200, 'Auth via httpOnly Cookie should succeed');
    console.log('✓ Both Bearer header and Cookie authentication succeeded.');

    // -----------------------------------------------------------------------
    // 3. EXPIRED TOKEN REJECTION
    // -----------------------------------------------------------------------
    console.log('\n3. Testing expired token rejection...');
    const expiredToken = jwt.sign(
      {
        sub: admin.id,
        role: 'platform_admin',
        type: 'platform_admin',
        email: admin.email,
      },
      env.JWT_SECRET,
      { expiresIn: '-10s' }
    );

    const expiredRes = await fetch(`${baseUrl}/api/platform/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert.equal(expiredRes.status, 401, 'Expired token must return 401');
    console.log('✓ Expired token rejected with 401.');

    // -----------------------------------------------------------------------
    // 4. CHANGE PASSWORD VALIDATIONS
    // -----------------------------------------------------------------------
    console.log('\n4. Testing change-password validations (wrong current, weak new, same password)...');

    // 4a. Wrong current password
    const wrongCurrentRes = await fetch(`${baseUrl}/api/platform/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword123!',
        newPassword: 'BrandNewSecurePassword123!',
      }),
    });
    assert.equal(wrongCurrentRes.status, 401, 'Wrong current password must return 401');

    // 4b. Weak new password (< 10 chars)
    const weakNewRes = await fetch(`${baseUrl}/api/platform/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: 'short',
      }),
    });
    assert.equal(weakNewRes.status, 400, 'Weak new password must return 400');

    // 4c. Same password
    const samePasswordRes = await fetch(`${baseUrl}/api/platform/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword: initialPassword,
      }),
    });
    assert.equal(samePasswordRes.status, 400, 'Same password must return 400');
    console.log('✓ All change-password validation checks passed.');

    // -----------------------------------------------------------------------
    // 5. SUCCESSFUL PASSWORD CHANGE & SESSION REVOCATION
    // -----------------------------------------------------------------------
    console.log('\n5. Testing successful password change & old token revocation...');
    const newPassword = 'BrandNewSecurePassword456!';

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 1100));

    const changeRes = await fetch(`${baseUrl}/api/platform/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword,
      }),
    });

    assert.equal(changeRes.status, 200, 'Password change must succeed with 200');
    const changeBody = await changeRes.json();
    const token2 = changeBody.data.token;
    assert.ok(token2, 'New fresh token must be returned');

    // 5a. Verify old token is now REJECTED
    const oldTokenRes = await fetch(`${baseUrl}/api/platform/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert.equal(oldTokenRes.status, 401, 'Old token must be rejected after password change');
    const oldTokenBody = await oldTokenRes.json();
    assert.ok(
      oldTokenBody.message.includes('password change') || oldTokenBody.message.includes('expired'),
      'Error message must reflect password change revocation'
    );

    // 5b. Verify new token is ACCEPTED
    const newTokenRes = await fetch(`${baseUrl}/api/platform/auth/me`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert.equal(newTokenRes.status, 200, 'New token must be accepted');

    // 5c. Verify Audit Log was written for admin.password_change
    const auditLogs = await prisma.platformAuditLog.findMany({
      where: {
        adminUserId: admin.id,
        action: 'admin.password_change',
      },
    });
    assert.equal(auditLogs.length, 1, 'Audit log row must be written for password change');
    assert.equal(auditLogs[0].before, null);
    assert.ok(auditLogs[0].after?.changedAt !== undefined);
    // Ensure no password in payload
    assert.equal(auditLogs[0].after?.password, undefined);
    assert.equal(auditLogs[0].after?.newPassword, undefined);
    console.log('✓ Old token rejected, new token accepted, and audit entry verified.');

    // -----------------------------------------------------------------------
    // 6. LOGOUT & COOKIE CLEARING
    // -----------------------------------------------------------------------
    console.log('\n6. Testing POST /api/platform/auth/logout...');
    const logoutRes = await fetch(`${baseUrl}/api/platform/auth/logout`, {
      method: 'POST',
    });
    assert.equal(logoutRes.status, 200, 'Logout should return 200');
    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert.ok(logoutCookie, 'Set-Cookie should be returned on logout');
    assert.ok(
      logoutCookie.includes('token=;') || logoutCookie.includes('Max-Age=0') || logoutCookie.includes('Expires='),
      'Logout must clear the cookie'
    );
    console.log('✓ Logout endpoint cleared the cookie.');

  } finally {
    server.close();
    // Cleanup test admin user
    await prisma.platformAuditLog.deleteMany({ where: { adminUserId: admin.id } });
    await prisma.platformAdminUser.delete({ where: { id: admin.id } });
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log('           ALL TEST-STEP10.JS TESTS PASSED SUCCESSFULLY!              ');
  console.log('======================================================================');
}

runSessionTests().catch((err) => {
  console.error('\n[SESSION TEST FAILURE]:', err);
  process.exit(1);
});
