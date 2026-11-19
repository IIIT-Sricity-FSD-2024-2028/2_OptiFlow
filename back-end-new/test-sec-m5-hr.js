// SEC-M5 / PRE-M5-02 regression tests (HR, users, roles, teams, notifications).
// Runs the Express app in-process against the TEST database, on top of the standard seed
// (`npx tsx prisma/seed.ts`). Every check leaves the seeded data as it found it, or uses rows
// it created itself, so the file can be run repeatedly.
// Usage: node test-sec-m5-hr.js   (DATABASE_URL must point at a database whose name contains "test")
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

process.env.RATE_LIMIT_ENABLED = 'false';
const { assertTestDatabase } = await import('./scripts/setup-test-db.js');
assertTestDatabase(process.env.DATABASE_URL);
const { prisma } = await import('./src/config/prisma.js');
const { createApp } = await import('./src/app.js');
const { invalidateCompanyAuthCache } = await import('./src/utils/companyAuthCache.js');
const { buildEmailChangeToken } = await import('./src/utils/emailChangeTokens.js').catch(() => ({}));

const suffix = Date.now();
const results = [];
const check = (name, fn) => results.push([name, fn]);

const app = createApp();
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

const tokens = {};
async function login(email, password = 'password123') {
  const r = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.json)}`);
  return r.json.data.token;
}
const userByEmail = (email) => prisma.user.findFirst({ where: { email } });
const activeAssignments = (userId) =>
  prisma.roleAssignment.findMany({ where: { userId, revokedAt: null }, include: { role: { include: { roleTemplate: true } } } });
const systemRole = (companyId, name) => prisma.role.findFirst({ where: { companyId, name, isSystem: true } });

let acme, beta, hq, west, teamCore, teamSales, teamAdmin;
const createdUserIds = [];
const createdBranchIds = [];

/** Creates a user directly (password already "changed", so no forced change at login). */
async function makeUser({ companyId, email, roleName, scopeType = 'Company', scopeId }) {
  const user = await prisma.user.create({
    data: {
      companyId,
      fullName: `M5 ${email}`,
      email,
      passwordHash: await bcrypt.hash('password123', 10),
      passwordChangedAt: new Date(),
    },
  });
  createdUserIds.push(user.id);
  if (roleName) {
    const role = await systemRole(companyId, roleName);
    await prisma.roleAssignment.create({
      data: { companyId, userId: user.id, roleId: role.id, scopeType, scopeId: scopeId || companyId },
    });
  }
  return user;
}

async function setup() {
  acme = await prisma.company.findFirst({ where: { legalName: { contains: 'Acme' } } });
  beta = await prisma.company.findFirst({ where: { legalName: 'Beta LLC' } });
  assert.ok(acme && beta, 'standard seed (Acme + Beta LLC) is required');
  hq = await prisma.branch.findFirst({ where: { companyId: acme.id, name: { contains: 'New York' } } });
  west = await prisma.branch.findFirst({ where: { companyId: acme.id, name: { contains: 'San Francisco' } } });
  teamCore = await prisma.team.findFirst({ where: { name: 'Acme Core Engineering' } });
  teamSales = await prisma.team.findFirst({ where: { name: 'Acme Sales & Operations' } });
  teamAdmin = await prisma.team.findFirst({ where: { name: 'Admin Support Team' } });

  for (const [k, e] of Object.entries({
    owner: 'ceo@acme.com', hr: 'hr@acme.com', pm: 'pm@acme.com', tl: 'tl@acme.com', tl2: 'tl2@acme.com',
    member: 'employee@acme.com', compliance: 'compliance@acme.com', betaOwner: 'ceo@betallc.com',
  })) {
    tokens[k] = await login(e);
  }
}

async function teardown() {
  // F20: audit rows about roles and users the run created that teardown cannot reach by target user
  // (role deletions, and user creates whose target is nulled when the user is deleted). Every such
  // label and email carries the run suffix. LOGIN rows of the seeded logins are kept: they are real logins.
  const ours = { string_contains: String(suffix) };
  // Guarded: if setup() failed before the companies were loaded, cleanup must not mask that error.
  if (acme && beta) await prisma.systemAuditLog.deleteMany({
    where: {
      companyId: { in: [acme.id, beta.id] },
      OR: [
        { oldValue: { path: ['deletedRoleLabel'], ...ours } },
        { newValue: { path: ['deletedRoleLabel'], ...ours } },
        { newValue: { path: ['email'], ...ours } },
        { newValue: { path: ['label'], ...ours } },
      ],
    },
  }).catch((err) => console.warn('teardown: audit cleanup failed:', err.message));
  if (createdBranchIds.length) {
    const inBranch = { scopeType: 'Branch', scopeId: { in: createdBranchIds } };
    await prisma.systemAuditLog.deleteMany({ where: { branchId: { in: createdBranchIds } } }).catch(() => {});
    await prisma.roleAssignment.deleteMany({ where: inBranch }).catch(() => {});
    await prisma.branch.deleteMany({ where: { id: { in: createdBranchIds } } }).catch(() => {});
  }
  if (createdUserIds.length) {
    const q = { where: { userId: { in: createdUserIds } } };
    await prisma.notification.deleteMany(q).catch(() => {});
    await prisma.teamMember.deleteMany(q).catch(() => {});
    await prisma.roleAssignment.deleteMany(q).catch(() => {});
    await prisma.systemAuditLog.deleteMany({ where: { targetUserId: { in: createdUserIds } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
  }
  await prisma.notification.deleteMany({ where: { title: { startsWith: `M5 ${suffix}` } } }).catch(() => {});
}

// ---------------------------------------------------------------- SEC-M5-01
check('M5-01: HR cannot assign a role to itself', async () => {
  const hr = await userByEmail('hr@acme.com');
  const co = await systemRole(acme.id, 'compliance_officer');
  const r = await call('POST', '/api/role-assignments', { token: tokens.hr, body: { userId: hr.id, roleId: co.id } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal((await activeAssignments(hr.id)).length, 1);
});

check('M5-01: HR cannot revoke its own assignment', async () => {
  const hr = await userByEmail('hr@acme.com');
  const [own] = await activeAssignments(hr.id);
  const r = await call('DELETE', `/api/role-assignments/${own.id}`, { token: tokens.hr });
  assert.equal(r.status, 403, JSON.stringify(r.json));
});

check('M5-01: a system role relabelled "Team Member" still counts as Company Owner', async () => {
  const target = await makeUser({ companyId: acme.id, email: `m5-relabel-${suffix}@acme.com`, roleName: 'team_member' });
  const ownerRole = await systemRole(acme.id, 'company_owner');
  await prisma.role.update({ where: { id: ownerRole.id }, data: { label: 'Team Member' } });
  try {
    const r = await call('POST', '/api/role-assignments', { token: tokens.hr, body: { userId: target.id, roleId: ownerRole.id } });
    assert.equal(r.status, 403, JSON.stringify(r.json));
  } finally {
    await prisma.role.update({ where: { id: ownerRole.id }, data: { label: 'Company Owner' } });
  }
});

// ---------------------------------------------------------------- PRE-M5-02
check('PRE-M5-02: "already assigned" returns the list shape (grantedByUser)', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-shape-${suffix}@acme.com`, roleName: 'team_member' });
  const tm = await systemRole(acme.id, 'team_member');
  const r = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: tm.id } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.ok('grantedByUser' in r.json.data, 'grantedByUser missing');
});

// ---------------------------------------------------------------- SEC-M5-08
check('M5-08: scopeId must be a real row of the caller company', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-scope-${suffix}@acme.com`, roleName: 'team_member' });
  const pmRole = await systemRole(acme.id, 'project_manager');
  for (const [scopeType, scopeId] of [['Branch', 'nope'], ['Team', 'nope'], ['Project', 'nope'], ['Company', beta.id], ['Galaxy', acme.id]]) {
    const r = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: pmRole.id, scopeType, scopeId } });
    assert.equal(r.status, 400, `${scopeType}/${scopeId} -> ${r.status}`);
  }
  const ok = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: pmRole.id, scopeType: 'Branch', scopeId: hq.id } });
  assert.equal(ok.status, 201, JSON.stringify(ok.json));
  assert.equal(ok.json.data.companyId, acme.id);
});

check('M5-08: revoke keeps the row with revokedAt (history)', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-revoke-${suffix}@acme.com`, roleName: 'team_member' });
  const pmRole = await systemRole(acme.id, 'project_manager');
  const c = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: pmRole.id } });
  assert.equal(c.status, 201);
  const d = await call('DELETE', `/api/role-assignments/${c.json.data.id}`, { token: tokens.owner });
  assert.equal(d.status, 200);
  const row = await prisma.roleAssignment.findUnique({ where: { id: c.json.data.id } });
  assert.ok(row && row.revokedAt, 'row must remain with revokedAt set');
  const list = await call('GET', `/api/role-assignments?userId=${u.id}`, { token: tokens.owner });
  assert.ok(!list.json.data.some((a) => a.id === row.id), 'revoked row must not be listed');
  const detail = await call('GET', `/api/users/${u.id}`, { token: tokens.owner });
  assert.ok(!detail.json.data.roleAssignments.some((a) => a.id === row.id), 'revoked row must not show on the user');
});

