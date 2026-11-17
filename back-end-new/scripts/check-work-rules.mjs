// API check for the Member 3 (PM / Team Lead) security rules.
// Needs the server running and the default seed. Creates one throwaway project
// (soft-deleted at the end). Usage: node scripts/check-work-rules.mjs
const BASE = process.env.API_URL || 'http://localhost:5500/api';

// This script logs in with the seed accounts and writes data; never point it at a shared server.
if (!['localhost', '127.0.0.1'].includes(new URL(BASE).hostname) || process.env.NODE_ENV === 'production') {
  console.error(`Refusing to run against ${BASE}: use a local server and the development seed.`);
  process.exit(2);
}
const PASSWORD = 'password123'; // seed password for all test accounts

async function call(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(email) {
  const { status, data } = await call(null, 'POST', '/auth/login', { email, password: PASSWORD });
  if (status !== 200) throw new Error(`login ${email} failed: ${status} ${data?.message}`);
  return data.token || data.data?.token;
}

let failed = 0;
function expect(name, actual, expected) {
  const ok = Array.isArray(expected) ? expected.includes(actual) : actual === expected;
  console.log(`${ok ? '+' : 'x'} ${name}: got ${actual}, want ${expected}`);
  if (!ok) failed += 1;
}

const ceo = await login('ceo@acme.com');
const pm = await login('pm@acme.com');
const pm2 = await login('pm2@acme.com');
const tl = await login('tl@acme.com');
const member = await login('employee@acme.com');

const teams = (await call(ceo, 'GET', '/teams')).data?.data || [];
const team = teams[0];
const users = (await call(ceo, 'GET', '/users')).data?.data || [];
const pmUser = users.find((u) => u.email === 'pm@acme.com');

// SEC-M3-07: validation
expect('invalid project status -> 400', (await call(ceo, 'POST', '/projects', { name: 'x', teamId: team.id, status: 'Bogus' })).status, 400);
expect('start after target -> 400', (await call(ceo, 'POST', '/projects', { name: 'x', teamId: team.id, startDate: '2027-02-01', targetDate: '2027-01-01' })).status, 400);
expect('bad date -> 400', (await call(ceo, 'POST', '/projects', { name: 'x', teamId: team.id, startDate: 'not-a-date' })).status, 400);

// SEC-M3-01: PM id validation
expect('unknown pmId -> 400', (await call(ceo, 'POST', '/projects', { name: 'x', teamId: team.id, projectManagerId: '00000000-0000-0000-0000-000000000000' })).status, 400);

// Create a throwaway project owned by pm@acme.com
const created = await call(ceo, 'POST', '/projects', {
  name: `ZZ scope check ${Date.now()}`, teamId: team.id, status: 'Active', projectManagerId: pmUser?.id,
});
expect('create project with valid PM -> 201', created.status, 201);
const project = created.data?.data;
expect('create returns list shape (tasks array)', Array.isArray(project?.tasks), true);

// SEC-M3-04: assigned PM sees the project
const pmView = await call(pm, 'GET', `/projects/${project.id}`);
expect('assigned PM can read project', pmView.status, 200);

// SEC-M3-02: another PM cannot edit or delete it
expect('other PM update -> 403', (await call(pm2, 'PATCH', `/projects/${project.id}`, { name: 'hijack' })).status, 403);
expect('other PM delete -> 403', (await call(pm2, 'DELETE', `/projects/${project.id}`)).status, 403);
// SEC-M3-03: other PM cannot create tasks in it
expect('other PM create task -> 403', (await call(pm2, 'POST', '/tasks', { title: 't', projectId: project.id })).status, 403);

// Task flow
const taskRes = await call(pm, 'POST', '/tasks', { title: 'scope check task', projectId: project.id, dueDate: 'nope' });
expect('bad dueDate -> 400', taskRes.status, 400);
const t = await call(pm, 'POST', '/tasks', { title: 'scope check task', projectId: project.id, status: 'Active' });
expect('assigned PM create task -> 201', t.status, 201);
const task = t.data?.data;

// SEC-M3-23: the server notifies the assigned Team Lead (no browser-created notifications).
if (task) {
  const tlNotes = (await call(tl, 'GET', '/notifications')).data;
  const list = Array.isArray(tlNotes) ? tlNotes : tlNotes?.data || [];
  expect('TL notified of new task (server-side)', list.some((n) => String(n.message).includes(task.title)), true);
}

if (task) {
  // SEC-M3-09: pmApproval only on In_Review -> Completed
  expect('pmApproval from Active -> 400', (await call(pm, 'PATCH', `/tasks/${task.id}`, { status: 'Completed', pmApproval: true })).status, 400);
  // SEC-M3-13: due date change needs reason for non-managers (TL may not be assignee in this team)
  const tlChange = await call(tl, 'PATCH', `/tasks/${task.id}`, { dueDate: '2030-01-01' });
  expect('TL due date change without reason -> 400', tlChange.status, 400);
  // SEC-M3-22: a member who is not the assignee cannot change the task
  expect('member patch parent -> 403', (await call(member, 'PATCH', `/tasks/${task.id}`, { status: 'In_Review' })).status, 403);
  // Deadlines: no past dates; subtask due on or before the task due date.
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  expect('task dueDate yesterday -> 400', (await call(pm, 'POST', '/tasks', { title: 'past', projectId: project.id, dueDate: day(-1) })).status, 400);
  expect('task dueDate today -> 200', (await call(pm, 'PATCH', `/tasks/${task.id}`, { dueDate: day(0) })).status, 200);
  expect('task dueDate +10 -> 200', (await call(pm, 'PATCH', `/tasks/${task.id}`, { dueDate: day(10) })).status, 200);
  expect('subtask dueDate yesterday -> 400', (await call(pm, 'POST', '/subtasks', { taskId: task.id, title: 'p', dueDate: day(-1) })).status, 400);
  expect('subtask after task due -> 400', (await call(pm, 'POST', '/subtasks', { taskId: task.id, title: 'late', dueDate: day(11) })).status, 400);
  const okSub = await call(pm, 'POST', '/subtasks', { taskId: task.id, title: 'on time', dueDate: day(5) });
  expect('subtask before task due -> 201', okSub.status, 201);
  expect('subtask moved after task due -> 400', (await call(pm, 'PATCH', `/subtasks/${okSub.data?.data?.id}`, { dueDate: day(12) })).status, 400);
  expect('task due moved before subtask -> 400', (await call(pm, 'PATCH', `/tasks/${task.id}`, { dueDate: day(3) })).status, 400);
  expect('project targetDate yesterday -> 400', (await call(ceo, 'PATCH', `/projects/${project.id}`, { targetDate: day(-1) })).status, 400);

  // SEC-M3-08: Team Lead cannot complete the parent task
  const tlComplete = await call(tl, 'PATCH', `/tasks/${task.id}`, { status: 'Completed' });
  expect('TL completes parent -> 403', tlComplete.status, 403);
  // SEC-M3-19: member submits own subtask for review, cannot complete it
  const memberUser = users.find((u) => u.email === 'employee@acme.com');
  const mSub = await call(pm, 'POST', '/subtasks', { taskId: task.id, title: 'member st', status: 'Active', assignedToId: memberUser?.id });
  if (mSub.status === 201) {
    expect('member completes own subtask -> 403', (await call(member, 'PATCH', `/subtasks/${mSub.data.data.id}`, { status: 'Completed' })).status, 403);
    expect('member submits own subtask -> 200', (await call(member, 'PATCH', `/subtasks/${mSub.data.data.id}`, { status: 'In_Review' })).status, 200);
    // Sending a submitted subtask back needs a reason, which the member then sees.
    expect('send back without reason -> 400', (await call(pm, 'PATCH', `/subtasks/${mSub.data.data.id}`, { status: 'Active' })).status, 400);
    const sentBack = await call(pm, 'PATCH', `/subtasks/${mSub.data.data.id}`, { status: 'Active', reviewComment: 'Add the test results' });
    expect('send back with reason -> 200', sentBack.status, 200);
    const memberView = await call(member, 'GET', `/tasks/${task.id}`);
    const seen = memberView.data?.data?.subtasks?.find((s) => s.id === mSub.data.data.id);
    expect('member sees send-back reason', seen?.reviewComment, 'Add the test results');
    await call(member, 'PATCH', `/subtasks/${mSub.data.data.id}`, { status: 'In_Review' });
    const approved = await call(pm, 'PATCH', `/subtasks/${mSub.data.data.id}`, { status: 'Completed' });
    expect('approval clears reason', approved.data?.data?.reviewComment ?? null, null);
  } else {
    console.log(`- member subtask checks skipped (${mSub.status} ${mSub.data?.message})`);
  }
  const sub = await call(pm, 'POST', '/subtasks', { taskId: task.id, title: 'st', status: 'Completed' });
  expect('subtask created Completed stamps completedAt', Boolean(sub.data?.data?.completedAt), true);
  await call(pm, 'DELETE', `/tasks/${task.id}`);
  expect('subtask hidden after parent delete', (await call(pm, 'GET', `/subtasks/${sub.data?.data?.id}`)).status, 404);
}

// SEC-M3-21: member escalations are scoped
const memberEsc = (await call(member, 'GET', '/escalations')).data?.data || [];
const ceoEsc = (await call(ceo, 'GET', '/escalations')).data?.data || [];
const memberId = users.find((u) => u.email === 'employee@acme.com')?.id;
expect(
  'member sees only escalations they raised or were sent',
  memberEsc.every((e) => e.reportedById === memberId || e.targetManagerId === memberId),
  true
);
expect('owner sees at least as many as the member', ceoEsc.length >= memberEsc.length, true);

// SEC-M3-05: reassigning the PM revokes only the previous PM's access.
const pm2User = users.find((u) => u.email === 'pm2@acme.com');
expect('reassign PM to pm2 -> 200', (await call(ceo, 'PATCH', `/projects/${project.id}`, { projectManagerId: pm2User?.id })).status, 200);
expect('previous PM can no longer edit -> 403', (await call(pm, 'PATCH', `/projects/${project.id}`, { description: 'old pm edit' })).status, 403);
expect('new PM can edit -> 200', (await call(pm2, 'PATCH', `/projects/${project.id}`, { description: 'new pm edit' })).status, 200);

// SEC-M3-06: a project with no PM shows none (no guessed company PM).
const supportTeam = teams.find((tm) => tm.name === 'Admin Support Team');
if (supportTeam) {
  const noPm = await call(ceo, 'POST', '/projects', { name: `ZZ no pm ${Date.now()}`, teamId: supportTeam.id, status: 'Planning' });
  expect('project without PM -> projectManager null', noPm.data?.data?.projectManager ?? null, null);
  if (noPm.data?.data?.id) await call(ceo, 'DELETE', `/projects/${noPm.data.data.id}`);
} else {
  console.log('- no-PM check skipped (Admin Support Team not found)');
}

// SEC-M3-26 / SEC-M3-02: soft delete by owner, with an audit row.
expect('owner soft-deletes project -> 200', (await call(ceo, 'DELETE', `/projects/${project.id}`)).status, 200);
expect('deleted project hidden', (await call(ceo, 'GET', `/projects/${project.id}`)).status, 404);
const audit = (await call(ceo, 'GET', '/audit-logs/process')).data;
const auditRows = Array.isArray(audit) ? audit : audit?.data || audit?.logs || [];
expect('project delete is audited', auditRows.some((row) => row.projectId === project.id && /delete/i.test(String(row.action))), true);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
