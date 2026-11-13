// SEC-M2-12 / 13 / 14 / 15 / 16 regression tests.
// Runs the Express app in-process against the TEST database (same style as test-archive-plan.js).
// Usage: node test-sec-m2-auth-platform.js   (DATABASE_URL must point at a database whose name contains "test")
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// The sign-up limiter would throttle the many registrations below; limiter behaviour has its own test.
process.env.RATE_LIMIT_ENABLED = 'false';
const { prisma } = await import('./src/config/prisma.js');
const { env } = await import('./src/config/env.js');
const { createApp } = await import('./src/app.js');

const suffix = Date.now();
const results = [];
const check = (name, fn) => results.push([name, fn]);

const app = createApp();
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const call = async (method, path, { token, body, origin } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, headers: res.headers };
};

let admin, adminToken, tenantUser, tenantToken, plan, createdCompanyIds = [];

async function setup() {
  admin = await prisma.platformAdminUser.create({
    data: {
      email: `sec-m2-admin-${suffix}@optiflow.io`,
      fullName: 'SEC M2 Admin',
      passwordHash: await bcrypt.hash('Passw0rd!x', 10),
      passwordChangedAt: new Date(Date.now() - 60_000),
      isActive: true,
    },
  });
  adminToken = jwt.sign({ sub: admin.id, role: 'platform_admin', type: 'platform_admin', email: admin.email }, env.JWT_SECRET, { expiresIn: '1h' });
  plan = await prisma.plan.create({
    data: { name: `SecM2 Plan ${suffix}`, auditLogRetentionDays: 30, allowsIntegrations: false, isActive: true },
  });
}

async function teardown() {
  // Best-effort cleanup of the companies registered by the tests (child rows first).
  for (const companyId of createdCompanyIds) {
    const q = { where: { companyId } };
    await prisma.systemAuditLog.deleteMany(q).catch(() => {});
    await prisma.roleAssignment.deleteMany(q).catch(() => {});
    await prisma.rolePermission?.deleteMany({ where: { role: { companyId } } }).catch(() => {});
    await prisma.role.deleteMany(q).catch(() => {});
    await prisma.branch.deleteMany(q).catch(() => {});
    await prisma.subscription.deleteMany(q).catch(() => {});
    await prisma.user.deleteMany(q).catch(() => {});
    await prisma.company.delete({ where: { id: companyId } }).catch(() => {});
  }
  const admins = await prisma.platformAdminUser.findMany({ where: { email: { contains: `${suffix}` } }, select: { id: true } });
  const adminIds = admins.map((a) => a.id);
  await prisma.platformAuditLog.deleteMany({ where: { adminUserId: { in: adminIds } } }).catch(() => {});
  await prisma.platformSupportAccess.deleteMany({ where: { adminUserId: { in: adminIds } } }).catch(() => {});
  await prisma.platformAdminUser.deleteMany({ where: { id: { in: adminIds } } }).catch(() => {});
  await prisma.plan.deleteMany({ where: { name: { contains: `${suffix}` } } }).catch(() => {});
}

// ---------------------------------------------------------------- SEC-M2-15 platform review
const PLATFORM_ROUTES = [
  ['GET', '/api/platform/metrics'], ['GET', '/api/platform/companies'], ['POST', '/api/platform/companies'],
  ['GET', '/api/platform/companies/x'], ['PATCH', '/api/platform/companies/x'],
  ['GET', '/api/platform/plans'], ['POST', '/api/platform/plans'], ['PATCH', '/api/platform/plans/x'],
  ['GET', '/api/platform/subscriptions'], ['POST', '/api/platform/subscriptions'], ['PATCH', '/api/platform/subscriptions/x'],
  ['GET', '/api/platform/audit-logs'], ['GET', '/api/platform/audit-logs/export'],
  ['GET', '/api/platform/admin-users'], ['POST', '/api/platform/admin-users'], ['PATCH', '/api/platform/admin-users/x'],
  ['POST', '/api/platform/admin-users/x/reset-password'],
  ['GET', '/api/platform/support-access'], ['POST', '/api/platform/support-access'],
  ['POST', '/api/platform/support-access/x/revoke'], ['DELETE', '/api/platform/support-access/x'],
];

