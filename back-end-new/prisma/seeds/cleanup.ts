// prisma/seeds/cleanup.ts
// Empties every table so the seed can run on a database that already has data (it is re-runnable).
//
// Order matters: a table must be emptied before every table it points to (children first). The rows below
// follow the foreign keys in schema.prisma from the leaves up to Plan.

import type { PrismaClient } from "@prisma/client";

export async function cleanDatabase(prisma: PrismaClient) {
  await prisma.attachment.deleteMany({});
  await prisma.systemAuditLog.deleteMany({});
  await prisma.processAuditLog.deleteMany({});
  await prisma.complianceAuditLog.deleteMany({});
  // await prisma.comment.deleteMany({});
  await prisma.complianceEvidence.deleteMany({});
  await prisma.complianceViolation.deleteMany({});
  await prisma.complianceBinding.deleteMany({});
  await prisma.complianceRule.deleteMany({});
  await prisma.complianceCategory.deleteMany({});
  await prisma.escalation.deleteMany({});
  await prisma.subtask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.processInstanceStep.deleteMany({});
  await prisma.processInstance.deleteMany({});
  await prisma.processTemplateStep.deleteMany({});
  await prisma.processTemplate.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.branch.deleteMany({});
  // await prisma.permissionGrant.deleteMany({});
  await prisma.roleAssignment.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.roleTemplatePermission.deleteMany({});
  await prisma.roleTemplate.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscription.deleteMany({});
  // Platform audit rows point at both the admin and the company with onDelete: Restrict, so they must
  // go before either of them. Missing from this list, the seed failed on any database that already had one.
  await prisma.platformAuditLog.deleteMany({});
  await prisma.platformSupportAccess.deleteMany({});
  await prisma.platformAdminUser.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.plan.deleteMany({});
}