// ---------------------------------------------------------------- SEC-M5-04
check('M5-04: re-sending a Branch Manager role keeps the branch scope', async () => {
  const bm = await makeUser({ companyId: acme.id, email: `m5-bm-${suffix}@acme.com`, roleName: 'branch_manager', scopeType: 'Branch', scopeId: west.id });
  const r = await call('PATCH', `/api/users/${bm.id}`, { token: tokens.owner, body: { role: 'branch_manager' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const active = await activeAssignments(bm.id);
  assert.equal(active.length, 1);
  assert.equal(active[0].scopeType, 'Branch');
  assert.equal(active[0].scopeId, west.id);
});

check('M5-04: a role change replaces only the primary role, keeps scope and sets companyId', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-primary-${suffix}@acme.com`, roleName: 'team_member', scopeType: 'Branch', scopeId: hq.id });
  const pmRole = await systemRole(acme.id, 'project_manager');
  const project = await prisma.project.findFirst({ where: { companyId: acme.id, deletedAt: null } });
  await prisma.roleAssignment.create({ data: { companyId: acme.id, userId: u.id, roleId: pmRole.id, scopeType: 'Project', scopeId: project.id } });
  // Primary is project_manager (higher precedence); change it to team_leader.
  const r = await call('PATCH', `/api/users/${u.id}`, { token: tokens.owner, body: { role: 'team_leader' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const active = await activeAssignments(u.id);
  assert.equal(active.length, 2, JSON.stringify(active.map((a) => a.role.name)));
  const tl = active.find((a) => a.role.name === 'team_lead');
  assert.ok(tl, 'team lead assignment expected');
  assert.equal(tl.scopeType, 'Project');
  assert.equal(tl.scopeId, project.id);
  assert.equal(tl.companyId, acme.id);
  assert.ok(active.some((a) => a.role.name === 'team_member' && a.scopeId === hq.id), 'other assignment must stay');
});

check('M5-04: Branch Manager role without a branch scope is rejected', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-nobranch-${suffix}@acme.com`, roleName: 'team_member' });
  const r = await call('PATCH', `/api/users/${u.id}`, { token: tokens.owner, body: { role: 'branch_manager', branchId: 'nope' } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
});

// ---------------------------------------------------------------- SEC-M5-14
check('M5-14: the sole Company Owner cannot demote themselves', async () => {
  const fiona = await userByEmail('ceo@betallc.com');
  const r = await call('PATCH', `/api/users/${fiona.id}`, { token: tokens.betaOwner, body: { role: 'team_member' } });
  assert.ok([400, 403, 409].includes(r.status), `status ${r.status}`);
  const active = await activeAssignments(fiona.id);
  assert.ok(active.some((a) => a.role.name === 'company_owner'), 'Beta must keep its owner');
});

check('M5-14: nobody changes their own role through PATCH /users (D-S3)', async () => {
  const hr = await userByEmail('hr@acme.com');
  const r = await call('PATCH', `/api/users/${hr.id}`, { token: tokens.hr, body: { role: 'compliance_officer' } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
});

check('M5-14: an owner can still demote another owner when one remains', async () => {
  const extra = await makeUser({ companyId: acme.id, email: `m5-owner2-${suffix}@acme.com`, roleName: 'company_owner' });
  const r = await call('PATCH', `/api/users/${extra.id}`, { token: tokens.owner, body: { role: 'team_member' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const active = await activeAssignments(extra.id);
  assert.deepEqual(active.map((a) => a.role.name), ['team_member']);
});

// ---------------------------------------------------------------- SEC-M5-05 / 06
check('M5-05: PATCH /users cannot change your own password', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-pw-${suffix}@acme.com`, roleName: 'team_member' });
  const t = await login(u.email);
  const r = await call('PATCH', `/api/users/${u.id}`, { token: t, body: { password: 'NewPassw0rd!' } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
  const after = await prisma.user.findUnique({ where: { id: u.id } });
  assert.ok(await bcrypt.compare('password123', after.passwordHash), 'password must be unchanged');
});

check('M5-05: an admin can still reset another user (forced change)', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-reset-${suffix}@acme.com`, roleName: 'team_member' });
  const r = await call('PATCH', `/api/users/${u.id}`, { token: tokens.owner, body: { password: 'Reset#12345' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const after = await prisma.user.findUnique({ where: { id: u.id } });
  assert.equal(after.passwordChangedAt, null);
});

check('M5-06: PATCH /users cannot change your own email', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-mail-${suffix}@acme.com`, roleName: 'team_member' });
  const t = await login(u.email);
  const r = await call('PATCH', `/api/users/${u.id}`, { token: t, body: { email: `m5-hijack-${suffix}@evil.test` } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).email, u.email);
});

check('M5-06: email change needs the current password and a confirmation link', async () => {
  assert.ok(buildEmailChangeToken, 'src/utils/emailChangeTokens.js must export buildEmailChangeToken');
  const u = await makeUser({ companyId: acme.id, email: `m5-mail2-${suffix}@acme.com`, roleName: 'team_member' });
  const t = await login(u.email);
  const newEmail = `m5-new-${suffix}@acme.com`;
  assert.equal((await call('POST', '/api/users/me/email-change', { token: t, body: { newEmail } })).status, 400);
  assert.equal((await call('POST', '/api/users/me/email-change', { token: t, body: { newEmail, currentPassword: 'wrong-pass' } })).status, 400, 'a wrong password must not look like an expired session');
  const req = await call('POST', '/api/users/me/email-change', { token: t, body: { newEmail, currentPassword: 'password123' } });
  assert.equal(req.status, 202, JSON.stringify(req.json));
  assert.ok(!JSON.stringify(req.json).includes('token'), 'the link must only go to the new mailbox');
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).email, u.email, 'not changed before confirmation');

  const fresh = await prisma.user.findUnique({ where: { id: u.id } });
  const { token } = buildEmailChangeToken({ userId: u.id, companyId: acme.id, tokenVersion: fresh.tokenVersion, newEmail });
  assert.equal((await call('POST', '/api/users/email-change/confirm', { body: { token: 'garbage' } })).status, 400);
  const ok = await call('POST', '/api/users/email-change/confirm', { body: { token } });
  assert.equal(ok.status, 200, JSON.stringify(ok.json));
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).email, newEmail);
  assert.equal((await call('POST', '/api/users/email-change/confirm', { body: { token } })).status, 400, 'link is single use');
});

// ---------------------------------------------------------------- SEC-M5-09 / 10
check('M5-09: concurrent creates cannot exceed the plan user limit', async () => {
  const active = await prisma.user.count({ where: { companyId: beta.id, isActive: true } });
  const plan = await prisma.plan.create({ data: { name: `M5 tight ${suffix}`, maxUsers: active + 1, auditLogRetentionDays: 30, allowsIntegrations: false, isActive: true } });
  const sub = await prisma.subscription.findFirst({ where: { companyId: beta.id } });
  await prisma.subscription.update({ where: { id: sub.id }, data: { planId: plan.id } });
  invalidateCompanyAuthCache(beta.id);
  try {
    const rs = await Promise.all(Array.from({ length: 6 }, (_, i) =>
      call('POST', '/api/users', { token: tokens.betaOwner, body: { fullName: `Race ${i}`, email: `m5-race-${i}-${suffix}@betallc.com`, password: 'password123', role: 'team_member' } })));
    const made = await prisma.user.findMany({ where: { email: { startsWith: 'm5-race-' } } });
    createdUserIds.push(...made.map((m) => m.id));
    assert.equal(rs.filter((r) => r.status === 201).length, 1, rs.map((r) => r.status).join(','));
    assert.equal(await prisma.user.count({ where: { companyId: beta.id, isActive: true } }), active + 1);
  } finally {
    await prisma.subscription.update({ where: { id: sub.id }, data: { planId: sub.planId } });
    invalidateCompanyAuthCache(beta.id);
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
  }
});

check('M5-10: an unknown branchId is rejected, not widened to company scope', async () => {
  const r = await call('POST', '/api/users', { token: tokens.owner, body: { fullName: 'Bad Branch', email: `m5-badbranch-${suffix}@acme.com`, password: 'password123', role: 'branch_manager', branchId: 'nope' } });
  const made = await userByEmail(`m5-badbranch-${suffix}@acme.com`);
  if (made) createdUserIds.push(made.id);
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal(made, null);
});

// ---------------------------------------------------------------- SEC-M5-15
check('M5-15: PM, TL, HR and Compliance see only their own notifications', async () => {
  const david = await userByEmail('employee@acme.com');
  await prisma.notification.create({ data: { userId: david.id, companyId: acme.id, title: `M5 ${suffix} private`, message: 'x' } });
  for (const k of ['pm', 'tl', 'hr', 'compliance', 'owner']) {
    const me = await prisma.user.findFirst({ where: { email: { pm: 'pm@acme.com', tl: 'tl@acme.com', hr: 'hr@acme.com', compliance: 'compliance@acme.com', owner: 'ceo@acme.com' }[k] } });
    const r = await call('GET', '/api/notifications', { token: tokens[k] });
    assert.equal(r.status, 200);
    assert.ok(r.json.data.every((n) => n.userId === me.id), `${k} received other users' rows`);
  }
});

check('M5-15: only Owner/System Admin may read another user\'s notifications', async () => {
  const david = await userByEmail('employee@acme.com');
  for (const k of ['pm', 'tl', 'hr', 'compliance']) {
    const r = await call('GET', `/api/notifications?userId=${david.id}`, { token: tokens[k] });
    assert.equal(r.status, 403, `${k} -> ${r.status}`);
  }
  const ok = await call('GET', `/api/notifications?userId=${david.id}`, { token: tokens.owner });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.data.some((n) => n.title === `M5 ${suffix} private`));
});

// ---------------------------------------------------------------- SEC-M5-13
check('M5-13: PM and Compliance cannot create notifications', async () => {
  const alice = await userByEmail('ceo@acme.com');
  for (const k of ['pm', 'compliance']) {
    const r = await call('POST', '/api/notifications', { token: tokens[k], body: { userId: alice.id, title: `M5 ${suffix} spoof`, message: 'hi', type: 'System' } });
    assert.equal(r.status, 403, `${k} -> ${r.status}`);
  }
});

check('M5-13: type, title and message are validated; TL writes only to own team', async () => {
  const david = await userByEmail('employee@acme.com'); // Core Engineering member, lead = tl@acme.com
  const alice = await userByEmail('ceo@acme.com');
  const send = (body) => call('POST', '/api/notifications', { token: tokens.tl, body: { userId: david.id, title: `M5 ${suffix} ok`, message: 'Approved', type: 'success', ...body } });
  assert.equal((await send({ type: 'Hacked' })).status, 400);
  assert.equal((await send({ title: `M5 ${suffix} ` + 'x'.repeat(200) })).status, 400);
  assert.equal((await send({ message: 'y'.repeat(2001) })).status, 400);
  assert.equal((await send({ userId: alice.id })).status, 403);
  assert.equal((await send({})).status, 201);
});

// ---------------------------------------------------------------- SEC-M5-11 / 12 / 16
check('M5-11: adding an existing member is 409, role is validated, change-role is explicit', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-tm-${suffix}@acme.com`, roleName: 'team_member' });
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.owner, body: { userId: u.id, role: 'Wizard' } })).status, 400);
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.owner, body: { userId: u.id } })).status, 201);
  const again = await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.owner, body: { userId: u.id, role: 'Member' } });
  assert.equal(again.status, 409);
  assert.equal((await call('PATCH', `/api/teams/${teamCore.id}/members/${u.id}`, { token: tokens.owner, body: { role: 'Wizard' } })).status, 400);
  assert.equal((await call('DELETE', `/api/teams/${teamCore.id}/members/${u.id}`, { token: tokens.owner })).status, 200);
  assert.equal((await call('DELETE', `/api/teams/${teamCore.id}/members/${u.id}`, { token: tokens.owner })).status, 404);
});

check('M5-12: one leader per team; the leader cannot be removed without a handover', async () => {
  const charlie = await userByEmail('tl@acme.com');
  const u = await makeUser({ companyId: acme.id, email: `m5-lead-${suffix}@acme.com`, roleName: 'team_lead' });
  // A second Lead cannot be added next to Charlie.
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.owner, body: { userId: u.id, role: 'Lead' } })).status, 409);
  // Charlie leads a team that still has members: removal is blocked.
  const rm = await call('DELETE', `/api/teams/${teamCore.id}/members/${charlie.id}`, { token: tokens.owner });
  assert.equal(rm.status, 409, JSON.stringify(rm.json));
  // Demoting the only leader of a team with members is blocked too.
  assert.equal((await call('PATCH', `/api/teams/${teamCore.id}/members/${charlie.id}`, { token: tokens.owner, body: { role: 'Member' } })).status, 409);
  // Handover: promoting a member moves the lead role, so there is still exactly one.
  await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.owner, body: { userId: u.id } });
  try {
    const h = await call('PATCH', `/api/teams/${teamCore.id}/members/${u.id}`, { token: tokens.owner, body: { role: 'Lead' } });
    assert.equal(h.status, 200, JSON.stringify(h.json));
    const leads = await prisma.teamMember.findMany({ where: { teamId: teamCore.id, role: 'Lead' } });
    assert.deepEqual(leads.map((l) => l.userId), [u.id]);
  } finally {
    await prisma.teamMember.updateMany({ where: { teamId: teamCore.id, userId: charlie.id }, data: { role: 'Lead' } });
    await prisma.teamMember.deleteMany({ where: { teamId: teamCore.id, userId: u.id } });
  }
});

check('M5-12: a leader with open tasks in the team cannot be removed', async () => {
  const lead = await makeUser({ companyId: acme.id, email: `m5-solo-${suffix}@acme.com`, roleName: 'team_lead' });
  const team = await prisma.team.create({ data: { companyId: acme.id, branchId: hq.id, name: `M5 solo ${suffix}` } });
  await prisma.teamMember.create({ data: { companyId: acme.id, teamId: team.id, userId: lead.id, role: 'Lead' } });
  const owner = await userByEmail('ceo@acme.com');
  const project = await prisma.project.create({ data: { companyId: acme.id, teamId: team.id, name: `M5 proj ${suffix}`, createdById: owner.id } });
  const task = await prisma.task.create({ data: { companyId: acme.id, projectId: project.id, title: 'open', status: 'Active', assignedToId: lead.id, createdById: owner.id } });
  try {
    const r = await call('DELETE', `/api/teams/${team.id}/members/${lead.id}`, { token: tokens.owner });
    assert.equal(r.status, 409, JSON.stringify(r.json));
  } finally {
    await prisma.task.delete({ where: { id: task.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.teamMember.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
  }
});

check('M5-16: member endpoints respect branch and team-lead scope; PMs are refused', async () => {
  const bm = await makeUser({ companyId: acme.id, email: `m5-bmwest-${suffix}@acme.com`, roleName: 'branch_manager', scopeType: 'Branch', scopeId: west.id });
  const target = await makeUser({ companyId: acme.id, email: `m5-scoped-${suffix}@acme.com`, roleName: 'team_member' });
  const bmToken = await login(bm.email);
  // teamCore is in the New York branch.
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: bmToken, body: { userId: target.id } })).status, 403);
  // tl2 (Lucas) leads Sales, not Core.
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.tl2, body: { userId: target.id } })).status, 403);
  // PMs have no roster rights (F2).
  assert.equal((await call('POST', `/api/teams/${teamAdmin.id}/members`, { token: tokens.pm, body: { userId: target.id } })).status, 403);
  // Charlie (lead of Core) may add to Core and remove again.
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.tl, body: { userId: target.id } })).status, 201);
  assert.equal((await call('DELETE', `/api/teams/${teamCore.id}/members/${target.id}`, { token: tokens.tl2 })).status, 403);
  assert.equal((await call('DELETE', `/api/teams/${teamCore.id}/members/${target.id}`, { token: tokens.tl })).status, 200);
});

// ---------------------------------------------------------------- follow-ons of the fixes above
check('M5-08: a custom role whose assignments were all revoked can still be deleted', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-custom-${suffix}@acme.com`, roleName: 'team_member' });
  const role = await prisma.role.create({ data: { companyId: acme.id, label: `M5 Custom ${suffix}`, isSystem: false } });
  const c = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: role.id } });
  assert.equal(c.status, 201, JSON.stringify(c.json));
  assert.equal((await call('DELETE', `/api/roles/${role.id}`, { token: tokens.owner })).status, 409, 'active assignment blocks delete');
  assert.equal((await call('DELETE', `/api/role-assignments/${c.json.data.id}`, { token: tokens.owner })).status, 200);
  const d = await call('DELETE', `/api/roles/${role.id}`, { token: tokens.owner });
  assert.equal(d.status, 200, JSON.stringify(d.json));
});

