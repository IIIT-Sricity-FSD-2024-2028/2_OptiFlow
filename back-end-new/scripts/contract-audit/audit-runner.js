/**
 * OptiFlow Contract & Security Audit CLI Runner
 * Member 4: Process Admin & Attachments
 * 
 * Usage:
 *   node scripts/contract-audit/audit-runner.js [--resource=process|attachments|all] [--role=owner|admin|member|all]
 */

import assert from 'node:assert/strict';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';

// Parse command-line flags
const args = process.argv.slice(2);
let resourceFilter = 'all';
let roleFilter = 'all';

for (const arg of args) {
  if (arg.startsWith('--resource=')) {
    resourceFilter = arg.split('=')[1].toLowerCase();
  } else if (arg.startsWith('--role=')) {
    roleFilter = arg.split('=')[1].toLowerCase();
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
OptiFlow Process Admin & Attachments Contract Audit Runner

Options:
  --resource=<process|attachments|all>  Filter tests by target resource (default: all)
  --role=<owner|admin|member|all>       Filter tests by acting role (default: all)
  --help, -h                           Show this help message
`);
    process.exit(0);
  }
}

console.log('======================================================================');
console.log('         OPTIFLOW CONTRACT AUDIT RUNNER (MEMBER 4 VERIFICATION)        ');
console.log(`   Resource Filter: ${resourceFilter.padEnd(14)} Role Filter: ${roleFilter}`);
console.log('======================================================================\n');

async function createTestFixtures() {
  const timestamp = Date.now();

  const company = await prisma.company.create({
    data: {
      legalName: `Audit Corp ${timestamp}`,
      status: 'Active',
    },
  });

  const ownerTemplate = await prisma.roleTemplate.findFirst({ where: { slug: 'company_owner' } });
  const adminTemplate = await prisma.roleTemplate.findFirst({ where: { slug: 'process_admin' } });
  const memberTemplate = await prisma.roleTemplate.findFirst({ where: { slug: 'team_member' } });

  const ownerRole = await prisma.role.create({
    data: {
      companyId: company.id,
      name: `Owner_${timestamp}`,
      label: 'Company Owner',
      isSystem: true,
      roleTemplateId: ownerTemplate.id,
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      companyId: company.id,
      name: `ProcessAdmin_${timestamp}`,
      label: 'Process Admin',
      isSystem: true,
      roleTemplateId: adminTemplate.id,
    },
  });

  const memberRole = await prisma.role.create({
    data: {
      companyId: company.id,
      name: `TeamMember_${timestamp}`,
      label: 'Team Member',
      isSystem: true,
      roleTemplateId: memberTemplate.id,
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      companyId: company.id,
      email: `owner_${timestamp}@test.com`,
      fullName: 'Owner User',
      passwordHash: 'dummy',
      isActive: true,
      tokenVersion: 1,
    },
  });
  await prisma.roleAssignment.create({
    data: {
      companyId: company.id,
      userId: ownerUser.id,
      roleId: ownerRole.id,
      scopeType: 'Company',
      scopeId: company.id,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      companyId: company.id,
      email: `admin_${timestamp}@test.com`,
      fullName: 'Process Admin User',
      passwordHash: 'dummy',
      isActive: true,
      tokenVersion: 1,
    },
  });
  await prisma.roleAssignment.create({
    data: {
      companyId: company.id,
      userId: adminUser.id,
      roleId: adminRole.id,
      scopeType: 'Company',
      scopeId: company.id,
    },
  });

  const memberUser1 = await prisma.user.create({
    data: {
      companyId: company.id,
      email: `member1_${timestamp}@test.com`,
      fullName: 'Member User 1',
      passwordHash: 'dummy',
      isActive: true,
      tokenVersion: 1,
    },
  });
  await prisma.roleAssignment.create({
    data: {
      companyId: company.id,
      userId: memberUser1.id,
      roleId: memberRole.id,
      scopeType: 'Company',
      scopeId: company.id,
    },
  });

  const memberUser2 = await prisma.user.create({
    data: {
      companyId: company.id,
      email: `member2_${timestamp}@test.com`,
      fullName: 'Member User 2',
      passwordHash: 'dummy',
      isActive: true,
      tokenVersion: 1,
    },
  });
  await prisma.roleAssignment.create({
    data: {
      companyId: company.id,
      userId: memberUser2.id,
      roleId: memberRole.id,
      scopeType: 'Company',
      scopeId: company.id,
    },
  });

  let testPlan = await prisma.plan.findFirst();
  if (!testPlan) {
    testPlan = await prisma.plan.create({
      data: {
        name: `Audit Plan ${timestamp}`,
        auditLogRetentionDays: 90,
        allowsIntegrations: true,
      },
    });
  }

  await prisma.subscription.create({
    data: {
      companyId: company.id,
      planId: testPlan.id,
      status: 'Active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const createToken = (u) => jwt.sign({ sub: u.id, tokenVersion: u.tokenVersion }, env.JWT_SECRET || 'secret', { expiresIn: '2h' });

  return {
    company,
    ownerUser,
    adminUser,
    memberUser1,
    memberUser2,
    ownerToken: createToken(ownerUser),
    adminToken: createToken(adminUser),
    member1Token: createToken(memberUser1),
    member2Token: createToken(memberUser2),
  };
}

async function main() {
  console.log('⚙️  Initializing database fixtures and HTTP server...');
  const fixtures = await createTestFixtures();
  const { company, ownerUser, adminUser, memberUser1, memberUser2, ownerToken, adminToken, member1Token, member2Token } = fixtures;

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const authHeaders = (token) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  // Shared state between sequential lifecycle tests
  const state = {
    company,
  };

  async function ensureInstanceFixture() {
    if (state.instanceData && state.tplData) return state.instanceData;
    const resValidTpl = await fetch(`${baseUrl}/api/process-templates`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        name: `Approval Flow Isolated ${Date.now()}`,
        steps: [
          { name: 'Initial Review', stepOrder: 1, stepType: 'Approval' },
          { name: 'Final Approval', stepOrder: 2, stepType: 'Approval', onRejectGotoStepOrder: 1 },
        ],
      }),
    });
    state.tplData = (await resValidTpl.json()).data;
    const resInst = await fetch(`${baseUrl}/api/process-instances`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        templateId: state.tplData.id,
        title: 'Audit Flow Instance Isolated',
      }),
    });
    state.instanceData = (await resInst.json()).data;
    await fetch(`${baseUrl}/api/process-instances/${state.instanceData.id}/start`, {
      method: 'POST',
      headers: authHeaders(adminToken),
    });
    return state.instanceData;
  }


  const testDefinitions = [
    {
      id: 'SEC-M4-01',
      name: 'Attachments Trust the Client (entity type & existence validation)',
      resource: 'attachments',
      roles: ['owner', 'member'],
      fn: async () => {
        const resBadType = await fetch(`${baseUrl}/api/attachments`, {
          method: 'POST',
          headers: authHeaders(ownerToken),
          body: JSON.stringify({
            entityType: 'UnauthorizedEntity',
            entityId: 'some-id',
            fileName: 'test.pdf',
          }),
        });
        assert.equal(resBadType.status, 400, 'Unallowlisted entityType must return 400');

        const resNonExistent = await fetch(`${baseUrl}/api/attachments`, {
          method: 'POST',
          headers: authHeaders(ownerToken),
          body: JSON.stringify({
            entityType: 'Task',
            entityId: '00000000-0000-0000-0000-000000000000',
            fileName: 'test.pdf',
          }),
        });
        assert.equal(resNonExistent.status, 404, 'Nonexistent entity must return 404');

        const testTask = await prisma.task.create({
          data: {
            companyId: company.id,
            title: 'Task for Attachment Test',
            createdById: ownerUser.id,
            assignedToId: memberUser1.id,
            status: 'Active',
          },
        });

        const resAttach = await fetch(`${baseUrl}/api/attachments`, {
          method: 'POST',
          headers: authHeaders(member1Token),
          body: JSON.stringify({
            entityType: 'Task',
            entityId: testTask.id,
            fileName: 'document.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            storageKey: 'hacked/custom/path/document.pdf',
          }),
        });
        assert.equal(resAttach.status, 201, 'Attachment creation failed');
        const attachData = (await resAttach.json()).data;
        assert.notEqual(
          attachData.storageKey,
          'hacked/custom/path/document.pdf',
          'Client-supplied storageKey must be ignored in favor of server generation'
        );
        assert.ok(
          attachData.storageKey.startsWith(`attachments/${company.id}/`),
          'Storage key must be scoped to tenant prefix'
        );
      },
    },
    {
      id: 'SEC-M4-07',
      name: 'Odd Reject Loops (template step loopback validation)',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        const resSelfLoop = await fetch(`${baseUrl}/api/process-templates`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            name: `Bad Self-Loop Template ${Date.now()}`,
            steps: [
              { name: 'Step 1', stepOrder: 1, stepType: 'Approval', onRejectGotoStepOrder: 1 },
            ],
          }),
        });
        assert.equal(resSelfLoop.status, 400, 'Self-loop rejection must return 400');

        const resForwardLoop = await fetch(`${baseUrl}/api/process-templates`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            name: `Bad Forward-Loop Template ${Date.now()}`,
            steps: [
              { name: 'Step 1', stepOrder: 1, stepType: 'Approval', onRejectGotoStepOrder: 2 },
              { name: 'Step 2', stepOrder: 2, stepType: 'Approval' },
            ],
          }),
        });
        assert.equal(resForwardLoop.status, 400, 'Forward-loop rejection must return 400');
      },
    },
    {
      id: 'SEC-M4-04',
      name: 'Template Editing Locked When Instances Active',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        const resValidTpl = await fetch(`${baseUrl}/api/process-templates`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            name: `Approval Flow ${Date.now()}`,
            steps: [
              { name: 'Initial Review', stepOrder: 1, stepType: 'Approval' },
              { name: 'Final Approval', stepOrder: 2, stepType: 'Approval', onRejectGotoStepOrder: 1 },
            ],
          }),
        });
        assert.equal(resValidTpl.status, 201);
        const tplData = (await resValidTpl.json()).data;
        state.tplData = tplData;

        const resInst = await fetch(`${baseUrl}/api/process-instances`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            templateId: tplData.id,
            title: 'Audit Flow Instance 1',
          }),
        });
        assert.equal(resInst.status, 201);
        const instanceData = (await resInst.json()).data;
        state.instanceData = instanceData;

        await fetch(`${baseUrl}/api/process-instances/${instanceData.id}/start`, {
          method: 'POST',
          headers: authHeaders(adminToken),
        });

        const resUpdateSteps = await fetch(`${baseUrl}/api/process-templates/${tplData.id}`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            steps: [
              { name: 'New Step 1', stepOrder: 1, stepType: 'Approval' },
            ],
          }),
        });
        assert.equal(resUpdateSteps.status, 400, 'Modifying steps of blueprint with active instances must return 400');
      },
    },
    {
      id: 'SEC-M4-05',
      name: 'Sequence Guard Enforcement on Process Step Actioning',
      resource: 'process',
      roles: ['member', 'admin'],
      fn: async () => {
        await ensureInstanceFixture();
        const { instanceData } = state;

        // Set currentStepId to null to simulate race/untracked pointer
        await prisma.processInstance.update({
          where: { id: instanceData.id },
          data: { currentStepId: null },
        });

        const step1 = instanceData.steps[0];
        const step2 = instanceData.steps[1];

        // Action step 2 while step 1 is pending -> 400
        const resOutOfOrder = await fetch(`${baseUrl}/api/process-instance-steps/${step2.id}/action`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ status: 'Approved' }),
        });
        assert.equal(resOutOfOrder.status, 400, 'Step 2 action must be rejected while Step 1 is pending');

        // Action Step 1 -> succeeds
        const resStep1Ok = await fetch(`${baseUrl}/api/process-instance-steps/${step1.id}/action`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ status: 'Approved' }),
        });
        assert.equal(resStep1Ok.status, 200, 'Actioning step 1 succeeds');
      },
    },
    {
      id: 'SEC-M4-02',
      name: 'Concurrent Step Action Race Guard',
      resource: 'process',
      roles: ['member', 'admin'],
      fn: async () => {
        await ensureInstanceFixture();
        const { instanceData } = state;
        const step1 = instanceData.steps[0];

        // Double approval on already approved step 1 -> 400
        const resDuplicateAction = await fetch(`${baseUrl}/api/process-instance-steps/${step1.id}/action`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ status: 'Approved' }),
        });
        assert.equal(resDuplicateAction.status, 400, 'Actioning already approved step must return 400');
      },
    },
    {
      id: 'SEC-M4-03',
      name: 'Approving a Step Respects Compliance Engine Checks',
      resource: 'process',
      roles: ['member', 'admin'],
      fn: async () => {
        await ensureInstanceFixture();
        const { instanceData } = state;
        const step2 = instanceData.steps[1];

        const testBranch = await prisma.branch.create({
          data: { companyId: company.id, name: `Compliance Branch ${Date.now()}` },
        });
        const testTeam = await prisma.team.create({
          data: { companyId: company.id, branchId: testBranch.id, name: `Compliance Team ${Date.now()}` },
        });
        const testProject = await prisma.project.create({
          data: { companyId: company.id, teamId: testTeam.id, createdById: ownerUser.id, name: 'Audit Compliance Project' },
        });

        const compliantLinkedTask = await prisma.task.create({
          data: {
            companyId: company.id,
            projectId: testProject.id,
            processInstanceStepId: step2.id,
            title: 'Task Requiring Compliance Sign-off',
            createdById: adminUser.id,
            assignedToId: memberUser1.id,
            status: 'Active',
          },
        });

        const complianceRule = await prisma.complianceRule.create({
          data: {
            companyId: company.id,
            name: 'Mandatory Sign-off Rule',
            description: 'Requires approved compliance evidence before completion',
            severity: 'Critical',
            isActive: true,
            criteria: {
              trigger: { field: 'status', transitionTo: 'Completed' },
              requirement: { type: 'EVIDENCE_REQUIRED' },
            },
          },
        });

        await prisma.complianceBinding.create({
          data: {
            companyId: company.id,
            ruleId: complianceRule.id,
            scopeType: 'Project',
            scopeId: testProject.id,
          },
        });

        const resBlockedByCompliance = await fetch(`${baseUrl}/api/process-instance-steps/${step2.id}/action`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ status: 'Approved' }),
        });
        assert.equal(resBlockedByCompliance.status, 403, 'Step approval must be blocked by compliance');
        const compBody = await resBlockedByCompliance.json();
        assert.ok(compBody.message.includes('compliance'), 'Error message must specify compliance block');

        const taskAfter = await prisma.task.findUnique({ where: { id: compliantLinkedTask.id } });
        assert.equal(taskAfter.status, 'Active', 'Task must remain Active and not Completed');
      },
    },
    {
      id: 'SEC-M4-06',
      name: 'Instances Cannot Be Reopened or Completed by Hand',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        const { instanceData } = state;

        // Premature complete -> 400
        const resPremature = await fetch(`${baseUrl}/api/process-instances/${instanceData.id}`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ status: 'Completed' }),
        });
        assert.equal(resPremature.status, 400, 'Premature completion must return 400');

        // Cancel instance -> 200
        const resCancel = await fetch(`${baseUrl}/api/process-instances/${instanceData.id}`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ status: 'Cancelled' }),
        });
        assert.equal(resCancel.status, 200, 'Active -> Cancelled transition allowed');

        // Reopen cancelled -> 400
        const resReopen = await fetch(`${baseUrl}/api/process-instances/${instanceData.id}`, {
          method: 'PATCH',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ status: 'Active' }),
        });
        assert.equal(resReopen.status, 400, 'Reopening cancelled instance must return 400');
      },
    },
    {
      id: 'SEC-M4-08',
      name: 'Process Read Scoping (Member sees only involved, Admin sees all)',
      resource: 'process',
      roles: ['member', 'admin'],
      fn: async () => {
        await ensureInstanceFixture();
        const { tplData } = state;

        const resInst2 = await fetch(`${baseUrl}/api/process-instances`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            templateId: tplData.id,
            title: 'Admin Only Instance',
          }),
        });
        const inst2 = (await resInst2.json()).data;

        const resListMember2 = await fetch(`${baseUrl}/api/process-instances`, {
          method: 'GET',
          headers: authHeaders(member2Token),
        });
        const listMember2Body = await resListMember2.json();
        const member2FoundInst2 = listMember2Body.data.some((i) => i.id === inst2.id);
        assert.equal(member2FoundInst2, false, 'Member 2 must not see uninvolved instance');

        const resListAdmin = await fetch(`${baseUrl}/api/process-instances`, {
          method: 'GET',
          headers: authHeaders(adminToken),
        });
        const listAdminBody = await resListAdmin.json();
        const adminFoundInst2 = listAdminBody.data.some((i) => i.id === inst2.id);
        assert.equal(adminFoundInst2, true, 'Admin sees all instances in company');
      },
    },
    {
      id: 'DEFECT-01',
      name: 'Loopback Resolution on createTemplate without temp UUID crash',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        const resCreateTpl = await fetch(`${baseUrl}/api/process-templates`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            name: `Loopback Blueprint ${Date.now()}`,
            steps: [
              { name: 'Initial Review', stepOrder: 1, stepType: 'Approval' },
              { name: 'Senior Sign-off', stepOrder: 2, stepType: 'Approval', onRejectGotoStepOrder: 1 },
            ],
          }),
        });
        assert.equal(resCreateTpl.status, 201, 'Template with loopback creation must succeed');
        const createdTplData = (await resCreateTpl.json()).data;
        assert.equal(createdTplData.steps.length, 2);
        assert.equal(
          createdTplData.steps[1].onRejectGotoStepId,
          createdTplData.steps[0].id,
          'Step 2 onRejectGotoStepId must be resolved to Step 1 ID'
        );
        state.loopbackTplId = createdTplData.id;
      },
    },
    {
      id: 'DEFECT-02',
      name: 'deleteTemplate with Self-Referencing Loopback FK safely nullified',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        const resDeleteTpl = await fetch(`${baseUrl}/api/process-templates/${state.loopbackTplId}`, {
          method: 'DELETE',
          headers: authHeaders(adminToken),
        });
        assert.equal(resDeleteTpl.status, 200, 'deleteTemplate with loopback must return 200 without FK violation');
      },
    },
    {
      id: 'DEFECT-03',
      name: 'createStep Blocked on Terminal Instances',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        await ensureInstanceFixture();
        const { instanceData, tplData } = state;
        // instanceData was cancelled in SEC-M4-06
        const resAddStepCancelled = await fetch(`${baseUrl}/api/process-instance-steps`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            processInstanceId: instanceData.id,
            templateStepId: tplData.steps[0].id,
          }),
        });
        assert.equal(resAddStepCancelled.status, 400, 'Adding step to cancelled instance must return 400');
      },
    },
    {
      id: 'DEFECT-04',
      name: 'deleteInstance Unlinks Task.processInstanceStepId',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        await ensureInstanceFixture();
        const { tplData } = state;
        const instRes = await fetch(`${baseUrl}/api/process-instances`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({ templateId: tplData.id, title: 'Task Unlink Test Inst' }),
        });
        const inst = (await instRes.json()).data;
        const stepId = inst.steps[0].id;

        const task = await prisma.task.create({
          data: {
            companyId: company.id,
            title: `Linked Task ${Date.now()}`,
            createdById: adminUser.id,
            processInstanceStepId: stepId,
          },
        });

        const resDelInst = await fetch(`${baseUrl}/api/process-instances/${inst.id}`, {
          method: 'DELETE',
          headers: authHeaders(adminToken),
        });
        assert.equal(resDelInst.status, 200, 'deleteInstance must return 200');

        const refreshedTask = await prisma.task.findUnique({ where: { id: task.id } });
        assert.equal(refreshedTask.processInstanceStepId, null, 'Task processInstanceStepId must be nullified');
      },
    },
    {
      id: 'PRE-M4-02',
      name: 'Canonical route POST /api/process-templates/:id/steps',
      resource: 'process',
      roles: ['admin'],
      fn: async () => {
        const newTplForStep = (await (await fetch(`${baseUrl}/api/process-templates`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            name: `Canonical Route Test ${Date.now()}`,
            steps: [{ name: 'Step 1', stepOrder: 1, stepType: 'Approval' }],
          }),
        })).json()).data;

        const resCanonicalAddStep = await fetch(`${baseUrl}/api/process-templates/${newTplForStep.id}/steps`, {
          method: 'POST',
          headers: authHeaders(adminToken),
          body: JSON.stringify({
            name: 'Step 2',
            stepOrder: 2,
            stepType: 'Approval',
          }),
        });
        assert.equal(resCanonicalAddStep.status, 201, 'Canonical /api/process-templates/:id/steps must return 201');
      },
    },
  ];

  // Filter test cases
  const matchingTests = testDefinitions.filter((tc) => {
    const matchResource = resourceFilter === 'all' || tc.resource === resourceFilter;
    const matchRole = roleFilter === 'all' || tc.roles.includes(roleFilter);
    return matchResource && matchRole;
  });

  if (matchingTests.length === 0) {
    console.log(`⚠️  No tests matched filter: resource=${resourceFilter}, role=${roleFilter}`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(`✓ Fixtures ready. Running ${matchingTests.length} test(s)...\n`);

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  try {
    for (const tc of matchingTests) {
      const testStart = Date.now();
      try {
        await tc.fn();
        const elapsed = Date.now() - testStart;
        console.log(`  ✓ [PASS] [${tc.id}] ${tc.name} (${elapsed}ms)`);
        passed++;
      } catch (err) {
        const elapsed = Date.now() - testStart;
        console.error(`  ✗ [FAIL] [${tc.id}] ${tc.name} (${elapsed}ms)`);
        console.error(`     Error: ${err.message}`);
        failed++;
      }
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  const totalDuration = Date.now() - startTime;
  console.log('\n======================================================================');
  console.log(`AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${matchingTests.length} (${totalDuration}ms)`);
  console.log('======================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