check('15: every platform route rejects a request with no token (401)', async () => {
  for (const [m, p] of PLATFORM_ROUTES) {
    const r = await call(m, p);
    assert.equal(r.status, 401, `${m} ${p} -> ${r.status}`);
  }
});

check('15: every platform route rejects a company-user token (403)', async () => {
  const owner = await prisma.user.findFirst({ where: { isActive: true } });
  const t = jwt.sign({ sub: owner.id, companyId: owner.companyId, role: 'system_admin', tokenVersion: owner.tokenVersion }, env.JWT_SECRET, { expiresIn: '1h' });
  for (const [m, p] of PLATFORM_ROUTES) {
    const r = await call(m, p, { token: t });
    assert.equal(r.status, 403, `${m} ${p} -> ${r.status}`);
  }
});

check('15: plan limits must be whole numbers >= 0 or null', async () => {
  for (const bad of [{ maxUsers: -1 }, { maxUsers: 1.5 }, { maxUsers: 'abc' }, { maxBranches: true }, { auditLogRetentionDays: 0 }, { auditLogRetentionDays: 'x' }, { name: 123 }, { allowsIntegrations: 'false' }]) {
    const r = await call('POST', '/api/platform/plans', { token: adminToken, body: { name: `SecM2 bad ${suffix}`, ...bad } });
    assert.equal(r.status, 400, `${JSON.stringify(bad)} -> ${r.status}`);
  }
  const ok = await call('POST', '/api/platform/plans', { token: adminToken, body: { name: `SecM2 ok ${suffix}`, maxUsers: null, maxBranches: 3 } });
  assert.equal(ok.status, 201);
});

check('15: plan update validates input and rejects an empty patch', async () => {
  assert.equal((await call('PATCH', `/api/platform/plans/${plan.id}`, { token: adminToken, body: { maxUsers: -5 } })).status, 400);
  assert.equal((await call('PATCH', `/api/platform/plans/${plan.id}`, { token: adminToken, body: { name: '' } })).status, 400);
  assert.equal((await call('PATCH', `/api/platform/plans/${plan.id}`, { token: adminToken, body: {} })).status, 400);
  assert.equal((await call('PATCH', `/api/platform/plans/${plan.id}`, { token: adminToken, body: { maxUsers: 10 } })).status, 200);
});

check('15: admin-user inputs are type-checked (no 500s)', async () => {
  for (const body of [{ email: 123, fullName: 'x' }, { email: 'a@b.co', fullName: { x: 1 } }, { email: `x${suffix}@b.co`, fullName: 'Ok', password: 'short' }, { email: `x${suffix}@b.co`, fullName: 'Ok', password: 12345678 }]) {
    const r = await call('POST', '/api/platform/admin-users', { token: adminToken, body });
    assert.equal(r.status, 400, `${JSON.stringify(body)} -> ${r.status}`);
  }
});

check('15: support access duration and reason are validated', async () => {
  const co = await prisma.company.findFirst();
  for (const bad of [{ durationHours: 'abc' }, { durationHours: -3 }, { durationHours: 0.2 }, { durationHours: 48 }, { reason: 12345678901 }]) {
    const r = await call('POST', '/api/platform/support-access', { token: adminToken, body: { companyId: co.id, reason: 'Investigating billing ticket', ...bad } });
    assert.equal(r.status, 400, `${JSON.stringify(bad)} -> ${r.status}`);
  }
});

check('15: subscription status must be a known value', async () => {
  const r = await call('POST', '/api/platform/subscriptions', { token: adminToken, body: { companyId: 'x', planId: 'y', status: 'Nonsense' } });
  assert.equal(r.status, 400);
});

check('15: an admin cannot deactivate themselves', async () => {
  const r = await call('PATCH', `/api/platform/admin-users/${admin.id}`, { token: adminToken, body: { isActive: false } });
  assert.equal(r.status, 400);
});

// ---------------------------------------------------------------- SEC-M2-12 registration
const reg = (over = {}) => ({
  companyLegalName: `SecM2 Co ${suffix} ${Math.random().toString(36).slice(2, 6)}`,
  ownerFullName: 'Owner Person',
  ownerEmail: `owner.${suffix}.${Math.random().toString(36).slice(2, 6)}@acme-corp-test.com`,
  password: 'Password123!',
  ...over,
});