check('PRE-M5-06: the /departments alias is gone', async () => {
  assert.equal((await call('GET', '/api/departments', { token: tokens.owner })).status, 404);
  assert.equal((await call('GET', '/api/branches', { token: tokens.owner })).status, 200);
});

check('PRE-M5-05: old role spellings still resolve for stored clients (team_lead -> team_leader)', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-alias-${suffix}@acme.com`, roleName: 'team_member' });
  const r = await call('PATCH', `/api/users/${u.id}`, { token: tokens.owner, body: { role: 'team_lead' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const active = await activeAssignments(u.id);
  assert.deepEqual(active.map((a) => a.role.name), ['team_lead']);
});

// ---------------------------------------------------------------- found by the council review
check('M5-01 (branches): HR cannot make itself Branch Manager through a branch', async () => {
  const hr = await userByEmail('hr@acme.com');
  const r = await call('POST', '/api/branches', { token: tokens.hr, body: { name: `M5 self ${suffix}`, managerUserId: hr.id } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal(await prisma.branch.count({ where: { name: `M5 self ${suffix}` } }), 0, 'no orphan branch');
  assert.ok((await activeAssignments(hr.id)).every((a) => a.role.name !== 'branch_manager'));
});

check('M5-01 (branches): a manager from another company is rejected', async () => {
  const george = await userByEmail('member1@betallc.com');
  const r = await call('PATCH', `/api/branches/${west.id}`, { token: tokens.owner, body: { name: west.name, managerUserId: george.id } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal((await activeAssignments(george.id)).length, 1, 'no cross-tenant row');
});

check('M5-08 (branches): changing the manager soft-revokes only the old Branch Manager row', async () => {
  const branch = await prisma.branch.create({ data: { companyId: acme.id, name: `M5 bm ${suffix}` } });
  const bystander = await makeUser({ companyId: acme.id, email: `m5-bystander-${suffix}@acme.com`, roleName: 'team_member', scopeType: 'Branch', scopeId: branch.id });
  const a = await makeUser({ companyId: acme.id, email: `m5-bma-${suffix}@acme.com`, roleName: 'team_member' });
  const b = await makeUser({ companyId: acme.id, email: `m5-bmb-${suffix}@acme.com`, roleName: 'team_member' });
  try {
    assert.equal((await call('PATCH', `/api/branches/${branch.id}`, { token: tokens.owner, body: { name: branch.name, managerUserId: a.id } })).status, 200);
    assert.equal((await call('PATCH', `/api/branches/${branch.id}`, { token: tokens.owner, body: { name: branch.name, managerUserId: b.id } })).status, 200);
    const rows = await prisma.roleAssignment.findMany({ where: { scopeType: 'Branch', scopeId: branch.id }, include: { role: true } });
    const bm = rows.filter((r) => r.role.name === 'branch_manager');
    assert.deepEqual(bm.filter((r) => !r.revokedAt).map((r) => r.userId), [b.id]);
    assert.ok(bm.some((r) => r.userId === a.id && r.revokedAt), 'old manager row kept as history');
    assert.ok(rows.some((r) => r.userId === bystander.id && !r.revokedAt && r.role.name === 'team_member'), 'bystander untouched');
  } finally {
    await prisma.roleAssignment.deleteMany({ where: { scopeType: 'Branch', scopeId: branch.id } });
    await prisma.systemAuditLog.deleteMany({ where: { branchId: branch.id } });
    await prisma.branch.delete({ where: { id: branch.id } });
  }
});

check('M5-16: a Project Manager cannot edit or create team records', async () => {
  assert.equal((await call('PATCH', `/api/teams/${teamAdmin.id}`, { token: tokens.pm, body: { name: `M5 hijack ${suffix}` } })).status, 403);
  assert.equal((await call('POST', '/api/teams', { token: tokens.pm, body: { name: `M5 pm team ${suffix}`, branchId: hq.id } })).status, 403);
});

check('M5-12: re-promoting a Lead repairs a team that has two Leads', async () => {
  const lead = await makeUser({ companyId: acme.id, email: `m5-l1-${suffix}@acme.com`, roleName: 'team_lead' });
  const other = await makeUser({ companyId: acme.id, email: `m5-l2-${suffix}@acme.com`, roleName: 'team_lead' });
  const team = await prisma.team.create({ data: { companyId: acme.id, branchId: hq.id, name: `M5 twolead ${suffix}` } });
  await prisma.teamMember.createMany({ data: [
    { companyId: acme.id, teamId: team.id, userId: lead.id, role: 'Lead' },
    { companyId: acme.id, teamId: team.id, userId: other.id, role: 'Lead' },
  ] });
  try {
    const r = await call('PATCH', `/api/teams/${team.id}/members/${lead.id}`, { token: tokens.owner, body: { role: 'Lead' } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.ok('isActive' in r.json.data.user, 'member response has the list shape (user.isActive)');
    const leads = await prisma.teamMember.findMany({ where: { teamId: team.id, role: 'Lead' } });
    assert.deepEqual(leads.map((l) => l.userId), [lead.id]);
  } finally {
    await prisma.teamMember.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
  }
});

check('M5-12: concurrent Lead handovers leave exactly one Lead', async () => {
  const team = await prisma.team.create({ data: { companyId: acme.id, branchId: hq.id, name: `M5 race ${suffix}` } });
  const users = [];
  for (let i = 0; i < 5; i++) {
    users.push(await makeUser({ companyId: acme.id, email: `m5-race-lead-${i}-${suffix}@acme.com`, roleName: 'team_member' }));
  }
  await prisma.teamMember.createMany({ data: users.map((u) => ({ companyId: acme.id, teamId: team.id, userId: u.id, role: 'Member' })) });
  try {
    const rs = await Promise.all(users.map((u) => call('PATCH', `/api/teams/${team.id}/members/${u.id}`, { token: tokens.owner, body: { role: 'Lead' } })));
    assert.ok(rs.every((r) => r.status === 200), rs.map((r) => r.status).join(','));
    assert.equal(await prisma.teamMember.count({ where: { teamId: team.id, role: 'Lead' } }), 1);
  } finally {
    await prisma.teamMember.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
  }
});

check('M5-11: a deactivated user cannot be added to a team', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-inactive-${suffix}@acme.com`, roleName: 'team_member' });
  await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.owner, body: { userId: u.id } })).status, 400);
});

check('M5-04: parallel role changes leave one primary role, not several', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-parallel-${suffix}@acme.com`, roleName: 'team_member' });
  const rs = await Promise.all(['process_admin', 'hr_manager', 'project_manager', 'compliance_officer'].map((role) =>
    call('PATCH', `/api/users/${u.id}`, { token: tokens.owner, body: { role } })));
  assert.ok(rs.every((r) => r.status === 200), rs.map((r) => r.status).join(','));
  assert.equal((await activeAssignments(u.id)).length, 1);
});

// ---------------------------------------------------------------- follow-ups decided after the council
check('M5-16: creating a project on a team (and naming yourself PM) does not give a PM its roster', async () => {
  const bob = await userByEmail('pm@acme.com');
  const target = await makeUser({ companyId: acme.id, email: `m5-pmbypass-${suffix}@acme.com`, roleName: 'team_member' });
  const p = await call('POST', '/api/projects', { token: tokens.pm, body: { name: `M5 bypass ${suffix}`, teamId: teamAdmin.id, pmId: bob.id } });
  assert.equal(p.status, 201, JSON.stringify(p.json));
  const projectId = p.json.data.id;
  try {
    const r = await call('POST', `/api/teams/${teamAdmin.id}/members`, { token: tokens.pm, body: { userId: target.id } });
    assert.equal(r.status, 403, JSON.stringify(r.json));
  } finally {
    await prisma.roleAssignment.deleteMany({ where: { scopeType: 'Project', scopeId: projectId } });
    await prisma.systemAuditLog.deleteMany({ where: { newValue: { path: ['projectId'], equals: projectId } } }).catch(() => {});
    await prisma.processAuditLog.deleteMany({ where: { projectId } }).catch(() => {});
    await prisma.project.delete({ where: { id: projectId } }).catch(() => {});
  }
});

// F2: a PM assignment can be created or moved by any PM through PATCH /projects (another member's
// file), so it can no longer be trusted for roster rights. PMs never change team rosters.
check('F2: a PM assigned by someone else still cannot change that project team roster', async () => {
  const bob = await userByEmail('pm@acme.com');
  const owner = await userByEmail('ceo@acme.com');
  const target = await makeUser({ companyId: acme.id, email: `m5-pmok-${suffix}@acme.com`, roleName: 'team_member' });
  const project = await prisma.project.create({ data: { companyId: acme.id, teamId: teamAdmin.id, name: `M5 assigned ${suffix}`, createdById: owner.id } });
  const pmRole = await systemRole(acme.id, 'project_manager');
  const ra = await prisma.roleAssignment.create({ data: { companyId: acme.id, userId: bob.id, roleId: pmRole.id, scopeType: 'Project', scopeId: project.id, grantedById: owner.id } });
  try {
    const add = await call('POST', `/api/teams/${teamAdmin.id}/members`, { token: tokens.pm, body: { userId: target.id } });
    assert.equal(add.status, 403, `PM add: ${JSON.stringify(add.json)}`);
    // HR still manages the roster; then the PM can neither change the role nor remove the member.
    const hrAdd = await call('POST', `/api/teams/${teamAdmin.id}/members`, { token: tokens.hr, body: { userId: target.id } });
    assert.equal(hrAdd.status, 201, `HR add: ${JSON.stringify(hrAdd.json)}`);
    // 'Member' (not 'Lead'), so a regression here could not demote the team's real Lead.
    const changeRole = await call('PATCH', `/api/teams/${teamAdmin.id}/members/${target.id}`, { token: tokens.pm, body: { role: 'Member' } });
    assert.equal(changeRole.status, 403, `PM change role: ${JSON.stringify(changeRole.json)}`);
    const remove = await call('DELETE', `/api/teams/${teamAdmin.id}/members/${target.id}`, { token: tokens.pm });
    assert.equal(remove.status, 403, `PM remove: ${JSON.stringify(remove.json)}`);
  } finally {
    await prisma.teamMember.deleteMany({ where: { teamId: teamAdmin.id, userId: target.id } });
    await prisma.roleAssignment.delete({ where: { id: ra.id } });
    await prisma.project.delete({ where: { id: project.id } });
  }
});

check('M5-08: parallel identical grants create one row', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-dupe-${suffix}@acme.com`, roleName: 'team_member' });
  const co = await systemRole(acme.id, 'compliance_officer');
  const rs = await Promise.all(Array.from({ length: 8 }, () =>
    call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: co.id } })));
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 200, 200, 200, 200, 200, 200, 201]);
  assert.equal(await prisma.roleAssignment.count({ where: { userId: u.id, roleId: co.id, revokedAt: null } }), 1);
});

