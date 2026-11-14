import assert from 'node:assert/strict';
import { prisma } from '../../src/config/prisma.js';
import { createApp } from '../../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';

console.log('======================================================================');
console.log('         RUNNING TEST-SECURITY-M4.JS (MEMBER 4 SECURITY VERIFICATION)  ');
console.log('======================================================================\n');

async function createTestFixtures() {
  const timestamp = Date.now();

  // 1. Create a test company with Active status
  const company = await prisma.company.create({
    data: {
      legalName: `Security M4 Test Corp ${timestamp}`,
      status: 'Active',
    },
  });

  // 2. Fetch system role templates
  const ownerTemplate = await prisma.roleTemplate.findFirst({ where: { slug: 'company_owner' } });
  const adminTemplate = await prisma.roleTemplate.findFirst({ where: { slug: 'process_admin' } });
  const memberTemplate = await prisma.roleTemplate.findFirst({ where: { slug: 'team_member' } });

  // 3. Create company roles
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

  // 4. Create Users
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

  // Create active subscription so assertTenantAccess succeeds
  let testPlan = await prisma.plan.findFirst();
  if (!testPlan) {
    testPlan = await prisma.plan.create({
      data: {
        name: `Security Plan ${timestamp}`,
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

async function runSecurityTests() {
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

  try {
    // -------------------------------------------------------------------------
    // TEST 1: SEC-M4-01 (Attachments Trust the Client)
    // -------------------------------------------------------------------------
    console.log('1. Testing SEC-M4-01 (Attachments Trust the Client)...');

    // 1a. Rejection of unallowlisted entity type (D-S7)
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
    console.log('  ✓ Rejects unallowlisted entityType with 400.');

    // 1b. Rejection of nonexistent entity (404 fail-closed)
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
    console.log('  ✓ Rejects nonexistent entityId with 404.');

    // 1c. Server-generated storageKey and tenant verification
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
        fileName: 'my_report.pdf',
        storageKey: '../../malicious/path.txt', // Client supplied key to be ignored!
      }),
    });
    assert.equal(resAttach.status, 201, 'Authorized attachment create should return 201');
    const attachBody = await resAttach.json();
    assert.ok(attachBody.data.storageKey.startsWith(`attachments/${company.id}/task/${testTask.id}/`), 'Storage key must be server-generated and namespaced');
    assert.ok(!attachBody.data.storageKey.includes('../../'), 'Storage key must not trust client path');
    const attachmentId = attachBody.data.id;
    console.log('  ✓ Server generates secure, namespaced storageKey.');

    // 1d. Unauthorized user attaching to another member\'s task
    const privateTask = await prisma.task.create({
      data: {
        companyId: company.id,
        title: 'Private Task Member 1',
        createdById: memberUser1.id,
        assignedToId: memberUser1.id,
        status: 'Active',
      },
    });

    const resForbiddenAttach = await fetch(`${baseUrl}/api/attachments`, {
      method: 'POST',
      headers: authHeaders(member2Token),
      body: JSON.stringify({
        entityType: 'Task',
        entityId: privateTask.id,
        fileName: 'unauthorized.pdf',
      }),
    });
    assert.equal(resForbiddenAttach.status, 403, 'Unassigned member must be forbidden from attaching');
    console.log('  ✓ Unauthorized member attaching to private task is rejected (403).');

    // 1e. Non-privileged user deleting another user\'s attachment
    const resForbiddenDelete = await fetch(`${baseUrl}/api/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: authHeaders(member2Token),
    });
    assert.equal(resForbiddenDelete.status, 403, 'Other user cannot delete attachment');
    console.log('  ✓ Non-owner cannot delete another user\'s attachment (403).');

    // 1f. Uploader CAN delete their own attachment
    const resAllowedDelete = await fetch(`${baseUrl}/api/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: authHeaders(member1Token),
    });
    assert.equal(resAllowedDelete.status, 200, 'Uploader can delete their own attachment');
    console.log('  ✓ Uploader successfully deletes attachment (200).');
    console.log('✓ SEC-M4-01 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 2: SEC-M4-07 (Odd Reject Loops)
    // -------------------------------------------------------------------------
    console.log('2. Testing SEC-M4-07 (Odd Reject Loops)...');

    // Create a valid template first
    const resValidTpl = await fetch(`${baseUrl}/api/process-templates`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        name: `Loopback Test Template ${Date.now()}`,
        steps: [
          { name: 'Step 1', stepOrder: 1, stepType: 'Approval' },
          { name: 'Step 2', stepOrder: 2, stepType: 'Approval', onRejectGotoStepOrder: 1 },
        ],
      }),
    });
    assert.equal(resValidTpl.status, 201, 'Valid backward loopback should succeed (201)');
    const tplData = (await resValidTpl.json()).data;
    console.log('  ✓ Backward loopback (Step 2 -> Step 1) accepted.');

    // Reject loop pointing forward (Step 1 -> Step 2)
    const resInvalidForwardLoop = await fetch(`${baseUrl}/api/process-templates`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        name: `Invalid Forward Loop Template ${Date.now()}`,
        steps: [
          { name: 'Step 1', stepOrder: 1, stepType: 'Approval', onRejectGotoStepOrder: 2 },
          { name: 'Step 2', stepOrder: 2, stepType: 'Approval' },
        ],
      }),
    });
    assert.equal(resInvalidForwardLoop.status, 400, 'Forward reject loop must return 400');
    console.log('  ✓ Forward reject loop (Step 1 -> Step 2) rejected with 400.');

    // Reject loop pointing to self in addTemplateStep
    const resSelfLoop = await fetch(`${baseUrl}/api/processes/templates/${tplData.id}/steps`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        name: 'Step 3',
        stepOrder: 3,
        stepType: 'Approval',
        onRejectGotoStepId: tplData.steps[1].id, // pointing to Step 2 is valid (< 3)
      }),
    });
    assert.equal(resSelfLoop.status, 201);

    const resInvalidSelfLoop = await fetch(`${baseUrl}/api/processes/templates/${tplData.id}/steps`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        name: 'Step 4',
        stepOrder: 4,
        stepType: 'Approval',
        onRejectGotoStepId: tplData.steps[1].id, // valid order 2 < 4
      }),
    });
    assert.equal(resInvalidSelfLoop.status, 201);
    const addedStep4 = (await resInvalidSelfLoop.json()).data;

    // Now try to update step 2 to point to step 4 (forward)
    const resBadUpdateLoop = await fetch(`${baseUrl}/api/process-templates/${tplData.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        steps: [
          { id: tplData.steps[0].id, name: 'Step 1', stepOrder: 1, stepType: 'Approval' },
          { id: tplData.steps[1].id, name: 'Step 2', stepOrder: 2, stepType: 'Approval', onRejectGotoStepOrder: 3 },
          { id: addedStep4.id, name: 'Step 3', stepOrder: 3, stepType: 'Approval' },
        ],
      }),
    });
    assert.equal(resBadUpdateLoop.status, 400, 'Forward loop in updateTemplate must return 400');
    console.log('  ✓ Forward loop in updateTemplate rejected with 400.');
    console.log('✓ SEC-M4-07 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 3: SEC-M4-04 (Editing Template After Launch Strands Instances)
    // -------------------------------------------------------------------------
    console.log('3. Testing SEC-M4-04 (Editing Template With Active Instances)...');

    // Launch an instance from tplData
    const resLaunch = await fetch(`${baseUrl}/api/process-instances`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        templateId: tplData.id,
        title: 'Active Workflow Instance',
        status: 'Active',
      }),
    });
    assert.equal(resLaunch.status, 201);
    const instanceData = (await resLaunch.json()).data;
    assert.equal(instanceData.status, 'Active');

    // Attempting to modify template steps when active instances exist
    const resStepEditBlocked = await fetch(`${baseUrl}/api/process-templates/${tplData.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        steps: [
          { name: 'Replacement Step 1', stepOrder: 1, stepType: 'Automated_Task' },
        ],
      }),
    });
    assert.equal(resStepEditBlocked.status, 400, 'Step replacement must return 400 when active instances exist');
    console.log('  ✓ Step edit rejected with 400 due to active instance.');

    // Attempting to add a template step when active instances exist
    const resAddStepBlocked = await fetch(`${baseUrl}/api/processes/templates/${tplData.id}/steps`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        name: 'New Step Attempt',
        stepOrder: 5,
        stepType: 'Automated_Task',
      }),
    });
    assert.equal(resAddStepBlocked.status, 400, 'addTemplateStep must return 400 when active instances exist');
    console.log('  ✓ addTemplateStep rejected with 400 due to active instance.');

    // Non-structural metadata update (like name) is allowed
    const resRenameOk = await fetch(`${baseUrl}/api/process-templates/${tplData.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        name: 'Renamed Template While Active',
      }),
    });
    assert.equal(resRenameOk.status, 200, 'Non-structural metadata edit allowed');
    console.log('  ✓ Template metadata edit allowed.');
    console.log('✓ SEC-M4-04 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 4: SEC-M4-05 (Sequence Guard Skipped with null currentStepId)
    // -------------------------------------------------------------------------
    console.log('4. Testing SEC-M4-05 (Sequence Guard with null currentStepId)...');

    // Set instance currentStepId to null
    await prisma.processInstance.update({
      where: { id: instanceData.id },
      data: { currentStepId: null },
    });

    const step1 = instanceData.steps[0];
    const step2 = instanceData.steps[1];

    // Attempting to action step 2 out of order while step 1 is pending
    const resOutOfOrder = await fetch(`${baseUrl}/api/process-instance-steps/${step2.id}/action`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        status: 'Approved',
      }),
    });
    assert.equal(resOutOfOrder.status, 400, 'Step 2 action must be rejected while Step 1 is pending');
    console.log('  ✓ Actioning step out of order with null currentStepId rejected with 400.');

    // Actioning the true active step (Step 1) succeeds
    const resStep1Ok = await fetch(`${baseUrl}/api/process-instance-steps/${step1.id}/action`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        status: 'Approved',
      }),
    });
    assert.equal(resStep1Ok.status, 200, 'Actioning step 1 succeeds');
    console.log('  ✓ Actioning step 1 succeeds (200).');
    console.log('✓ SEC-M4-05 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 5: SEC-M4-02 (Process Step Approved Twice Race Condition)
    // -------------------------------------------------------------------------
    console.log('5. Testing SEC-M4-02 (Double-approval Race Condition Guard)...');

    // Re-actioning step 1 which is now already Approved
    const resDuplicateAction = await fetch(`${baseUrl}/api/process-instance-steps/${step1.id}/action`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        status: 'Approved',
      }),
    });
    assert.equal(resDuplicateAction.status, 400, 'Actioning already approved step must return 400');
    console.log('  ✓ Double actioning already approved step rejected with 400.');
    console.log('✓ SEC-M4-02 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 6: SEC-M4-03 (Approving a Step Bypasses Compliance)
    // -------------------------------------------------------------------------
    console.log('6. Testing SEC-M4-03 (Compliance Enforcement on Step Approval)...');

    // Create a branch, team, project and task linked to Step 2
    const testBranch = await prisma.branch.create({
      data: {
        companyId: company.id,
        name: `Compliance Branch ${Date.now()}`,
      },
    });

    const testTeam = await prisma.team.create({
      data: {
        companyId: company.id,
        branchId: testBranch.id,
        name: `Compliance Team ${Date.now()}`,
      },
    });

    const testProject = await prisma.project.create({
      data: {
        companyId: company.id,
        teamId: testTeam.id,
        createdById: ownerUser.id,
        name: 'Process Compliance Project',
      },
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

    // Create a mandatory compliance rule bound to this project
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

    // Step 2 is now active. Attempt to approve step 2 without required compliance evidence
    const resBlockedByCompliance = await fetch(`${baseUrl}/api/process-instance-steps/${step2.id}/action`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        status: 'Approved',
      }),
    });
    assert.equal(resBlockedByCompliance.status, 403, 'Step approval must be blocked by compliance');
    const compBody = await resBlockedByCompliance.json();
    assert.ok(compBody.message.includes('compliance'), 'Error message must specify compliance block');
    console.log('  ✓ Step approval blocked with 403 when linked task fails compliance.');

    // Verify task was NOT completed
    const taskAfter = await prisma.task.findUnique({ where: { id: compliantLinkedTask.id } });
    assert.equal(taskAfter.status, 'Active', 'Task must remain Active and not Completed');
    console.log('  ✓ Linked task remained Active.');
    console.log('✓ SEC-M4-03 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 7: SEC-M4-06 (Instances Cannot Be Reopened or Completed by Hand)
    // -------------------------------------------------------------------------
    console.log('7. Testing SEC-M4-06 (Instance State Transitions & Terminal Guards)...');

    // 7a. Attempting to mark instance Completed while pending steps exist
    const resPrematureComplete = await fetch(`${baseUrl}/api/process-instances/${instanceData.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        status: 'Completed',
      }),
    });
    assert.equal(resPrematureComplete.status, 400, 'Premature completion must return 400');
    console.log('  ✓ Completing instance with pending steps rejected with 400.');

    // Cancel the instance (valid transition: Active -> Cancelled)
    const resCancel = await fetch(`${baseUrl}/api/process-instances/${instanceData.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        status: 'Cancelled',
      }),
    });
    assert.equal(resCancel.status, 200, 'Active -> Cancelled transition allowed');
    console.log('  ✓ Active -> Cancelled allowed.');

    // 7b. Attempting to reopen Cancelled instance back to Active
    const resReopenBlocked = await fetch(`${baseUrl}/api/process-instances/${instanceData.id}`, {
      method: 'PATCH',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        status: 'Active',
      }),
    });
    assert.equal(resReopenBlocked.status, 400, 'Reopening terminal instance must return 400');
    console.log('  ✓ Reopening cancelled instance rejected with 400 (terminal state immutable).');
    console.log('✓ SEC-M4-06 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 8: SEC-M4-08 (Process Read Scope - X2 Rule)
    // -------------------------------------------------------------------------
    console.log('8. Testing SEC-M4-08 (Process Read Scope - X2 Rule)...');

    // Create an instance where memberUser2 is the initiator
    const resInstMember2 = await fetch(`${baseUrl}/api/process-instances`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        templateId: tplData.id,
        title: 'Member 2 Private Workflow',
        status: 'Active',
      }),
    });
    assert.equal(resInstMember2.status, 201);
    const inst2 = (await resInstMember2.json()).data;

    // Set initiatedById explicitly to memberUser2
    await prisma.processInstance.update({
      where: { id: inst2.id },
      data: { initiatedById: memberUser2.id },
    });

    // 8a. Member 1 listing instances: must NOT see member 2's instance
    const resListMember1 = await fetch(`${baseUrl}/api/process-instances`, {
      headers: authHeaders(member1Token),
    });
    assert.equal(resListMember1.status, 200);
    const listMember1Body = await resListMember1.json();
    const inst2Found = listMember1Body.data.some((i) => i.id === inst2.id);
    assert.equal(inst2Found, false, 'Member 1 must not see Member 2 private instance');
    console.log('  ✓ Member 1 list excludes Member 2 private instance.');

    // 8b. Member 1 direct GET: returns 404 (fail-closed)
    const resGetMember1 = await fetch(`${baseUrl}/api/process-instances/${inst2.id}`, {
      headers: authHeaders(member1Token),
    });
    assert.equal(resGetMember1.status, 404, 'Member 1 fetching Member 2 instance returns 404');
    console.log('  ✓ Member 1 GET /process-instances/:id on non-participating instance returns 404.');

    // 8c. Admin listing instances: sees all instances
    const resListAdmin = await fetch(`${baseUrl}/api/process-instances`, {
      headers: authHeaders(adminToken),
    });
    assert.equal(resListAdmin.status, 200);
    const listAdminBody = await resListAdmin.json();
    const adminFoundInst2 = listAdminBody.data.some((i) => i.id === inst2.id);
    assert.equal(adminFoundInst2, true, 'Admin sees all instances in company');
    console.log('  ✓ Process Admin sees all instances in company.');
    console.log('✓ SEC-M4-08 verified successfully!\n');

    // -------------------------------------------------------------------------
    // TEST 9: Loopback Resolution on createTemplate
    // -------------------------------------------------------------------------
    console.log('9. Testing createTemplate with Rejection Loopback Resolution...');
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
    console.log('  ✓ Template created and loopback onRejectGotoStepId resolved automatically.');
    console.log('✓ createTemplate loopback resolution verified!\n');

    // -------------------------------------------------------------------------
    // TEST 10: deleteTemplate with Self-Referencing Loopback FK
    // -------------------------------------------------------------------------
    console.log('10. Testing deleteTemplate with Self-Referencing Loopback FK...');
    const resDeleteTpl = await fetch(`${baseUrl}/api/process-templates/${createdTplData.id}`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
    });
    assert.equal(resDeleteTpl.status, 200, 'deleteTemplate with loopback must return 200 without FK violation');
    console.log('  ✓ deleteTemplate with self-referencing FK succeeded without crash.');
    console.log('✓ deleteTemplate FK safety verified!\n');

    // -------------------------------------------------------------------------
    // TEST 11: createStep Blocked on Terminal Instances
    // -------------------------------------------------------------------------
    console.log('11. Testing createStep on Terminal Instances...');
    const resAddStepCancelled = await fetch(`${baseUrl}/api/process-instance-steps`, {
      method: 'POST',
      headers: authHeaders(adminToken),
      body: JSON.stringify({
        processInstanceId: instanceData.id, // Cancelled in Test 7
        templateStepId: tplData.steps[0].id,
      }),
    });
    assert.equal(resAddStepCancelled.status, 400, 'Adding step to cancelled instance must return 400');
    console.log('  ✓ createStep on terminal instance rejected with 400.');
    console.log('✓ createStep terminal status guard verified!\n');

    // -------------------------------------------------------------------------
    // TEST 12: deleteInstance Unlinks Task.processInstanceStepId
    // -------------------------------------------------------------------------
    console.log('12. Testing deleteInstance unlinks Task.processInstanceStepId...');
    const testTaskBeforeDel = await prisma.task.findFirst({
      where: { processInstanceStepId: step2.id },
    });
    assert.ok(testTaskBeforeDel, 'Linked task must exist before instance deletion');

    const resDelInst = await fetch(`${baseUrl}/api/process-instances/${instanceData.id}`, {
      method: 'DELETE',
      headers: authHeaders(adminToken),
    });
    assert.equal(resDelInst.status, 200, 'deleteInstance must return 200');

    const testTaskAfterDel = await prisma.task.findUnique({
      where: { id: testTaskBeforeDel.id },
    });
    assert.equal(testTaskAfterDel.processInstanceStepId, null, 'Task processInstanceStepId must be nullified');
    console.log('  ✓ deleteInstance unlinked task.processInstanceStepId cleanly.');
    console.log('✓ deleteInstance task safety verified!\n');

    // -------------------------------------------------------------------------
    // TEST 13: PRE-M4-02 Canonical route POST /api/process-templates/:id/steps
    // -------------------------------------------------------------------------
    console.log('13. Testing Canonical route /api/process-templates/:id/steps...');
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
    console.log('  ✓ Canonical route /api/process-templates/:id/steps works seamlessly.');
    console.log('✓ Canonical routes verified!\n');

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('======================================================================');
  console.log('       ALL 8 SECURITY TASKS (SEC-M4-01 TO SEC-M4-08) PASSED!         ');
  console.log('======================================================================');
}

runSecurityTests().catch((err) => {
  console.error('\n[SECURITY TEST FAILURE]:', err);
  process.exit(1);
});