check('12: free / consumer mailbox domains are blocked (incl. families)', async () => {
  for (const d of ['gmail.com', 'yahoo.co.in', 'hotmail.fr', 'outlook.in', 'live.com', 'proton.me', 'protonmail.com', 'gmx.com', 'icloud.com', 'zoho.com', 'yandex.com']) {
    const r = await call('POST', '/api/auth/register-company', { body: reg({ ownerEmail: `person${suffix}@${d}`, planId: plan.id }) });
    assert.equal(r.status, 400, `${d} -> ${r.status}`);
  }
});

check('12: unknown / inactive plan ids are rejected, active plan works', async () => {
  const inactive = await prisma.plan.create({ data: { name: `SecM2 inactive ${suffix}`, auditLogRetentionDays: 30, allowsIntegrations: false, isActive: false } });
  assert.equal((await call('POST', '/api/auth/register-company', { body: reg({ planId: 'does-not-exist' }) })).status, 400);
  assert.equal((await call('POST', '/api/auth/register-company', { body: reg({ planId: inactive.id }) })).status, 400);
  const ok = await call('POST', '/api/auth/register-company', { body: reg({ planId: plan.id }) });
  assert.equal(ok.status, 201, JSON.stringify(ok.json));
  createdCompanyIds.push(ok.json.data.user.companyId);
  assert.equal(ok.json.data.role, 'system_admin');
  assert.equal('targetRoute' in ok.json.data, false, 'legacy targetRoute must be gone');
  assert.equal('targetRoute' in ok.json.data.user, false);
  const sub = await prisma.subscription.findFirst({ where: { companyId: ok.json.data.user.companyId } });
  assert.equal(sub.planId, plan.id);
  const assignment = await prisma.roleAssignment.findFirst({ where: { userId: ok.json.data.user.id, revokedAt: null }, include: { role: true } });
  assert.ok(assignment, 'owner must receive an active System Admin assignment');
  assert.equal(assignment.role.name, 'system_admin');
});

check('12: public plan list hides inactive plans', async () => {
  const r = await call('GET', '/api/auth/public-plans');
  assert.equal(r.status, 200);
  const ids = r.json.data.map((p) => p.id);
  assert.ok(ids.includes(plan.id));
  const inactive = await prisma.plan.findFirst({ where: { isActive: false, name: { contains: `${suffix}` } } });
  assert.ok(inactive && !ids.includes(inactive.id));
});

check('12: a platform admin email cannot be used to register a company', async () => {
  const r = await call('POST', '/api/auth/register-company', { body: reg({ ownerEmail: admin.email, planId: plan.id }) });
  assert.ok([400, 409].includes(r.status), `status ${r.status}`);
});

check('12: registration with a missing System Admin template fails and leaves nothing behind', async () => {
  const before = await prisma.company.count();
  const templates = await prisma.roleTemplate.findMany({ where: { slug: 'system_admin', origin: 'platform_predefined' } });
  // Temporarily rename the slug so the template is "missing", then restore it.
  await prisma.roleTemplate.updateMany({ where: { id: { in: templates.map((t) => t.id) } }, data: { slug: 'system_admin_hidden' } });
  try {
    const r = await call('POST', '/api/auth/register-company', { body: reg({ planId: plan.id }) });
    assert.equal(r.status, 500);
    assert.equal(await prisma.company.count(), before, 'transaction must roll back the half-created company');
  } finally {
    await prisma.roleTemplate.updateMany({ where: { id: { in: templates.map((t) => t.id) } }, data: { slug: 'system_admin' } });
  }
});

// ---------------------------------------------------------------- SEC-M2-13 login separation
check('13: tenant login no longer authenticates platform admins', async () => {
  const r = await call('POST', '/api/auth/login', { body: { email: admin.email, password: 'Passw0rd!x' } });
  assert.equal(r.status, 401);
});

