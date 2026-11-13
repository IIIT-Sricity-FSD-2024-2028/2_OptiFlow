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

check('M5-16: member endpoints respect branch, team-lead and PM scope', async () => {
  const bm = await makeUser({ companyId: acme.id, email: `m5-bmwest-${suffix}@acme.com`, roleName: 'branch_manager', scopeType: 'Branch', scopeId: west.id });
  const target = await makeUser({ companyId: acme.id, email: `m5-scoped-${suffix}@acme.com`, roleName: 'team_member' });
  const bmToken = await login(bm.email);
  // teamCore is in the New York branch.
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: bmToken, body: { userId: target.id } })).status, 403);
  // tl2 (Lucas) leads Sales, not Core.
  assert.equal((await call('POST', `/api/teams/${teamCore.id}/members`, { token: tokens.tl2, body: { userId: target.id } })).status, 403);
  // Bob has no project on the Admin Support team.
  const bob = await userByEmail('pm@acme.com');
  const bobOnAdmin = await prisma.project.count({ where: { teamId: teamAdmin.id, createdById: bob.id, deletedAt: null } });
  assert.equal(bobOnAdmin, 0, 'fixture assumption');
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

check('M5-16: a PM assigned by someone else may manage that project team', async () => {
  const bob = await userByEmail('pm@acme.com');
  const owner = await userByEmail('ceo@acme.com');
  const target = await makeUser({ companyId: acme.id, email: `m5-pmok-${suffix}@acme.com`, roleName: 'team_member' });
  const project = await prisma.project.create({ data: { companyId: acme.id, teamId: teamAdmin.id, name: `M5 assigned ${suffix}`, createdById: owner.id } });
  const pmRole = await systemRole(acme.id, 'project_manager');
  const ra = await prisma.roleAssignment.create({ data: { companyId: acme.id, userId: bob.id, roleId: pmRole.id, scopeType: 'Project', scopeId: project.id, grantedById: owner.id } });
  try {
    const r = await call('POST', `/api/teams/${teamAdmin.id}/members`, { token: tokens.pm, body: { userId: target.id } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
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