check('M5-08: revoking one of several identical rows removes the access', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-dupe2-${suffix}@acme.com`, roleName: 'team_member' });
  const co = await systemRole(acme.id, 'compliance_officer');
  const rows = [];
  for (let i = 0; i < 3; i++) {
    rows.push(await prisma.roleAssignment.create({ data: { companyId: acme.id, userId: u.id, roleId: co.id, scopeType: 'Company', scopeId: acme.id } }));
  }
  assert.equal((await call('DELETE', `/api/role-assignments/${rows[0].id}`, { token: tokens.owner })).status, 200);
  assert.equal(await prisma.roleAssignment.count({ where: { userId: u.id, roleId: co.id, revokedAt: null } }), 0);
});

check('M5-08: deleting a role copies its revoked assignments into the audit log', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-hist-${suffix}@acme.com`, roleName: 'team_member' });
  const label = `M5 Hist ${suffix}`;
  const role = await prisma.role.create({ data: { companyId: acme.id, label, isSystem: false } });
  const c = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: role.id } });
  assert.equal(c.status, 201);
  assert.equal((await call('DELETE', `/api/role-assignments/${c.json.data.id}`, { token: tokens.owner })).status, 200);
  assert.equal((await call('DELETE', `/api/roles/${role.id}`, { token: tokens.owner })).status, 200);
  const entry = await prisma.systemAuditLog.findFirst({ where: { companyId: acme.id, oldValue: { path: ['deletedRoleId'], equals: role.id } } });
  assert.ok(entry, 'history audit entry missing');
  const hist = entry.oldValue.revokedAssignments;
  assert.equal(hist.length, 1);
  assert.equal(hist[0].userId, u.id);
  assert.ok(hist[0].revokedAt);
});

// ---------------------------------------------------------------- round 3: A, B, C, F, G
/** A throwaway team in HQ with the given members ([user, role] pairs). */
async function makeTeam(name, members) {
  const team = await prisma.team.create({ data: { companyId: acme.id, branchId: hq.id, name: `${name} ${suffix}` } });
  await prisma.teamMember.createMany({ data: members.map(([u, role]) => ({ companyId: acme.id, teamId: team.id, userId: u.id, role })) });
  return team;
}
async function dropTeam(team) {
  await prisma.teamMember.deleteMany({ where: { teamId: team.id } });
  await prisma.team.delete({ where: { id: team.id } });
}

check('A: a legacy "Leader" row counts as the team Lead', async () => {
  const lead = await makeUser({ companyId: acme.id, email: `m5-leader-${suffix}@acme.com`, roleName: 'team_lead' });
  const member = await makeUser({ companyId: acme.id, email: `m5-leader-m-${suffix}@acme.com`, roleName: 'team_member' });
  const extra = await makeUser({ companyId: acme.id, email: `m5-leader-x-${suffix}@acme.com`, roleName: 'team_member' });
  const team = await makeTeam('M5 leader', [[lead, 'Leader'], [member, 'Member']]);
  try {
    const leadToken = await login(lead.email);
    assert.equal((await call('POST', `/api/teams/${team.id}/members`, { token: leadToken, body: { userId: extra.id } })).status, 201, 'Leader may manage own team');
    assert.equal((await call('POST', `/api/teams/${team.id}/members`, { token: tokens.owner, body: { userId: (await makeUser({ companyId: acme.id, email: `m5-leader-y-${suffix}@acme.com`, roleName: 'team_member' })).id, role: 'Lead' } })).status, 409, 'second Lead next to a Leader');
    assert.equal((await call('DELETE', `/api/teams/${team.id}/members/${lead.id}`, { token: tokens.owner })).status, 409, 'Leader with members cannot be removed');
    const n = await call('POST', '/api/notifications', { token: leadToken, body: { userId: member.id, title: `M5 ${suffix} leader`, message: 'ok', type: 'info' } });
    assert.equal(n.status, 201, JSON.stringify(n.json));
  } finally {
    await dropTeam(team);
  }
});

check('A: "Leader" and "Team Lead" input is stored as "Lead"', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-spell-${suffix}@acme.com`, roleName: 'team_member' });
  const team = await makeTeam('M5 spell', []);
  try {
    const r = await call('POST', `/api/teams/${team.id}/members`, { token: tokens.owner, body: { userId: u.id, role: 'Team Lead' } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.data.role, 'Lead');
  } finally {
    await dropTeam(team);
  }
});

check('B: a Team Leader can notify a direct report outside the teams they lead', async () => {
  const charlie = await userByEmail('tl@acme.com');
  const report = await makeUser({ companyId: acme.id, email: `m5-report-${suffix}@acme.com`, roleName: 'team_member' });
  await prisma.user.update({ where: { id: report.id }, data: { managerUserId: charlie.id } });
  const r = await call('POST', '/api/notifications', { token: tokens.tl, body: { userId: report.id, title: `M5 ${suffix} report`, message: 'Approved', type: 'success' } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const alice = await userByEmail('ceo@acme.com');
  assert.equal((await call('POST', '/api/notifications', { token: tokens.tl, body: { userId: alice.id, title: `M5 ${suffix} x`, message: 'x', type: 'info' } })).status, 403);
});

check('C: role-assignment scope must fit the role, and the user must be active', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-fit-${suffix}@acme.com`, roleName: 'team_member' });
  const bm = await systemRole(acme.id, 'branch_manager');
  const owner = await systemRole(acme.id, 'company_owner');
  const post = (body) => call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, ...body } });
  assert.equal((await post({ roleId: bm.id, scopeType: 'Company', scopeId: acme.id })).status, 400, 'BM at Company');
  assert.equal((await post({ roleId: owner.id, scopeType: 'Branch', scopeId: hq.id })).status, 400, 'Owner at Branch');
  assert.equal((await post({ roleId: bm.id, scopeType: 'Branch', scopeId: hq.id })).status, 201, 'BM at Branch');
  const gone = await makeUser({ companyId: acme.id, email: `m5-gone-${suffix}@acme.com`, roleName: 'team_member' });
  await prisma.user.update({ where: { id: gone.id }, data: { isActive: false } });
  const r = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: gone.id, roleId: owner.id } });
  assert.equal(r.status, 400, 'role for a deactivated user');
});

check('F: a Lead with open subtasks on the team cannot be removed', async () => {
  const lead = await makeUser({ companyId: acme.id, email: `m5-sublead-${suffix}@acme.com`, roleName: 'team_lead' });
  const team = await makeTeam('M5 sub', [[lead, 'Lead']]);
  const owner = await userByEmail('ceo@acme.com');
  const project = await prisma.project.create({ data: { companyId: acme.id, teamId: team.id, name: `M5 subproj ${suffix}`, createdById: owner.id } });
  const task = await prisma.task.create({ data: { companyId: acme.id, projectId: project.id, title: 'done parent', status: 'Completed', createdById: owner.id } });
  const sub = await prisma.subtask.create({ data: { companyId: acme.id, taskId: task.id, title: 'open sub', status: 'Active', assignedToId: lead.id, createdById: owner.id } });
  try {
    const r = await call('DELETE', `/api/teams/${team.id}/members/${lead.id}`, { token: tokens.owner });
    assert.equal(r.status, 409, JSON.stringify(r.json));
  } finally {
    await prisma.subtask.delete({ where: { id: sub.id } });
    await prisma.task.delete({ where: { id: task.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await dropTeam(team);
  }
});

check('G: an email-change request does not reveal whether the address is taken', async () => {
  const u = await makeUser({ companyId: acme.id, email: `m5-probe-${suffix}@acme.com`, roleName: 'team_member' });
  const t = await login(u.email);
  const taken = await call('POST', '/api/users/me/email-change', { token: t, body: { newEmail: 'ceo@betallc.com', currentPassword: 'password123' } });
  const free = await call('POST', '/api/users/me/email-change', { token: t, body: { newEmail: `m5-free-${suffix}@acme.com`, currentPassword: 'password123' } });
  assert.equal(taken.status, 202, JSON.stringify(taken.json));
  assert.equal(free.status, 202);
  assert.equal(taken.json.message.replace('ceo@betallc.com', 'X'), free.json.message.replace(`m5-free-${suffix}@acme.com`, 'X'));
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).email, u.email);
});

// ---------------------------------------------------------------- F1 / A1 owner bootstrap
// Runs fn(ctx) with Beta LLC temporarily ownerless and holding a System Admin, like a company
// that signed up itself. Restores the seeded owner and removes everything it added.
async function withOwnerlessBeta(tag, fn) {
  const betaOwner = await userByEmail('ceo@betallc.com');
  const ownerRole = await systemRole(beta.id, 'company_owner');
  const ownerRows = await prisma.roleAssignment.findMany({ where: { userId: betaOwner.id, roleId: ownerRole.id, revokedAt: null } });
  // The Beta seed has no System Admin role; a self-registered company gets one from the template.
  let createdSysRole = null;
  if (!(await systemRole(beta.id, 'system_admin'))) {
    const tpl = await prisma.roleTemplate.findFirst({ where: { slug: 'system_admin' } });
    createdSysRole = await prisma.role.create({
      data: { companyId: beta.id, roleTemplateId: tpl.id, label: 'System Admin', name: 'system_admin', isSystem: true },
    });
  }
  await prisma.roleAssignment.updateMany({ where: { id: { in: ownerRows.map((r) => r.id) } }, data: { revokedAt: new Date() } });
  const admin = await makeUser({ companyId: beta.id, email: `${tag}-admin-${suffix}@betallc.com`, roleName: 'system_admin' });
  const extraUserIds = [];
  try {
    await fn({ ownerRole, admin, token: await login(admin.email), extraUserIds });
  } finally {
    // Remove only what this test added: owner rows its admin granted, and users made via the API.
    // Other rows of makeUser users go in teardown; then restore the seeded owner.
    await prisma.roleAssignment.deleteMany({ where: { roleId: ownerRole.id, grantedById: admin.id } });
    await prisma.roleAssignment.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: extraUserIds } } });
    await prisma.roleAssignment.updateMany({ where: { id: { in: ownerRows.map((r) => r.id) } }, data: { revokedAt: null } });
    if (createdSysRole) {
      await prisma.roleAssignment.deleteMany({ where: { roleId: createdSysRole.id } });
      await prisma.role.delete({ where: { id: createdSysRole.id } });
    }
  }
}

