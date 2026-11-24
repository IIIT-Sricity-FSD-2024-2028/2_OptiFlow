// Post-merge regression checks: escalation visibility and actions (D-S11), subtask and task
// status rules (D-S5), deadline extensions, project delete clean-up (D-S9), attachment limits and scope (D-S7),
// process step actions and template edits (SEC-M4). Runs against a TEST database only.
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { prisma } from './src/config/prisma.js';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import { assertTestDatabase } from './scripts/setup-test-db.js';

assertTestDatabase(process.env.DATABASE_URL);

const stamp = Date.now();
let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`  PASS  ${name}`);
}

async function makeFixtures() {
  const company = await prisma.company.create({ data: { legalName: `Work Fixes Corp ${stamp}`, status: 'Active' } });
  let plan = await prisma.plan.findFirst();
  if (!plan) plan = await prisma.plan.create({ data: { name: `Plan ${stamp}`, auditLogRetentionDays: 90, allowsIntegrations: true } });
  await prisma.subscription.create({
    data: { companyId: company.id, planId: plan.id, status: 'Active', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5) },
  });

  const slugs = ['company_owner', 'project_manager', 'team_lead', 'team_member', 'compliance_officer', 'process_admin', 'branch_manager'];
  const roles = {};
  for (const slug of slugs) {
    const tpl = await prisma.roleTemplate.findFirst({ where: { slug } });
    roles[slug] = await prisma.role.create({
      data: { companyId: company.id, name: `${slug}_${stamp}`, label: tpl.label, isSystem: true, roleTemplateId: tpl.id },
    });
  }

  const branch = await prisma.branch.create({ data: { companyId: company.id, name: `Branch ${stamp}` } });
  const users = {};
  async function user(key, slug, scope) {
    const u = await prisma.user.create({
      data: { companyId: company.id, email: `${key}_${stamp}@wf.test`, fullName: key, passwordHash: 'x', passwordChangedAt: new Date(), isActive: true, tokenVersion: 1 },
    });
    await prisma.roleAssignment.create({
      data: {
        companyId: company.id, userId: u.id, roleId: roles[slug].id,
        scopeType: scope?.type || 'Company', scopeId: scope?.id || company.id,
      },
    });
    users[key] = { ...u, token: jwt.sign({ sub: u.id, tokenVersion: 1 }, env.JWT_SECRET, { expiresIn: '2h' }) };
  }
  await user('owner', 'company_owner');
  await user('pm', 'project_manager');
  await user('tl1', 'team_lead');
  await user('tl2', 'team_lead');
  await user('m1', 'team_member');
  await user('m2', 'team_member');
  await user('co', 'compliance_officer');
  await user('pa', 'process_admin');

  const teamA = await prisma.team.create({ data: { companyId: company.id, branchId: branch.id, name: `A ${stamp}` } });
  const teamB = await prisma.team.create({ data: { companyId: company.id, branchId: branch.id, name: `B ${stamp}` } });
  for (const [teamId, keys] of [[teamA.id, ['tl1', 'm1']], [teamB.id, ['tl2', 'm2']]]) {
    for (const key of keys) {
      await prisma.teamMember.create({ data: { companyId: company.id, teamId, userId: users[key].id } });
    }
  }
  const projA = await prisma.project.create({ data: { companyId: company.id, teamId: teamA.id, name: 'Proj A', status: 'Active', createdById: users.pm.id } });
  const projB = await prisma.project.create({ data: { companyId: company.id, teamId: teamB.id, name: 'Proj B', status: 'Active', createdById: users.pm.id } });
  const taskA = await prisma.task.create({ data: { companyId: company.id, projectId: projA.id, title: 'Task A', status: 'Active', createdById: users.pm.id, assignedToId: users.tl1.id } });
  const taskB = await prisma.task.create({ data: { companyId: company.id, projectId: projB.id, title: 'Task B', status: 'Active', createdById: users.pm.id, assignedToId: users.tl2.id } });
  return { company, users, projA, projB, taskA, taskB, teamA, teamB };
}