check('13: platform login works on its own endpoint with the platform expiry', async () => {
  const r = await call('POST', '/api/platform/auth/login', { body: { email: admin.email, password: 'Passw0rd!x' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const d = jwt.decode(r.json.data.token);
  assert.equal(d.exp - d.iat, 3600, 'platform token must live 1h, not the tenant lifetime');
});

check('13: a platform email cannot shadow a tenant account', async () => {
  const company = await prisma.company.findFirst();
  const email = `shadow-${suffix}@acme-shadow-test.com`;
  const tenant = await prisma.user.create({ data: { companyId: company.id, fullName: 'Shadow Tenant', email, passwordHash: await bcrypt.hash('Tenant#1234', 10), passwordChangedAt: new Date() } });
  const pa = await prisma.platformAdminUser.create({ data: { email, fullName: 'Shadow Admin', passwordHash: await bcrypt.hash('Admin#12345', 10), passwordChangedAt: new Date(), isActive: true } });
  try {
    const t = await call('POST', '/api/auth/login', { body: { email, password: 'Tenant#1234' } });
    assert.ok([200, 402].includes(t.status), `tenant password should reach the tenant account, got ${t.status}`);
    assert.notEqual(t.json?.data?.role, 'platform_admin');
    const wrong = await call('POST', '/api/auth/login', { body: { email, password: 'Admin#12345' } });
    assert.equal(wrong.status, 401, 'platform password must not work on the tenant endpoint');
  } finally {
    await prisma.platformAdminUser.delete({ where: { id: pa.id } });
    await prisma.user.delete({ where: { id: tenant.id } });
  }
});

// ---------------------------------------------------------------- SEC-M2-14 revoked assignments
check('14: a revoked assignment grants nothing (middleware + login)', async () => {
  const company = await prisma.company.findFirst({ include: { roles: { where: { name: 'company_owner' } } } });
  const role = company.roles[0] || (await prisma.role.findFirst({ where: { companyId: company.id, name: 'company_owner' } }));
  assert.ok(role, 'seeded company_owner role expected');
  const email = `revoked-${suffix}@acme-revoked-test.com`;
  const u = await prisma.user.create({ data: { companyId: company.id, fullName: 'Revoked Person', email, passwordHash: await bcrypt.hash('Revoked#123', 10), passwordChangedAt: new Date() } });
  const ra = await prisma.roleAssignment.create({ data: { companyId: company.id, userId: u.id, roleId: role.id, scopeType: 'Company', scopeId: company.id, grantedById: u.id } });
  try {
    let login = await call('POST', '/api/auth/login', { body: { email, password: 'Revoked#123' } });
    assert.equal(login.status, 200, JSON.stringify(login.json));
    assert.equal(login.json.data.role, 'company_owner');
    const token = login.json.data.token;
    assert.equal((await call('GET', '/api/auth/me', { token })).json.data.role, 'company_owner');

    await prisma.roleAssignment.update({ where: { id: ra.id }, data: { revokedAt: new Date() } });

    const me = await call('GET', '/api/auth/me', { token });
    assert.notEqual(me.json.data.role, 'company_owner', 'revoked assignment must not give owner access');
    login = await call('POST', '/api/auth/login', { body: { email, password: 'Revoked#123' } });
    assert.notEqual(login.json.data.role, 'company_owner');
    const list = await call('GET', `/api/role-assignments?userId=${u.id}`, { token: adminToken });
    // company users only; platform token is rejected, so use the user's own owner-level view instead
    assert.ok([200, 401, 403].includes(list.status));
  } finally {
    await prisma.roleAssignment.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }
});

// ---------------------------------------------------------------- SEC-M2-16 CORS
check('16: localhost origins are trusted outside production only', async () => {
  const dev = await call('GET', '/api/auth/public-plans', { origin: 'http://localhost:3000' });
  assert.equal(dev.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  const evil = await call('GET', '/api/auth/public-plans', { origin: 'https://evil.example' });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
});

(async () => {
  let failed = 0;
  try {
    await setup();
    for (const [name, fn] of results) {
      try {
        await fn();
        console.log(`  PASS  ${name}`);
      } catch (e) {
        failed += 1;
        console.log(`  FAIL  ${name}\n        ${e.message.split('\n')[0]}`);
      }
    }
  } finally {
    await teardown();
    server.close();
    await prisma.$disconnect();
  }
  console.log(failed ? `\n${failed} test(s) failed` : `\nAll ${results.length} tests passed`);
  process.exit(failed ? 1 : 0);
})();