check('F1: a System Admin can grant Company Owner while the company has no active owner, once', async () => {
  await withOwnerlessBeta('f1', async ({ ownerRole, admin, token: t, extraUserIds }) => {
    const a = await makeUser({ companyId: beta.id, email: `f1-a-${suffix}@betallc.com`, roleName: 'team_member' });
    const b = await makeUser({ companyId: beta.id, email: `f1-b-${suffix}@betallc.com`, roleName: 'team_member' });
    const self = await call('POST', '/api/role-assignments', { token: t, body: { userId: admin.id, roleId: ownerRole.id } });
    assert.equal(self.status, 403, `self-grant: ${JSON.stringify(self.json)}`);
    const first = await call('POST', '/api/role-assignments', { token: t, body: { userId: a.id, roleId: ownerRole.id } });
    assert.equal(first.status, 201, `bootstrap: ${JSON.stringify(first.json)}`);
    const second = await call('POST', '/api/role-assignments', { token: t, body: { userId: b.id, roleId: ownerRole.id } });
    assert.equal(second.status, 403, `second owner grant: ${JSON.stringify(second.json)}`);
    assert.match(second.json.message, /Only a Company Owner/);
    const viaCreate = await call('POST', '/api/users', {
      token: t,
      body: { fullName: 'F1 Owner', email: `f1-c-${suffix}@betallc.com`, password: 'password123', role: 'company_owner' },
    });
    if (viaCreate.json?.data?.id) extraUserIds.push(viaCreate.json.data.id);
    assert.equal(viaCreate.status, 403, `create owner after bootstrap: ${JSON.stringify(viaCreate.json)}`);
    const viaPatch = await call('PATCH', `/api/users/${b.id}`, { token: t, body: { role: 'company_owner' } });
    assert.equal(viaPatch.status, 403, `patch owner after bootstrap: ${JSON.stringify(viaPatch.json)}`);
    const revoke = await call('DELETE', `/api/role-assignments/${first.json.data.id}`, { token: t });
    assert.equal(revoke.status, 403, `System Admin revoking an owner: ${JSON.stringify(revoke.json)}`);
  });
});

check('F1: an ownerless company can also get its first owner through POST /users', async () => {
  await withOwnerlessBeta('f1u', async ({ token: t, extraUserIds }) => {
    const r = await call('POST', '/api/users', {
      token: t,
      body: { fullName: 'F1 First Owner', email: `f1u-owner-${suffix}@betallc.com`, password: 'password123', role: 'company_owner' },
    });
    if (r.json?.data?.id) extraUserIds.push(r.json.data.id);
    assert.equal(r.status, 201, JSON.stringify(r.json));
  });
});

check('F1: a System Admin cannot make anyone owner of a company that has one, via PATCH', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `f1p-admin-${suffix}@acme.com`, roleName: 'system_admin' });
  const target = await makeUser({ companyId: acme.id, email: `f1p-target-${suffix}@acme.com`, roleName: 'team_member' });
  const r = await call('PATCH', `/api/users/${target.id}`, { token: await login(admin.email), body: { role: 'company_owner' } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.match(r.json.message, /Only a Company Owner/);
});

check('A1: nobody can give System Admin to a Company Owner, or Company Owner to a System Admin', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `a1-admin-${suffix}@acme.com`, roleName: 'system_admin' });
  const alice = await userByEmail('ceo@acme.com');
  const sysRole = await systemRole(acme.id, 'system_admin');
  const ownerRole = await systemRole(acme.id, 'company_owner');
  const t = await login(admin.email);
  try {
    const toOwner = await call('POST', '/api/role-assignments', { token: t, body: { userId: alice.id, roleId: sysRole.id } });
    assert.equal(toOwner.status, 403, `sysadmin to owner: ${JSON.stringify(toOwner.json)}`);
    assert.match(toOwner.json.message, /both the Company Owner and System Admin/);
    const toAdmin = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: admin.id, roleId: ownerRole.id } });
    assert.equal(toAdmin.status, 403, `owner to sysadmin: ${JSON.stringify(toAdmin.json)}`);
    assert.match(toAdmin.json.message, /both the Company Owner and System Admin/);
  } finally {
    // Without the fix the first grant succeeds and would leave the seeded owner resolving as System Admin.
    await prisma.roleAssignment.deleteMany({ where: { userId: alice.id, roleId: sysRole.id } });
  }
});

check('A1: replacing a System Admin primary role with Company Owner via PATCH is allowed', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `a1-swap-${suffix}@acme.com`, roleName: 'system_admin' });
  try {
    const r = await call('PATCH', `/api/users/${admin.id}`, { token: tokens.owner, body: { role: 'company_owner' } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const held = (await activeAssignments(admin.id)).map((ra) => ra.role.name);
    assert.deepEqual(held, ['company_owner']);
  } finally {
    // Don't leave Acme with an extra owner for tests that run after this one.
    await prisma.roleAssignment.deleteMany({ where: { userId: admin.id } });
  }
});

// ---------------------------------------------------------------- F16 notification read state
check('F16: the notifications list reports isRead from the server read state', async () => {
  const u = await makeUser({ companyId: acme.id, email: `f16-${suffix}@acme.com`, roleName: 'team_member' });
  const [first] = await Promise.all(['one', 'two'].map((n) =>
    prisma.notification.create({ data: { companyId: acme.id, userId: u.id, title: `M5 ${suffix} f16 ${n}`, message: 'x', type: 'System' } })));
  const t = await login(u.email);
  const mark = await call('PATCH', `/api/notifications/${first.id}/read`, { token: t });
  assert.equal(mark.status, 200, JSON.stringify(mark.json));
  assert.equal(mark.json.data.isRead, true);
  const r = await call('GET', '/api/notifications', { token: t });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const byId = Object.fromEntries(r.json.data.map((n) => [n.id, n]));
  assert.equal(byId[first.id].isRead, true);
  assert.ok(byId[first.id].readAt, 'readAt is still returned');
  const other = r.json.data.find((n) => n.id !== first.id);
  assert.equal(other.isRead, false);
});

// ---------------------------------------------------------------- F3 / N1 role audit
const auditEvents = async (where) =>
  (await prisma.systemAuditLog.findMany({ where: { action: 'PERMISSION_CHANGE', ...where } }))
    .map((r) => (r.newValue || r.oldValue)?.event).sort();

check('N1: granting and revoking a role writes PERMISSION_CHANGE audit rows', async () => {
  const u = await makeUser({ companyId: acme.id, email: `n1-${suffix}@acme.com`, roleName: 'team_member' });
  const co = await systemRole(acme.id, 'compliance_officer');
  const c = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: co.id } });
  assert.equal(c.status, 201, JSON.stringify(c.json));
  assert.equal((await call('DELETE', `/api/role-assignments/${c.json.data.id}`, { token: tokens.owner })).status, 200);
  assert.deepEqual(await auditEvents({ targetUserId: u.id }), ['ROLE_ASSIGNED', 'ROLE_REVOKED']);
});

check('F3: setting and changing a branch manager audits each grant and revoke', async () => {
  const m1 = await makeUser({ companyId: acme.id, email: `f3-bm1-${suffix}@acme.com`, roleName: 'team_member' });
  const m2 = await makeUser({ companyId: acme.id, email: `f3-bm2-${suffix}@acme.com`, roleName: 'team_member' });
  const created = await call('POST', '/api/branches', { token: tokens.owner, body: { name: `F3 ${suffix}`, managerUserId: m1.id } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const branch = created.json.data;
  createdBranchIds.push(branch.id);
  const patch = await call('PATCH', `/api/branches/${branch.id}`, { token: tokens.owner, body: { name: branch.name, managerUserId: m2.id } });
  assert.equal(patch.status, 200, JSON.stringify(patch.json));
  assert.deepEqual(await auditEvents({ targetUserId: m1.id, branchId: branch.id }), ['ROLE_ASSIGNED', 'ROLE_REVOKED']);
  assert.deepEqual(await auditEvents({ targetUserId: m2.id, branchId: branch.id }), ['ROLE_ASSIGNED']);
  const row = await prisma.systemAuditLog.findFirst({ where: { targetUserId: m2.id, branchId: branch.id, action: 'PERMISSION_CHANGE' } });
  assert.equal(row.performedById, (await userByEmail('ceo@acme.com')).id);
  const bmRole = await systemRole(acme.id, 'branch_manager');
  assert.deepEqual(row.newValue, { event: 'ROLE_ASSIGNED', userId: m2.id, roleId: bmRole.id, roleLabel: bmRole.label, scopeType: 'Branch', scopeId: branch.id });
});

check('N2: concurrent manager changes on one branch leave exactly one active Branch Manager', async () => {
  const people = await Promise.all([1, 2, 3, 4].map((i) =>
    makeUser({ companyId: acme.id, email: `n2-${i}-${suffix}@acme.com`, roleName: 'team_member' })));
  const branch = await prisma.branch.create({ data: { companyId: acme.id, name: `N2 ${suffix}` } });
  createdBranchIds.push(branch.id);
  const rs = await Promise.all(people.map((p) =>
    call('PATCH', `/api/branches/${branch.id}`, { token: tokens.owner, body: { name: branch.name, managerUserId: p.id } })));
  assert.ok(rs.every((r) => r.status === 200), JSON.stringify(rs.map((r) => r.status)));
  const active = await prisma.roleAssignment.count({ where: { scopeType: 'Branch', scopeId: branch.id, revokedAt: null, role: { name: 'branch_manager' } } });
  assert.equal(active, 1);
});

check('N2: concurrent branch creates with managers do not deadlock', async () => {
  const people = await Promise.all([1, 2, 3].map((i) =>
    makeUser({ companyId: acme.id, email: `n2c-${i}-${suffix}@acme.com`, roleName: 'team_member' })));
  const rs = await Promise.all(people.map((p, i) =>
    call('POST', '/api/branches', { token: tokens.owner, body: { name: `N2c ${i} ${suffix}`, managerUserId: p.id } })));
  rs.forEach((r) => r.json?.data?.id && createdBranchIds.push(r.json.data.id));
  assert.deepEqual(rs.map((r) => r.status), [201, 201, 201], JSON.stringify(rs.map((r) => r.json?.message)));
});

// ---------------------------------------------------------------- Task 6: F9
check('F9: two concurrent confirms of one link: exactly one succeeds', async () => {
  const u = await makeUser({ companyId: acme.id, email: `f9-${suffix}@acme.com`, roleName: 'team_member' });
  const { token } = buildEmailChangeToken({ userId: u.id, companyId: acme.id, tokenVersion: u.tokenVersion, newEmail: `f9-new-${suffix}@acme.com` });
  const rs = await Promise.all([1, 2].map(() => call('POST', '/api/users/email-change/confirm', { body: { token } })));
  assert.deepEqual(rs.map((r) => r.status).sort(), [200, 400]);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).email, `f9-new-${suffix}@acme.com`);
});

check('F9: an admin email change invalidates pending confirmation links', async () => {
  const u = await makeUser({ companyId: acme.id, email: `f9b-${suffix}@acme.com`, roleName: 'team_member' });
  const { token } = buildEmailChangeToken({ userId: u.id, companyId: acme.id, tokenVersion: u.tokenVersion, newEmail: `f9b-new-${suffix}@acme.com` });
  assert.equal((await call('PATCH', `/api/users/${u.id}`, { token: tokens.hr, body: { email: `f9b-admin-${suffix}@acme.com` } })).status, 200);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).tokenVersion, u.tokenVersion + 1);
  assert.equal((await call('POST', '/api/users/email-change/confirm', { body: { token } })).status, 400);
  assert.equal((await prisma.user.findUnique({ where: { id: u.id } })).email, `f9b-admin-${suffix}@acme.com`);
});

// ---------------------------------------------------------------- Task 7a: F17 / R1 / R2 user lifecycle
check('F17: a System Admin cannot deactivate themselves via PATCH', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `f17-self-${suffix}@acme.com`, roleName: 'system_admin' });
  const r = await call('PATCH', `/api/users/${admin.id}`, { token: await login(admin.email), body: { isActive: false } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal((await prisma.user.findUnique({ where: { id: admin.id } })).isActive, true);
});