async function main() {
  const f = await makeFixtures();
  const { users } = f;
  const app = createApp();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (who, method, path, body) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${users[who].token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }
    return { status: res.status, body: json };
  };

  console.log('\n--- Escalations (D-S11) ---');
  try {
    // Escalation raised by member 2 on team B's task
    const escB = await prisma.escalation.create({
      data: { companyId: f.company.id, taskId: f.taskB.id, projectId: f.projB.id, reportedById: users.m2.id, title: 'Blocker B', status: 'Open' },
    });
    const escA = await prisma.escalation.create({
      data: { companyId: f.company.id, taskId: f.taskA.id, projectId: f.projA.id, reportedById: users.m1.id, title: 'Blocker A', status: 'Open' },
    });
    const ids = async (who) => (await call(who, 'GET', '/api/escalations')).body.data.map((e) => e.id);

    await check('compliance officer and process admin see every escalation', async () => {
      for (const who of ['co', 'pa', 'owner']) {
        const list = await ids(who);
        assert.ok(list.includes(escA.id) && list.includes(escB.id), `${who} must see both`);
      }
    });
    await check('team lead sees their own team only', async () => {
      const list = await ids('tl1');
      assert.ok(list.includes(escA.id), 'tl1 sees team A escalation');
      assert.ok(!list.includes(escB.id), 'tl1 must not see team B escalation');
    });
    await check('member sees only their own', async () => {
      const list = await ids('m1');
      assert.deepEqual(list, [escA.id]);
    });
    await check('creating an escalation on a task outside your scope is a 404', async () => {
      const res = await call('m1', 'POST', '/api/escalations', { title: 'x', taskId: f.taskB.id });
      assert.equal(res.status, 404);
    });
    await check('reporter cannot resolve or delete their own escalation', async () => {
      const res = await call('tl1', 'PATCH', `/api/escalations/${escA.id}`, { status: 'Resolved' });
      assert.equal(res.status, 403, 'a team lead who is not the target cannot resolve');
      const del = await call('tl1', 'DELETE', `/api/escalations/${escA.id}`);
      assert.equal(del.status, 403);
    });
    await check('the target manager and a PM can resolve; a manager can delete', async () => {
      const targeted = await prisma.escalation.update({ where: { id: escA.id }, data: { targetManagerId: users.tl1.id } });
      const byTarget = await call('tl1', 'PATCH', `/api/escalations/${targeted.id}`, { status: 'Resolved' });
      assert.equal(byTarget.status, 200);
      const byPm = await call('pm', 'PATCH', `/api/escalations/${escB.id}`, { status: 'Resolved' });
      assert.equal(byPm.status, 200);
      const del = await call('pm', 'DELETE', `/api/escalations/${escB.id}`);
      assert.equal(del.status, 200);
    });
  } catch (err) { console.error(err); process.exitCode = 1; }

  console.log('\n--- Tasks and subtasks (D-S5) ---');
  try {
    await check('team lead cannot cancel or draft a parent task', async () => {
      for (const status of ['Cancelled', 'Draft', 'Completed']) {
        const res = await call('tl1', 'PATCH', `/api/tasks/${f.taskA.id}`, { status });
        assert.equal(res.status, 403, `${status} must be refused for a team lead`);
      }
      const ok = await call('tl1', 'PATCH', `/api/tasks/${f.taskA.id}`, { status: 'Blocked' });
      assert.equal(ok.status, 200, 'Blocked is still allowed');
      await prisma.task.update({ where: { id: f.taskA.id }, data: { status: 'Active' } });
    });
    let sub;
    await check('subtasks can only go to the project team', async () => {
      const outsider = await call('tl1', 'POST', '/api/subtasks', { taskId: f.taskA.id, title: 'S', assignedToId: users.m2.id });
      assert.equal(outsider.status, 403, 'member of another team is refused');
      const pmOutsider = await call('pm', 'POST', '/api/subtasks', { taskId: f.taskA.id, title: 'S', assignedToId: users.m2.id });
      assert.equal(pmOutsider.status, 403, 'a PM may not reach outside the project team either');
      const good = await call('pm', 'POST', '/api/subtasks', { taskId: f.taskA.id, title: 'S', assignedToId: users.m1.id });
      assert.equal(good.status, 201);
      sub = good.body.data;
    });
    await check('a member cannot create a subtask', async () => {
      const res = await call('m1', 'POST', '/api/subtasks', { taskId: f.taskA.id, title: 'mine', assignedToId: users.m1.id });
      assert.equal(res.status, 403);
    });
    await check('a member cannot reopen an approved subtask', async () => {
      await prisma.subtask.update({ where: { id: sub.id }, data: { status: 'Completed', completedAt: new Date() } });
      const res = await call('m1', 'PATCH', `/api/subtasks/${sub.id}`, { status: 'Active' });
      assert.equal(res.status, 403);
    });
    await check('approval notices use the Task type', async () => {
      await prisma.subtask.update({ where: { id: sub.id }, data: { status: 'In_Review', completedAt: null } });
      const res = await call('tl1', 'PATCH', `/api/subtasks/${sub.id}`, { status: 'Completed' });
      assert.equal(res.status, 200);
      await new Promise((r) => setTimeout(r, 300));
      const note = await prisma.notification.findFirst({ where: { userId: users.m1.id, title: 'Subtask approved' } });
      assert.equal(note?.type, 'Task');
    });
  } catch (err) { console.error(err); process.exitCode = 1; }

  console.log('\n--- Project delete (D-S9) ---');
  try {
    await check('deleting a project revokes its scoped roles and closes its escalations', async () => {
      const tpl = await prisma.roleTemplate.findFirst({ where: { slug: 'project_manager' } });
      const pmRole = await prisma.role.findFirst({ where: { companyId: f.company.id, roleTemplateId: tpl.id } });
      const proj = await prisma.project.create({ data: { companyId: f.company.id, teamId: f.teamA.id, name: 'Doomed', status: 'Active', createdById: users.pm.id } });
      const ra = await prisma.roleAssignment.create({ data: { companyId: f.company.id, userId: users.pm.id, roleId: pmRole.id, scopeType: 'Project', scopeId: proj.id } });
      const esc = await prisma.escalation.create({ data: { companyId: f.company.id, projectId: proj.id, reportedById: users.m1.id, title: 'Open one', status: 'Open' } });
      const res = await call('pm', 'DELETE', `/api/projects/${proj.id}`);
      assert.equal(res.status, 200);
      assert.ok((await prisma.roleAssignment.findUnique({ where: { id: ra.id } })).revokedAt, 'assignment revoked');
      assert.equal((await prisma.escalation.findUnique({ where: { id: esc.id } })).status, 'Closed');
    });
  } catch (err) { console.error(err); process.exitCode = 1; }

  console.log('\n--- Attachments (D-S7) ---');
  try {
    const attach = (who, over = {}) => call(who, 'POST', '/api/attachments', {
      entityType: 'Task', entityId: f.taskA.id, fileName: 'report.pdf', fileType: 'application/pdf', fileSizeBytes: 1000, ...over,
    });
    await check('only allowed types and sizes are accepted', async () => {
      assert.equal((await attach('tl1')).status, 201);
      assert.equal((await attach('tl1', { fileName: 'run.exe', fileType: 'application/octet-stream' })).status, 400);
      assert.equal((await attach('tl1', { fileName: 'a.pdf', fileType: 'image/png' })).status, 400, 'extension and type must agree');
      assert.equal((await attach('tl1', { fileSizeBytes: 26 * 1024 * 1024 })).status, 400);
      assert.equal((await attach('tl1', { fileSizeBytes: -5 })).status, 400);
    });
    await check('files on a task are not visible outside its scope', async () => {
      const created = await attach('tl1');
      const id = created.body.data.id;
      assert.equal((await call('tl2', 'GET', `/api/attachments/${id}`)).status, 404, 'other team lead');
      assert.equal((await call('tl2', 'GET', `/api/attachments?entityType=Task&entityId=${f.taskA.id}`)).status, 403);
      assert.equal((await call('tl1', 'GET', `/api/attachments/${id}`)).status, 200);
      const list = await call('tl2', 'GET', '/api/attachments');
      assert.ok(!list.body.data.some((a) => a.id === id), 'unfiltered list shows only own uploads');
    });
    await check('a PM can attach only to tasks in their projects, and a process admin not to tasks', async () => {
      const otherPm = await prisma.user.findFirst({ where: { id: users.pm.id } });
      assert.ok(otherPm);
      assert.equal((await attach('pa')).status, 403, 'process admin has no task access');
      assert.equal((await attach('pm')).status, 201, 'PM who created the project');
    });
    await check('a member cannot attach to a project or delete someone else\'s file', async () => {
      assert.equal((await attach('m1', { entityType: 'Project', entityId: f.projA.id })).status, 403);
      const mine = await attach('tl1');
      assert.equal((await call('m2', 'DELETE', `/api/attachments/${mine.body.data.id}`)).status, 403);
      assert.equal((await call('tl1', 'DELETE', `/api/attachments/${mine.body.data.id}`)).status, 200);
    });
  } catch (err) { console.error(err); process.exitCode = 1; }

  console.log('\n--- Process templates and steps (SEC-M4) ---');
  try {
    let tpl;
    await check('duplicate step orders and missing loopback targets are rejected', async () => {
      const dup = await call('pa', 'POST', '/api/process-templates', { name: `Dup ${stamp}`, steps: [{ name: 'a', stepOrder: 1 }, { name: 'b', stepOrder: 1 }] });
      assert.equal(dup.status, 400);
      const bad = await call('pa', 'POST', '/api/process-templates', { name: `Bad ${stamp}`, steps: [{ name: 'a', stepOrder: 1 }, { name: 'b', stepOrder: 2, onRejectGotoStepOrder: 7 }] });
      assert.equal(bad.status, 400);
      const nan = await call('pa', 'POST', '/api/process-templates', { name: `Nan ${stamp}`, steps: [{ name: 'a', stepOrder: 1 }, { name: 'b', stepOrder: 2, onRejectGotoStepOrder: 'x' }] });
      assert.equal(nan.status, 400);
      const ok = await call('pa', 'POST', '/api/process-templates', { name: `Flow ${stamp}`, steps: [{ name: 'a', stepOrder: 1 }, { name: 'b', stepOrder: 2, onRejectGotoStepOrder: 1 }] });
      assert.equal(ok.status, 201);
      tpl = ok.body.data;
    });
    let inst;
    await check('a template with a running instance can still be renamed with its steps sent back unchanged', async () => {
      const made = await call('pa', 'POST', '/api/process-instances', { templateId: tpl.id });
      assert.equal(made.status, 201);
      inst = made.body.data;
      const steps = tpl.steps.map((s) => ({ id: s.id, name: s.name, stepOrder: s.stepOrder, stepType: s.stepType, onRejectGotoStepId: s.onRejectGotoStepId }));
      const rename = await call('pa', 'PATCH', `/api/process-templates/${tpl.id}`, { name: `Flow renamed ${stamp}`, steps });
      assert.equal(rename.status, 200, JSON.stringify(rename.body));
      const changed = steps.map((s, i) => (i === 0 ? { ...s, name: 'changed' } : s));
      const edit = await call('pa', 'PATCH', `/api/process-templates/${tpl.id}`, { steps: changed });
      assert.equal(edit.status, 400, 'a real step edit is still locked');
    });
    await check('an Active instance cannot be deleted', async () => {
      assert.equal((await call('pa', 'DELETE', `/api/process-instances/${inst.id}`)).status, 400);
    });
    await check('actioning a step needs a real decision and returns COMPLIANCE_BLOCK-free success', async () => {
      const stepId = inst.steps[0].id;
      assert.equal((await call('pa', 'PATCH', `/api/process-instance-steps/${stepId}/action`, {})).status, 400);
      assert.equal((await call('pa', 'PATCH', `/api/process-instance-steps/${stepId}/action`, { status: 'Pending' })).status, 400);
      const task = await prisma.task.create({ data: { companyId: f.company.id, title: 'Linked', status: 'Cancelled', createdById: users.pm.id, processInstanceStepId: stepId } });
      const ok = await call('pa', 'PATCH', `/api/process-instance-steps/${stepId}/action`, { status: 'Approved' });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal((await prisma.task.findUnique({ where: { id: task.id } })).status, 'Cancelled', 'a cancelled task is not revived');
    });
  } catch (err) { console.error(err); process.exitCode = 1; }

  console.log('\n--- Process visibility and compliance records ---');
  try {
    const tplv = await prisma.processTemplate.findFirst({ where: { companyId: f.company.id } })
      || await prisma.processTemplate.create({ data: { companyId: f.company.id, name: `Vis ${stamp}`, createdById: users.pa.id } });
    const bmRole = await prisma.role.findFirst({ where: { companyId: f.company.id, name: `branch_manager_${stamp}` } });
    const branch = await prisma.branch.findFirst({ where: { companyId: f.company.id } });
    const bm = await prisma.user.create({
      data: { companyId: f.company.id, email: `bm_${stamp}@wf.test`, fullName: 'bm', passwordHash: 'x', passwordChangedAt: new Date(), isActive: true, tokenVersion: 1 },
    });
    await prisma.roleAssignment.create({ data: { companyId: f.company.id, userId: bm.id, roleId: bmRole.id, scopeType: 'Branch', scopeId: branch.id } });
    users.bm = { ...bm, token: jwt.sign({ sub: bm.id, tokenVersion: 1 }, env.JWT_SECRET, { expiresIn: '2h' }) };
    const otherBranch = await prisma.branch.create({ data: { companyId: f.company.id, name: `Other ${stamp}` } });
    const otherTeam = await prisma.team.create({ data: { companyId: f.company.id, branchId: otherBranch.id, name: `Other team ${stamp}` } });
    const otherProj = await prisma.project.create({ data: { companyId: f.company.id, teamId: otherTeam.id, name: 'Other proj', status: 'Active', createdById: users.pm.id } });
    const mk = (projectId) => prisma.processInstance.create({ data: { companyId: f.company.id, templateId: tplv.id, projectId, status: 'Draft', title: 'Vis instance', initiatedById: users.pa.id } });
    const iA = await mk(f.projA.id);
    const iB = await mk(f.projB.id);
    const iO = await mk(otherProj.id);
    const seen = async (who) => (await call(who, 'GET', '/api/process-instances')).body.data.map((i) => i.id);

    await check('compliance officer sees every instance', async () => {
      const ids = await seen('co');
      assert.ok([iA, iB, iO].every((i) => ids.includes(i.id)));
    });
    await check('branch manager sees their branch only', async () => {
      const ids = await seen('bm');
      assert.ok(ids.includes(iA.id) && ids.includes(iB.id));
      assert.ok(!ids.includes(iO.id), 'other branch hidden');
    });
    await check('team lead sees their team projects only; member sees none', async () => {
      const ids = await seen('tl1');
      assert.ok(ids.includes(iA.id) && !ids.includes(iB.id) && !ids.includes(iO.id));
      assert.equal((await seen('m1')).length, 0);
    });

    const rule = await prisma.complianceRule.create({
      data: { companyId: f.company.id, name: `Quarterly hygiene ${stamp}`, description: 'd', severity: 'Medium', ruleType: 'Overdue' },
    });
    await check('rule type is stored and validated', async () => {
      const bad = await call('owner', 'POST', '/api/compliance-rules', { name: 'x', description: 'y', ruleType: 'Nope' });
      assert.equal(bad.status, 400);
      assert.equal(rule.ruleType, 'Overdue');
    });
    await check('only one active violation per rule and entity', async () => {
      const data = { companyId: f.company.id, ruleId: rule.id, entityType: 'Task', entityId: f.taskA.id, status: 'Open', severity: 'Medium' };
      await prisma.complianceViolation.create({ data });
      await assert.rejects(() => prisma.complianceViolation.create({ data }), (e) => e.code === 'P2002');
      const dup = await call('co', 'POST', '/api/compliance-violations', { ruleId: rule.id, entityType: 'Task', entityId: f.taskA.id });
      assert.equal(dup.status, 409);
      await prisma.complianceViolation.updateMany({ where: { ruleId: rule.id }, data: { status: 'Resolved' } });
      await prisma.complianceViolation.create({ data });
    });
  } catch (err) { console.error(err); process.exitCode = 1; }

  console.log('\n--- Deadline extensions (member asks, PM approves) ---');
  try {
    const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const extTask = await prisma.task.create({
      data: {
        companyId: f.company.id, projectId: f.projA.id, title: 'Ext task', status: 'Active',
        createdById: users.tl1.id, assignedToId: users.m1.id, dueDate: new Date(day(5)),
      },
    });
    const askExtension = (who, date, extra = {}) => call(who, 'POST', '/api/escalations', {
      taskId: extTask.id,
      title: 'Extension request: Ext task',
      blockerType: 'Extension Request',
      description: date ? `Requested new deadline: ${date}. Reason: Waiting on vendor data` : 'Please extend',
      ...extra,
    });
    const notificationsFor = (userId, text) => prisma.notification.findMany({
      where: { userId, companyId: f.company.id, message: { contains: text } },
    });
    const waitFor = async (fn) => {
      for (let i = 0; i < 20; i += 1) {
        if (await fn()) return true;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return fn();
    };

    await check('an extension request needs a valid date later than the current deadline', async () => {
      assert.equal((await askExtension('m1', null)).status, 400, 'no date');
      assert.equal((await askExtension('m1', day(3))).status, 400, 'earlier than the current deadline');
      assert.equal((await askExtension('m1', day(-1))).status, 400, 'in the past');
    });

    let ext;
    await check('an extension request always goes to the project PM, whatever target is sent', async () => {
      const res = await askExtension('m1', day(12), { targetManagerId: users.tl1.id });
      assert.equal(res.status, 201);
      ext = res.body.data;
      assert.equal(ext.targetManagerId, users.pm.id);
    });

    await check('the requester cannot edit the request text after sending it', async () => {
      const res = await call('m1', 'PATCH', `/api/escalations/${ext.id}`, { description: `Requested new deadline: ${day(40)}. Reason: x` });
      assert.equal(res.status, 403);
    });

    await check('a team lead cannot approve an extension (not the target, not a PM)', async () => {
      const res = await call('tl1', 'PATCH', `/api/escalations/${ext.id}`, { status: 'Resolved' });
      assert.equal(res.status, 403);
      const task = await prisma.task.findUnique({ where: { id: extTask.id } });
      assert.equal(task.dueDate.toISOString().slice(0, 10), day(5), 'deadline unchanged');
    });

    await check('PM approval moves the deadline, resolves Overdue violations, audits and notifies', async () => {
      const overdueRule = await prisma.complianceRule.create({
        data: { companyId: f.company.id, name: `Overdue ext ${stamp}`, description: 'd', severity: 'Medium', ruleType: 'Overdue' },
      });
      const violation = await prisma.complianceViolation.create({
        data: { companyId: f.company.id, ruleId: overdueRule.id, entityType: 'Task', entityId: extTask.id, status: 'Open', severity: 'Medium' },
      });
      const res = await call('pm', 'PATCH', `/api/escalations/${ext.id}`, { status: 'Resolved' });
      assert.equal(res.status, 200);
      const task = await prisma.task.findUnique({ where: { id: extTask.id } });
      assert.equal(task.dueDate.toISOString().slice(0, 10), day(12));
      const resolved = await prisma.complianceViolation.findUnique({ where: { id: violation.id } });
      assert.equal(resolved.status, 'Resolved');
      const audit = await prisma.processAuditLog.findFirst({ where: { taskId: extTask.id, performedById: users.pm.id } });
      assert.equal(audit?.newValue?.escalationId, ext.id);
      assert.ok(await waitFor(async () => (await notificationsFor(users.m1.id, 'was approved')).length > 0), 'member is told');
    });

    await check('a PM can reject with a comment; the deadline stays and the member sees the reason', async () => {
      const res = await askExtension('m1', day(30));
      assert.equal(res.status, 201);
      const rejected = await call('pm', 'PATCH', `/api/escalations/${res.body.data.id}`, {
        status: 'Closed',
        description: `${res.body.data.description}\n\nRejection Comment: Scope is fixed`,
      });
      assert.equal(rejected.status, 200);
      const task = await prisma.task.findUnique({ where: { id: extTask.id } });
      assert.equal(task.dueDate.toISOString().slice(0, 10), day(12), 'deadline unchanged by a rejection');
      assert.ok(await waitFor(async () => (await notificationsFor(users.m1.id, 'Reason: Scope is fixed')).length > 0), 'reason reaches the member');
    });
  } catch (err) { console.error(err); process.exitCode = 1; }

  server.close();
  console.log(`\n${process.exitCode ? 'FAILED' : 'All'} ${passed} checks ${process.exitCode ? 'before the failure' : 'passed'}`);
  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
