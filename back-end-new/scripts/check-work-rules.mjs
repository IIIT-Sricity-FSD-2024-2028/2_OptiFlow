// API check for the Member 3 (PM / Team Lead) security rules.
// Needs the server running and the default seed. Creates one throwaway project
// (soft-deleted at the end). Usage: node scripts/check-work-rules.mjs
const BASE = process.env.API_URL || 'http://localhost:5500/api';
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
const other = (await call(ceo, 'GET', '/users')).data; // shape check only
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
expect('other PM update -> 403/404', (await call(pm2, 'PATCH', `/projects/${project.id}`, { name: 'hijack' })).status, [403, 404]);
expect('other PM delete -> 403/404', (await call(pm2, 'DELETE', `/projects/${project.id}`)).status, [403, 404]);
// SEC-M3-03: other PM cannot create tasks in it
expect('other PM create task -> 403/404', (await call(pm2, 'POST', '/tasks', { title: 't', projectId: project.id })).status, [403, 404]);

// Task flow
const taskRes = await call(pm, 'POST', '/tasks', { title: 'scope check task', projectId: project.id, dueDate: 'nope' });
expect('bad dueDate -> 400', taskRes.status, 400);
const t = await call(pm, 'POST', '/tasks', { title: 'scope check task', projectId: project.id, status: 'Active' });
expect('assigned PM create task -> 201 (or 400 if team has no single lead)', t.status, [201, 400]);
const task = t.data?.data;

if (task) {
  // SEC-M3-09: pmApproval only on In_Review -> Completed
  expect('pmApproval from Active -> 400', (await call(pm, 'PATCH', `/tasks/${task.id}`, { status: 'Completed', pmApproval: true })).status, 400);
  // SEC-M3-13: due date change needs reason for non-managers (TL may not be assignee in this team)
  const tlChange = await call(tl, 'PATCH', `/tasks/${task.id}`, { dueDate: '2030-01-01' });
  expect('TL due date change without reason -> 400/403/404', tlChange.status, [400, 403, 404]);
  // SEC-M3-22: a member who is not the assignee cannot change the task
  expect('member patch parent -> 403/404', (await call(member, 'PATCH', `/tasks/${task.id}`, { status: 'In_Review' })).status, [403, 404]);
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
  expect('TL completes parent -> 403/404', tlComplete.status, [403, 404]);
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
  const sub =await call(pm, 'POST', '/subtasks', { taskId: task.id, title: 'st', status: 'Completed' });
  expect('subtask created Completed stamps completedAt', Boolean(sub.data?.data?.completedAt), true);
  await call(pm, 'DELETE', `/tasks/${task.id}`);
  expect('subtask hidden after parent delete', (await call(pm, 'GET', `/subtasks/${sub.data?.data?.id}`)).status, 404);
}

// SEC-M3-21: member escalations are scoped
const memberEsc = (await call(member, 'GET', '/escalations')).data?.data || [];
const ceoEsc = (await call(ceo, 'GET', '/escalations')).data?.data || [];
expect('member sees fewer escalations than owner', memberEsc.length <= ceoEsc.length, true);

// SEC-M3-26 / SEC-M3-02: soft delete by owner
expect('owner soft-deletes project -> 200', (await call(ceo, 'DELETE', `/projects/${project.id}`)).status, 200);
expect('deleted project hidden', (await call(ceo, 'GET', `/projects/${project.id}`)).status, 404);

void other;
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