check('F17: a System Admin cannot deactivate a peer System Admin via PATCH', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `f17-a-${suffix}@acme.com`, roleName: 'system_admin' });
  const peer = await makeUser({ companyId: acme.id, email: `f17-b-${suffix}@acme.com`, roleName: 'system_admin' });
  const r = await call('PATCH', `/api/users/${peer.id}`, { token: await login(admin.email), body: { isActive: false } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal((await prisma.user.findUnique({ where: { id: peer.id } })).isActive, true);
});

check('F17: the Owner can deactivate a System Admin via PATCH', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `f17-o-${suffix}@acme.com`, roleName: 'system_admin' });
  const r = await call('PATCH', `/api/users/${admin.id}`, { token: tokens.owner, body: { isActive: false } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal((await prisma.user.findUnique({ where: { id: admin.id } })).isActive, false);
});

check('R1: HR cannot reactivate a System Admin the Owner deactivated', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `r1-${suffix}@acme.com`, roleName: 'system_admin' });
  const d = await call('DELETE', `/api/users/${admin.id}`, { token: tokens.owner });
  assert.equal(d.status, 200, JSON.stringify(d.json));
  const r = await call('PATCH', `/api/users/${admin.id}/reactivate`, { token: tokens.hr });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal((await prisma.user.findUnique({ where: { id: admin.id } })).isActive, false);
});

check('R2: a System Admin cannot demote a peer System Admin', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `r2-a-${suffix}@acme.com`, roleName: 'system_admin' });
  const peer = await makeUser({ companyId: acme.id, email: `r2-b-${suffix}@acme.com`, roleName: 'system_admin' });
  const r = await call('PATCH', `/api/users/${peer.id}`, { token: await login(admin.email), body: { role: 'team_member' } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.deepEqual((await activeAssignments(peer.id)).map((ra) => ra.role.name), ['system_admin']);
});

check('R2: a System Admin cannot reset a peer System Admin password', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `r2-pa-${suffix}@acme.com`, roleName: 'system_admin' });
  const peer = await makeUser({ companyId: acme.id, email: `r2-pb-${suffix}@acme.com`, roleName: 'system_admin' });
  const r = await call('PATCH', `/api/users/${peer.id}`, { token: await login(admin.email), body: { password: 'newpassword123' } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal((await prisma.user.findUnique({ where: { id: peer.id } })).passwordHash, peer.passwordHash);
});

check('R2: a System Admin cannot revoke a peer system_admin assignment', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `r2-ra-${suffix}@acme.com`, roleName: 'system_admin' });
  const peer = await makeUser({ companyId: acme.id, email: `r2-rb-${suffix}@acme.com`, roleName: 'system_admin' });
  const [row] = await activeAssignments(peer.id);
  const r = await call('DELETE', `/api/role-assignments/${row.id}`, { token: await login(admin.email) });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal((await activeAssignments(peer.id)).length, 1);
});

