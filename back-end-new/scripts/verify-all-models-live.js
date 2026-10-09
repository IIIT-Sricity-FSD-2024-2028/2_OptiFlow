import { prisma } from '../src/config/prisma.js';

async function verifyAllModelsLive() {
  console.log('======================================================================');
  console.log('            LIVE DATABASE PRISMA MODELS QUERY VERIFICATION            ');
  console.log('======================================================================\n');

  const tests = [
    { name: 'Company', fn: () => prisma.company.findMany({ take: 3 }) },
    { name: 'User', fn: () => prisma.user.findMany({ take: 3, include: { company: true } }) },
    { name: 'Branch', fn: () => prisma.branch.findMany({ take: 3 }) },
    { name: 'Team', fn: () => prisma.team.findMany({ take: 3, include: { branch: true } }) },
    { name: 'TeamMember', fn: () => prisma.teamMember.findMany({ take: 3 }) },
    { name: 'Role', fn: () => prisma.role.findMany({ take: 3 }) },
    { name: 'RoleAssignment', fn: () => prisma.roleAssignment.findMany({ take: 3, include: { role: true, user: true } }) },
    { name: 'RoleTemplate', fn: () => prisma.roleTemplate.findMany({ take: 3 }) },
    { name: 'RolePermission', fn: () => prisma.rolePermission.findMany({ take: 3 }) },
    { name: 'Permission', fn: () => prisma.permission.findMany({ take: 3 }) },
    { name: 'Project', fn: () => prisma.project.findMany({ take: 3, include: { team: true } }) },
    { name: 'Task', fn: () => prisma.task.findMany({ take: 3, include: { project: true } }) },
    { name: 'Subtask', fn: () => prisma.subtask.findMany({ take: 3, include: { task: true } }) },
    { name: 'Escalation', fn: () => prisma.escalation.findMany({ take: 3 }) },
    { name: 'ComplianceCategory', fn: () => prisma.complianceCategory.findMany({ take: 3 }) },
    { name: 'ComplianceRule', fn: () => prisma.complianceRule.findMany({ take: 3, include: { category: true } }) },
    { name: 'ComplianceBinding', fn: () => prisma.complianceBinding.findMany({ take: 3, include: { rule: true } }) },
    { name: 'ComplianceViolation', fn: () => prisma.complianceViolation.findMany({ take: 3, include: { rule: true } }) },
    { name: 'ComplianceEvidence', fn: () => prisma.complianceEvidence.findMany({ take: 3 }) },
    { name: 'AuditLog', fn: () => prisma.auditLog.findMany({ take: 3 }) },
    { name: 'Notification', fn: () => prisma.notification.findMany({ take: 3 }) },
    { name: 'Plan', fn: () => prisma.plan.findMany({ take: 3 }) },
    { name: 'Subscription', fn: () => prisma.subscription.findMany({ take: 3, include: { plan: true, company: true } }) },
    { name: 'PlatformAdminUser', fn: () => prisma.platformAdminUser.findMany({ take: 3 }) },
    { name: 'PlatformSupportAccess', fn: () => prisma.platformSupportAccess.findMany({ take: 3 }) },
    { name: 'ProcessTemplate', fn: () => prisma.processTemplate.findMany({ take: 3 }) },
    { name: 'ProcessTemplateStep', fn: () => prisma.processTemplateStep.findMany({ take: 3 }) },
    { name: 'ProcessInstance', fn: () => prisma.processInstance.findMany({ take: 3 }) },
    { name: 'ProcessInstanceStep', fn: () => prisma.processInstanceStep.findMany({ take: 3 }) },
    { name: 'Attachment (file_objects)', fn: () => prisma.attachment.findMany({ take: 3 }) },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const records = await t.fn();
      console.log(`  ✓ ${t.name.padEnd(30)} SUCCESS (Found ${records.length} records)`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${t.name.padEnd(30)} FAILED:`, err.message);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAllModelsLive();
