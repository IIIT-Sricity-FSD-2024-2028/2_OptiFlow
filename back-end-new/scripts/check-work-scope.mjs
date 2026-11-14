// Read-only smoke check for project/task/subtask/escalation scope queries.
// Usage: node scripts/check-work-scope.mjs
import { prisma } from '../src/config/prisma.js';
import {
  buildProjectListWhere,
  buildTaskListWhere,
  buildSubtaskListWhere,
  getAssignedProjectIds,
} from '../src/utils/tenantScope.js';

const ROLE_LABELS = ['Project Manager', 'Team Lead', 'Team Member', 'Branch Manager', 'Company Owner', 'System Admin'];

async function sampleUser(label) {
  const ra = await prisma.roleAssignment.findFirst({
    where: { revokedAt: null, role: { label } },
    include: { role: true, user: true },
  });
  if (!ra) return null;
  return {
    id: ra.user.id,
    companyId: ra.user.companyId,
    roleLabel: ra.role.label,
    role: ra.role.name || ra.role.label,
    scopeType: ra.scopeType,
    scopeId: ra.scopeId,
  };
}

let failures = 0;
for (const label of ROLE_LABELS) {
  const user = await sampleUser(label);
  if (!user) {
    console.log(`- ${label}: no seeded user, skipped`);
    continue;
  }
  try {
    const assignedProjectIds = await getAssignedProjectIds(prisma, user);
    const args = { companyId: user.companyId, user, assignedProjectIds };
    const projects = await prisma.project.count({ where: buildProjectListWhere(args) });
    const tasks = await prisma.task.count({ where: buildTaskListWhere(args) });
    const subtasks = await prisma.subtask.count({ where: buildSubtaskListWhere(args) });
    const escalations = await prisma.escalation.count({
      where: {
        companyId: user.companyId,
        OR: [
          { reportedById: user.id },
          { project: { team: { branchId: 'x' } } },
          { task: { OR: [{ createdById: user.id }, { project: { OR: [{ createdById: user.id }, { id: { in: assignedProjectIds } }] } }] } },
        ],
      },
    });
    console.log(`+ ${label}: projects=${projects} tasks=${tasks} subtasks=${subtasks} escalations=${escalations} assignedProjects=${assignedProjectIds.length}`);
  } catch (err) {
    failures += 1;
    console.error(`x ${label}: ${err.message.split('\n').slice(-3).join(' ')}`);
  }
}

// Role-filter relation used by updateMany in projects.controller.
try {
  await prisma.roleAssignment.count({
    where: {
      scopeType: 'Project',
      revokedAt: null,
      role: { OR: [{ label: 'Project Manager' }, { name: 'project_manager' }, { roleTemplate: { slug: 'project_manager' } }] },
    },
  });
  console.log('+ PM role relation filter ok');
} catch (err) {
  failures += 1;
  console.error('x PM role relation filter:', err.message);
}

await prisma.$disconnect();
process.exit(failures ? 1 : 0);