check('R2: the Owner can still demote a System Admin', async () => {
  const admin = await makeUser({ companyId: acme.id, email: `r2-o-${suffix}@acme.com`, roleName: 'system_admin' });
  const r = await call('PATCH', `/api/users/${admin.id}`, { token: tokens.owner, body: { role: 'team_member' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual((await activeAssignments(admin.id)).map((ra) => ra.role.name), ['team_member']);
});

// ---------------------------------------------------------------- D2 / D3: grant rank
const createVia = async (token, tag, role, extra = {}) => {
  const email = `d2-${tag}-${suffix}@acme.com`;
  const r = await call('POST', '/api/users', { token, body: { fullName: `D2 ${tag}`, email, password: 'password123', role, ...extra } });
  const made = await userByEmail(email);
  if (made) createdUserIds.push(made.id);
  return { r, made };
};

check('D2: HR cannot create a branch_manager account', async () => {
  const branch = await prisma.branch.findFirst({ where: { companyId: acme.id } });
  const { r, made } = await createVia(tokens.hr, 'bm', 'branch_manager', { branchId: branch.id });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal(made, null);
});

check('D2: HR can still create equal- and lower-ranked accounts (hr_manager, process_admin, compliance_officer, project_manager, team_leader)', async () => {
  for (const role of ['hr_manager', 'process_admin', 'compliance_officer', 'project_manager', 'team_leader']) {
    const { r } = await createVia(tokens.hr, role, role);
    assert.equal(r.status, 201, `${role}: ${JSON.stringify(r.json)}`);
  }
});

check('D2: HR cannot grant branch_manager through /role-assignments', async () => {
  const u = await makeUser({ companyId: acme.id, email: `d2-ra-${suffix}@acme.com`, roleName: 'team_member' });
  const bm = await systemRole(acme.id, 'branch_manager');
  const branch = await prisma.branch.findFirst({ where: { companyId: acme.id } });
  const r = await call('POST', '/api/role-assignments', { token: tokens.hr, body: { userId: u.id, roleId: bm.id, scopeType: 'Branch', scopeId: branch.id } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.deepEqual((await activeAssignments(u.id)).map((ra) => ra.role.name), ['team_member']);
});

check('D2: HR cannot promote a user to branch_manager via PATCH', async () => {
  const u = await makeUser({ companyId: acme.id, email: `d2-patch-${suffix}@acme.com`, roleName: 'team_member' });
  const branch = await prisma.branch.findFirst({ where: { companyId: acme.id } });
  const r = await call('PATCH', `/api/users/${u.id}`, { token: tokens.hr, body: { role: 'branch_manager', branchId: branch.id } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.deepEqual((await activeAssignments(u.id)).map((ra) => ra.role.name), ['team_member']);
});

check('D2: the Owner can still create a branch_manager account', async () => {
  const branch = await prisma.branch.findFirst({ where: { companyId: acme.id } });
  const { r } = await createVia(tokens.owner, 'obm', 'branch_manager', { branchId: branch.id });
  assert.equal(r.status, 201, JSON.stringify(r.json));
});

const tlTeam = async () => {
  const tl = await userByEmail('tl@acme.com');
  const lead = await prisma.teamMember.findFirst({ where: { userId: tl.id, role: 'Lead' } });
  assert.ok(lead, 'tl@acme.com must lead a team in the seed');
  return lead.teamId;
};

check('D3: a Team Lead cannot add the Owner to their team', async () => {
  const teamId = await tlTeam();
  const ceo = await userByEmail('ceo@acme.com');
  const r = await call('POST', `/api/teams/${teamId}/members`, { token: tokens.tl, body: { userId: ceo.id } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  if (r.status === 201) await prisma.teamMember.deleteMany({ where: { teamId, userId: ceo.id } });
  assert.equal(await prisma.teamMember.count({ where: { teamId, userId: ceo.id } }), 0);
});

check('D3: a Team Lead can add an active team member', async () => {
  const teamId = await tlTeam();
  const u = await makeUser({ companyId: acme.id, email: `d3-tm-${suffix}@acme.com`, roleName: 'team_member' });
  const r = await call('POST', `/api/teams/${teamId}/members`, { token: tokens.tl, body: { userId: u.id } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const d = await call('DELETE', `/api/teams/${teamId}/members/${u.id}`, { token: tokens.tl });
  assert.equal(d.status, 200, JSON.stringify(d.json));
});

check('D2: GRANT_RANK keeps the same order as role resolution (roles.js SLUG_PRECEDENCE)', async () => {
  const { GRANT_RANK } = await import('./src/utils/roleAssignmentGuards.js');
  const { resolveUserRole } = await import('./src/utils/roles.js');
  const templateOf = { hr_manager: 'access_governance', team_leader: 'team_lead' };
  const ra = (slug) => ({ role: { isSystem: true, label: slug, roleTemplate: { slug: templateOf[slug] || slug } } });
  // Same role set: every slug the resolver can return appears in GRANT_RANK exactly once.
  for (const tpl of ['system_admin', 'company_owner', 'branch_manager', 'access_governance', 'process_admin', 'compliance_officer', 'project_manager', 'team_lead', 'team_member']) {
    const slug = resolveUserRole({ roleAssignments: [{ role: { isSystem: true, label: tpl, roleTemplate: { slug: tpl } } }] }).roleSlug;
    assert.equal(GRANT_RANK.filter((s) => s === slug).length, 1, `${slug} must appear once in GRANT_RANK`);
  }
  assert.equal(new Set(GRANT_RANK).size, GRANT_RANK.length);
  for (let i = 0; i + 1 < GRANT_RANK.length; i++) {
    const higher = GRANT_RANK[i], lower = GRANT_RANK[i + 1];
    assert.equal(resolveUserRole({ roleAssignments: [ra(lower), ra(higher)] }).roleSlug, higher, `${higher} should outrank ${lower}`);
  }
});

// ---------------------------------------------------------------- F12
check('F12: concurrent branch creates cannot exceed the plan branch limit', async () => {
  const current = await prisma.branch.count({ where: { companyId: beta.id } });
  const plan = await prisma.plan.create({ data: { name: `M5 tight branches ${suffix}`, maxBranches: current + 1, auditLogRetentionDays: 30, allowsIntegrations: false, isActive: true } });
  const sub = await prisma.subscription.findFirst({ where: { companyId: beta.id } });
  await prisma.subscription.update({ where: { id: sub.id }, data: { planId: plan.id } });
  invalidateCompanyAuthCache(beta.id);
  try {
    const rs = await Promise.all(Array.from({ length: 4 }, (_, i) =>
      call('POST', '/api/branches', { token: tokens.betaOwner, body: { name: `F12 race ${i} ${suffix}` } })));
    const made = await prisma.branch.findMany({ where: { companyId: beta.id, name: { contains: String(suffix) } } });
    createdBranchIds.push(...made.map((b) => b.id));
    assert.equal(rs.filter((r) => r.status === 201).length, 1, rs.map((r) => r.status).join(','));
    assert.equal(await prisma.branch.count({ where: { companyId: beta.id } }), current + 1);
  } finally {
    await prisma.subscription.update({ where: { id: sub.id }, data: { planId: sub.planId } });
    invalidateCompanyAuthCache(beta.id);
    await prisma.plan.delete({ where: { id: plan.id } }).catch(() => {});
  }
});

// ---------------------------------------------------------------- Task 9 (A2, R4, R5, L2)
check('A2: an employee cannot read the role mapping', async () => {
  assert.equal((await call('GET', '/api/users/roles/mapping', { token: tokens.member })).status, 403);
  assert.equal((await call('GET', '/api/users/roles/mapping', { token: tokens.hr })).status, 200);
});

check('R4: an employee listing users gets no deactivatedAt and no grant details', async () => {
  const r = await call('GET', '/api/users', { token: tokens.member });
  assert.equal(r.status, 200);
  assert.ok(r.json.data.length > 0);
  // Your own record is not trimmed; colleagues' records are.
  const me = await userByEmail('employee@acme.com');
  assert.ok('deactivatedAt' in r.json.data.find((u) => u.id === me.id), 'own record keeps deactivatedAt');
  for (const u of r.json.data.filter((x) => x.id !== me.id)) {
    assert.ok(!('deactivatedAt' in u), `deactivatedAt leaked for ${u.email}`);
    assert.ok(Array.isArray(u.roleAssignments), 'roleAssignments kept for picker filters');
    for (const ra of u.roleAssignments) {
      for (const k of ['grantedBy', 'grantedById', 'grantedAt']) assert.ok(!(k in ra), `${k} leaked for ${u.email}`);
      assert.ok(ra.role && 'label' in ra.role, 'role.label kept');
    }
    assert.equal(typeof u.role, 'string');
  }
  const hr = await call('GET', '/api/users', { token: tokens.hr });
  assert.equal(hr.status, 200);
  assert.ok(hr.json.data.every((u) => 'deactivatedAt' in u), 'HR still sees deactivatedAt');
});

check("R4: an employee cannot see another user's assignedTasks", async () => {
  const me = await userByEmail('employee@acme.com');
  const task = await prisma.task.findFirst({
    where: { assignedToId: { not: null, notIn: [me.id] }, deletedAt: null, project: { companyId: acme.id } },
  });
  assert.ok(task, 'seed needs a task assigned to someone other than the employee');
  const m = await call('GET', `/api/users/${task.assignedToId}`, { token: tokens.member });
  assert.equal(m.status, 200);
  assert.ok(!('assignedTasks' in m.json.data), 'assignedTasks leaked to an employee');
  assert.ok(!('deactivatedAt' in m.json.data));
  const h = await call('GET', `/api/users/${task.assignedToId}`, { token: tokens.hr });
  assert.equal(h.status, 200);
  assert.ok(Array.isArray(h.json.data.assignedTasks) && h.json.data.assignedTasks.length > 0, 'HR sees assignedTasks');
});

check('R5: an employee outside a team gets no projects from GET /teams/:id', async () => {
  const me = await userByEmail('employee@acme.com');
  const team = await prisma.team.findFirst({
    where: { companyId: acme.id, teamMembers: { none: { userId: me.id } }, projects: { some: {} } },
  });
  assert.ok(team, 'seed needs a team with projects that the employee is not in');
  const m = await call('GET', `/api/teams/${team.id}`, { token: tokens.member });
  assert.equal(m.status, 200);
  assert.ok(!('projects' in m.json.data), 'projects leaked to a non-member');
  for (const tm of m.json.data.teamMembers) assert.ok(!('email' in tm.user), 'member email leaked to a non-member');
  const h = await call('GET', `/api/teams/${team.id}`, { token: tokens.hr });
  assert.ok(Array.isArray(h.json.data.projects) && h.json.data.projects.length > 0, 'HR sees projects');
  assert.ok(h.json.data.teamMembers.every((tm) => 'email' in tm.user), 'HR sees member emails');
  // A member of their own team still sees its projects and roster emails.
  const mine = await prisma.team.findFirst({ where: { teamMembers: { some: { userId: me.id } } } });
  if (mine) {
    const own = await call('GET', `/api/teams/${mine.id}`, { token: tokens.member });
    assert.ok(Array.isArray(own.json.data.projects), 'member sees own team projects');
    assert.ok(own.json.data.teamMembers.every((tm) => 'email' in tm.user), 'member sees own roster emails');
  }
});

check('R5: an employee gets no project rows from GET /branches/:id for teams they are not in', async () => {
  const me = await userByEmail('employee@acme.com');
  const team = await prisma.team.findFirst({
    where: { companyId: acme.id, teamMembers: { none: { userId: me.id } }, projects: { some: {} } },
  });
  const m = await call('GET', `/api/branches/${team.branchId}`, { token: tokens.member });
  assert.equal(m.status, 200);
  const myTeamIds = new Set((await prisma.teamMember.findMany({ where: { userId: me.id } })).map((t) => t.teamId));
  for (const t of m.json.data.teams) {
    if (!myTeamIds.has(t.id)) assert.ok(!('projects' in t), `projects of team ${t.name} leaked`);
  }
  const h = await call('GET', `/api/branches/${team.branchId}`, { token: tokens.hr });
  const hrTeam = h.json.data.teams.find((t) => t.id === team.id);
  assert.ok(Array.isArray(hrTeam.projects) && hrTeam.projects.length > 0, 'HR sees projects');
});

check('L2: GET /users returns role = highest-precedence slug for a user with two roles', async () => {
  const u = await makeUser({ companyId: acme.id, email: `l2-two-${suffix}@acme.com`, roleName: 'team_member' });
  const pmRole = await systemRole(acme.id, 'project_manager');
  await prisma.roleAssignment.create({ data: { companyId: acme.id, userId: u.id, roleId: pmRole.id, scopeType: 'Company', scopeId: acme.id } });
  const r = await call('GET', `/api/users/${u.id}`, { token: tokens.hr });
  assert.equal(r.status, 200);
  assert.equal(r.json.data.role, 'project_manager');
  const list = await call('GET', '/api/users', { token: tokens.member });
  assert.equal(list.json.data.find((x) => x.id === u.id).role, 'project_manager');
});

// ---------------------------------------------------------------- Task 10: role and team integrity
check('R3: a legacy NULL-companyId system_admin row still blocks granting Company Owner', async () => {
  const u = await makeUser({ companyId: acme.id, email: `r3-legacy-${suffix}@acme.com`, roleName: 'team_member' });
  const admin = await systemRole(acme.id, 'system_admin');
  const owner = await systemRole(acme.id, 'company_owner');
  await prisma.roleAssignment.create({ data: { companyId: null, userId: u.id, roleId: admin.id, scopeType: 'Company', scopeId: acme.id } });
  const r = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: u.id, roleId: owner.id, scopeType: 'Company', scopeId: acme.id } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.match(r.json.message, /cannot hold both/);
});

check('R9: an inactive member cannot be made Lead', async () => {
  const u = await makeUser({ companyId: acme.id, email: `r9-${suffix}@acme.com`, roleName: 'team_member' });
  const leadBefore = await prisma.teamMember.findMany({ where: { teamId: teamCore.id, role: { in: ['Lead', 'Leader'] } } });
  const add = await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.hr, body: { userId: u.id } });
  assert.equal(add.status, 201, JSON.stringify(add.json));
  await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
  const r = await call('PATCH', `/api/teams/${teamCore.id}/members/${u.id}`, { token: tokens.hr, body: { role: 'Lead' } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
  assert.equal(r.json.message, 'A deactivated user cannot be made team Lead');
  const leadAfter = await prisma.teamMember.findMany({ where: { teamId: teamCore.id, role: { in: ['Lead', 'Leader'] } } });
  assert.deepEqual(leadAfter.map((m) => [m.userId, m.role]), leadBefore.map((m) => [m.userId, m.role]));
});

check('R12: a second branch_manager grant on the same branch leaves one active manager', async () => {
  const a = await makeUser({ companyId: acme.id, email: `r12-a-${suffix}@acme.com`, roleName: 'team_member' });
  const b = await makeUser({ companyId: acme.id, email: `r12-b-${suffix}@acme.com`, roleName: 'team_member' });
  const created = await call('POST', '/api/branches', { token: tokens.owner, body: { name: `R12 ${suffix}`, managerUserId: a.id } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const branchId = created.json.data.id;
  createdBranchIds.push(branchId);
  const bm = await systemRole(acme.id, 'branch_manager');
  const r = await call('POST', '/api/role-assignments', { token: tokens.owner, body: { userId: b.id, roleId: bm.id, scopeType: 'Branch', scopeId: branchId } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const active = await prisma.roleAssignment.findMany({ where: { scopeType: 'Branch', scopeId: branchId, roleId: bm.id, revokedAt: null } });
  assert.deepEqual(active.map((ra) => ra.userId), [b.id]);
  const revokeAudit = await prisma.systemAuditLog.findFirst({ where: { targetUserId: a.id, action: 'PERMISSION_CHANGE', oldValue: { path: ['event'], equals: 'ROLE_REVOKED' } } });
  assert.ok(revokeAudit, 'revoke of the previous manager is audited');
});

/** Team-delete tests: audit rows of teams this run created carry the suffix in the team name. */
const cleanTeamAudit = () => prisma.systemAuditLog.deleteMany({
  where: {
    companyId: acme.id,
    OR: [
      { newValue: { path: ['name'], string_contains: String(suffix) } },
      { newValue: { path: ['deletedTeamName'], string_contains: String(suffix) } },
    ],
  },
}).catch(() => {});

check('R7: deleting a team revokes its Team-scoped role grants', async () => {
  const made = await call('POST', '/api/teams', { token: tokens.hr, body: { name: `R7 ${suffix}`, branchId: hq.id } });
  assert.equal(made.status, 201, JSON.stringify(made.json));
  const teamId = made.json.data.id;
  try {
    const u = await makeUser({ companyId: acme.id, email: `r7-${suffix}@acme.com`, roleName: 'team_member' });
    const tl = await systemRole(acme.id, 'team_lead');
    const ra = await prisma.roleAssignment.create({ data: { companyId: acme.id, userId: u.id, roleId: tl.id, scopeType: 'Team', scopeId: teamId } });
    const r = await call('DELETE', `/api/teams/${teamId}`, { token: tokens.hr });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const after = await prisma.roleAssignment.findUnique({ where: { id: ra.id } });
    assert.ok(after.revokedAt, 'Team-scoped grant is revoked');
    const audit = await prisma.systemAuditLog.findFirst({ where: { targetUserId: u.id, action: 'PERMISSION_CHANGE', oldValue: { path: ['event'], equals: 'ROLE_REVOKED' } } });
    assert.ok(audit, 'revoke is audited');
  } finally {
    await prisma.team.deleteMany({ where: { id: teamId } }).catch(() => {});
    await cleanTeamAudit();
  }
});

check('R6: a team whose only project is soft-deleted is not reported as having projects', async () => {
  const made = await call('POST', '/api/teams', { token: tokens.hr, body: { name: `R6 ${suffix}`, branchId: hq.id } });
  assert.equal(made.status, 201, JSON.stringify(made.json));
  const teamId = made.json.data.id;
  const owner = await userByEmail('ceo@acme.com');
  const project = await prisma.project.create({
    data: { companyId: acme.id, teamId, name: `R6 ${suffix}`, createdById: owner.id, deletedAt: new Date() },
  });
  try {
    const get = await call('GET', `/api/teams/${teamId}`, { token: tokens.hr });
    assert.deepEqual(get.json.data.projects, [], 'soft-deleted project is not listed');
    const r = await call('DELETE', `/api/teams/${teamId}`, { token: tokens.hr });
    // Project.teamId is required with ON DELETE RESTRICT, so an archived project keeps its team.
    assert.equal(r.status, 409, JSON.stringify(r.json));
    assert.equal(r.json.message, 'Cannot delete team: it still holds 1 archived project(s)');
    assert.doesNotMatch(r.json.message, /currently assigned/);
  } finally {
    await prisma.project.deleteMany({ where: { id: project.id } }).catch(() => {});
    await prisma.team.deleteMany({ where: { id: teamId } }).catch(() => {});
    await cleanTeamAudit();
  }
});

check('R12: creating a Branch Manager without a branch never replaces the default branch manager', async () => {
  const first = await prisma.branch.findFirst({ where: { companyId: acme.id }, orderBy: { createdAt: 'asc' } });
  const bmRole = await systemRole(acme.id, 'branch_manager');
  const before = await prisma.roleAssignment.count({ where: { roleId: bmRole.id, scopeType: 'Branch', scopeId: first.id, revokedAt: null } });
  const email = `r12-default-${suffix}@acme.com`;
  const r = await call('POST', '/api/users', { token: tokens.owner, body: { fullName: 'R12 default', email, password: 'password123', role: 'branch_manager' } });
  const made = await userByEmail(email);
  if (made) createdUserIds.push(made.id);
  if (before > 0) {
    assert.equal(r.status, 400, JSON.stringify(r.json));
    assert.equal(await prisma.roleAssignment.count({ where: { roleId: bmRole.id, scopeType: 'Branch', scopeId: first.id, revokedAt: null } }), before);
  } else {
    assert.equal(r.status, 201, JSON.stringify(r.json));
  }
});

// ---------------------------------------------------------------- R10 / R16 / R13 / R17 input and audit hygiene
check('R10: POST /roles with no body returns 400', async () => {
  const r = await call('POST', '/api/roles', { token: tokens.hr });
  assert.equal(r.status, 400, JSON.stringify(r.json));
});

check('R10: POST /roles with a non-string label returns 400', async () => {
  const r = await call('POST', '/api/roles', { token: tokens.hr, body: { label: 123 } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
});

check('R10: POST /teams with a non-string name returns 400', async () => {
  const r = await call('POST', '/api/teams', { token: tokens.hr, body: { name: ['x'], branchId: hq.id } });
  assert.equal(r.status, 400, JSON.stringify(r.json));
});

check('R16: PUT/PATCH role permissions without permissionSlugs is refused and leaves permissions unchanged', async () => {
  const slugs = (await prisma.permission.findMany({ take: 2, orderBy: { slug: 'asc' } })).map((p) => p.slug);
  assert.ok(slugs.length > 0, 'seeded permissions exist');
  const made = await call('POST', '/api/roles', { token: tokens.hr, body: { label: `R16 ${suffix}`, permissionSlugs: slugs } });
  assert.equal(made.status, 201, JSON.stringify(made.json));
  const roleId = made.json.data.id;
  const count = () => prisma.rolePermission.count({ where: { roleId } });
  try {
    assert.equal(await count(), slugs.length);
    for (const method of ['PUT', 'PATCH']) {
      const empty = await call(method, `/api/roles/${roleId}/permissions`, { token: tokens.hr, body: {} });
      assert.equal(empty.status, 400, `${method} {}: ${JSON.stringify(empty.json)}`);
      assert.equal(await count(), slugs.length, 'permissions are not wiped');
    }
    const unknown = await call('PUT', `/api/roles/${roleId}/permissions`, { token: tokens.hr, body: { permissionSlugs: [slugs[0], `nope-${suffix}`] } });
    assert.equal(unknown.status, 400, JSON.stringify(unknown.json));
    assert.match(unknown.json.message, new RegExp(`nope-${suffix}`));
    assert.equal(await count(), slugs.length);
  } finally {
    const del = await call('DELETE', `/api/roles/${roleId}`, { token: tokens.hr });
    if (del.status !== 200) await prisma.role.delete({ where: { id: roleId } }).catch(() => {});
  }
});

check('R13: creating a user with a role writes a PERMISSION_CHANGE ROLE_ASSIGNED row', async () => {
  const email = `r13-create-${suffix}@acme.com`;
  const r = await call('POST', '/api/users', { token: tokens.hr, body: { fullName: 'R13 create', email, password: 'password123', role: 'team_member' } });
  const made = await userByEmail(email);
  if (made) createdUserIds.push(made.id);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.deepEqual(await auditEvents({ targetUserId: made.id }), ['ROLE_ASSIGNED']);
  assert.equal(await prisma.systemAuditLog.count({ where: { targetUserId: made.id, action: 'CREATE' } }), 1, 'CREATE audit is kept');
});

check('R13: a PATCH role change writes ROLE_REVOKED and ROLE_ASSIGNED rows', async () => {
  const u = await makeUser({ companyId: acme.id, email: `r13-patch-${suffix}@acme.com`, roleName: 'team_member' });
  const r = await call('PATCH', `/api/users/${u.id}`, { token: tokens.owner, body: { role: 'compliance_officer' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(await auditEvents({ targetUserId: u.id }), ['ROLE_ASSIGNED', 'ROLE_REVOKED']);
  const tm = await systemRole(acme.id, 'team_member');
  const revoked = await prisma.systemAuditLog.findFirst({ where: { targetUserId: u.id, action: 'PERMISSION_CHANGE', oldValue: { path: ['event'], equals: 'ROLE_REVOKED' } } });
  assert.equal(revoked.oldValue.roleId, tm.id);
  assert.equal(await prisma.systemAuditLog.count({ where: { targetUserId: u.id, action: 'UPDATE' } }), 1, 'UPDATE audit is kept');
});

check('R17: POST /users with roleId assigns exactly that role, even for a custom role labelled "Lead"', async () => {
  const custom = await prisma.role.create({ data: { companyId: acme.id, label: 'Lead', name: `r17_lead_${suffix}`, isSystem: false } });
  try {
    const email = `r17-${suffix}@acme.com`;
    const r = await call('POST', '/api/users', { token: tokens.hr, body: { fullName: 'R17', email, password: 'password123', role: 'Lead', roleId: custom.id } });
    const made = await userByEmail(email);
    if (made) createdUserIds.push(made.id);
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.deepEqual((await activeAssignments(made.id)).map((ra) => ra.roleId), [custom.id]);
    // A roleId is an id: it never falls back to label or slug resolution.
    const bad = await call('POST', '/api/users', { token: tokens.hr, body: { fullName: 'R17 bad', email: `r17-bad-${suffix}@acme.com`, password: 'password123', roleId: 'lead' } });
    const badUser = await userByEmail(`r17-bad-${suffix}@acme.com`);
    if (badUser) createdUserIds.push(badUser.id);
    assert.equal(bad.status, 400, JSON.stringify(bad.json));
  } finally {
    await prisma.roleAssignment.deleteMany({ where: { roleId: custom.id } }).catch(() => {});
    await prisma.role.delete({ where: { id: custom.id } }).catch((e) => console.warn('R17 cleanup:', e.message));
  }
});

// ---------------------------------------------------------------- final review fixes
check('R19: GET /teams hides other teams\' projects and roster emails from an employee', async () => {
  const me = await userByEmail('employee@acme.com');
  const r = await call('GET', '/api/teams', { token: tokens.member });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const teams = r.json.data;
  const foreign = teams.filter((t) => !(t.teamMembers || []).some((tm) => tm.userId === me.id));
  assert.ok(foreign.length > 0, 'seed has a team the employee is not in');
  for (const t of foreign) {
    assert.equal(t.projects, undefined, `projects of ${t.name}`);
    assert.ok((t.teamMembers || []).every((tm) => !tm.user || tm.user.email === undefined), `emails of ${t.name}`);
  }
  const hr = await call('GET', '/api/teams', { token: tokens.hr });
  assert.ok(hr.json.data.some((t) => Array.isArray(t.projects)), 'HR still gets projects');
});

check('R12/D1: a System Admin cannot replace a peer System Admin who manages the branch; the Owner can', async () => {
  const bmRole = await systemRole(acme.id, 'branch_manager');
  const created = await call('POST', '/api/branches', { token: tokens.owner, body: { name: `D1 BM ${suffix}` } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const branchId = created.json.data.id;
  createdBranchIds.push(branchId);
  const adminY = await makeUser({ companyId: acme.id, email: `d1bm-y-${suffix}@acme.com`, roleName: 'system_admin' });
  await prisma.roleAssignment.create({ data: { companyId: acme.id, userId: adminY.id, roleId: bmRole.id, scopeType: 'Branch', scopeId: branchId } });
  const adminZ = await makeUser({ companyId: acme.id, email: `d1bm-z-${suffix}@acme.com`, roleName: 'system_admin' });
  const target = await makeUser({ companyId: acme.id, email: `d1bm-x-${suffix}@acme.com`, roleName: 'team_member' });
  const body = { userId: target.id, roleId: bmRole.id, scopeType: 'Branch', scopeId: branchId };
  const bySa = await call('POST', '/api/role-assignments', { token: await login(adminZ.email), body });
  assert.equal(bySa.status, 403, JSON.stringify(bySa.json));
  const stillY = await prisma.roleAssignment.count({ where: { userId: adminY.id, roleId: bmRole.id, scopeId: branchId, revokedAt: null } });
  assert.equal(stillY, 1, "the peer admin's grant is untouched");
  const byOwner = await call('POST', '/api/role-assignments', { token: tokens.owner, body });
  assert.equal(byOwner.status, 201, JSON.stringify(byOwner.json));
  const active = await prisma.roleAssignment.findMany({ where: { roleId: bmRole.id, scopeType: 'Branch', scopeId: branchId, revokedAt: null } });
  assert.deepEqual(active.map((a) => a.userId), [target.id]);
});

check('D1: /branches cannot replace a peer System Admin who manages the branch; the Owner can', async () => {
  const bmRole = await systemRole(acme.id, 'branch_manager');
  const adminY = await makeUser({ companyId: acme.id, email: `d1br-y-${suffix}@acme.com`, roleName: 'system_admin' });
  const adminZ = await makeUser({ companyId: acme.id, email: `d1br-z-${suffix}@acme.com`, roleName: 'system_admin' });
  const target = await makeUser({ companyId: acme.id, email: `d1br-x-${suffix}@acme.com`, roleName: 'team_member' });
  const created = await call('POST', '/api/branches', { token: tokens.owner, body: { name: `D1 BR ${suffix}`, managerUserId: adminY.id } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const branchId = created.json.data.id;
  createdBranchIds.push(branchId);
  const bySa = await call('PATCH', `/api/branches/${branchId}`, { token: await login(adminZ.email), body: { name: `D1 BR ${suffix}`, managerUserId: target.id } });
  assert.equal(bySa.status, 403, JSON.stringify(bySa.json));
  assert.equal(await prisma.roleAssignment.count({ where: { userId: adminY.id, roleId: bmRole.id, scopeId: branchId, revokedAt: null } }), 1);
  const byHr = await call('PATCH', `/api/branches/${branchId}`, { token: tokens.hr, body: { name: `D1 BR ${suffix}`, managerUserId: target.id } });
  assert.equal(byHr.status, 403, JSON.stringify(byHr.json));
  const byOwner = await call('PATCH', `/api/branches/${branchId}`, { token: tokens.owner, body: { name: `D1 BR ${suffix}`, managerUserId: target.id } });
  assert.equal(byOwner.status, 200, JSON.stringify(byOwner.json));
  const active = await prisma.roleAssignment.findMany({ where: { roleId: bmRole.id, scopeType: 'Branch', scopeId: branchId, revokedAt: null } });
  assert.deepEqual(active.map((a) => a.userId), [target.id]);
});

check('R2: a System Admin cannot change a peer System Admin email', async () => {
  const a = await makeUser({ companyId: acme.id, email: `r2e-a-${suffix}@acme.com`, roleName: 'system_admin' });
  const b = await makeUser({ companyId: acme.id, email: `r2e-b-${suffix}@acme.com`, roleName: 'system_admin' });
  const r = await call('PATCH', `/api/users/${b.id}`, { token: await login(a.email), body: { email: `r2e-b2-${suffix}@acme.com` } });
  assert.equal(r.status, 403, JSON.stringify(r.json));
  assert.equal((await prisma.user.findUnique({ where: { id: b.id } })).email, `r2e-b-${suffix}@acme.com`);
});

check('D2: HR cannot name a Branch Manager through /branches (create or update), but can still manage branches', async () => {
  const puppet = await makeUser({ companyId: acme.id, email: `d2br-${suffix}@acme.com`, roleName: 'team_member' });
  const withMgr = await call('POST', '/api/branches', { token: tokens.hr, body: { name: `D2 BR ${suffix}`, managerUserId: puppet.id } });
  if (withMgr.json?.data?.id) createdBranchIds.push(withMgr.json.data.id);
  assert.equal(withMgr.status, 403, JSON.stringify(withMgr.json));
  const plain = await call('POST', '/api/branches', { token: tokens.hr, body: { name: `D2 BR plain ${suffix}` } });
  assert.equal(plain.status, 201, JSON.stringify(plain.json));
  createdBranchIds.push(plain.json.data.id);
  const upd = await call('PATCH', `/api/branches/${plain.json.data.id}`, { token: tokens.hr, body: { name: `D2 BR plain ${suffix}`, managerUserId: puppet.id } });
  assert.equal(upd.status, 403, JSON.stringify(upd.json));
  assert.equal(await prisma.roleAssignment.count({ where: { userId: puppet.id, revokedAt: null, scopeType: 'Branch' } }), 0);
});

// ---------------------------------------------------------------- runner
let failed = 0;
try {
  await setup();
  for (const [name, fn] of results) {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
    } catch (err) {
      failed++;
      console.log(`  FAIL  ${name}\n        ${err.message.split('\n')[0]}`);
    }
  }
} finally {
  await teardown();
  server.close();
  await prisma.$disconnect();
}
console.log(failed ? `\n${failed} test(s) failed` : `\nAll ${results.length} tests passed`);
process.exit(failed ? 1 : 0);
