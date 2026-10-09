import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No company found, skipping seed");
    return;
  }
  
  const user = await prisma.user.findFirst({ where: { companyId: company.id } });
  const role = await prisma.role.findFirst({ where: { companyId: company.id } });
  const project = await prisma.project.findFirst({ where: { companyId: company.id } });
  const task = await prisma.task.findFirst({ where: { projectId: project?.id } });
  
  if (user) {
    await prisma.systemAuditLog.create({
      data: {
        companyId: company.id,
        targetUserId: user.id,
        action: 'LOGIN',
        performedById: user.id,
        ipAddress: '192.168.1.5',
        userAgent: 'Mozilla/5.0'
      }
    });
    console.log("Seeded SystemAuditLog (LOGIN)");
  }
  
  if (role) {
    await prisma.systemAuditLog.create({
      data: {
        companyId: company.id,
        roleId: role.id,
        action: 'UPDATE',
        performedById: user?.id,
        oldValue: { name: 'Admin' },
        newValue: { name: 'Super Admin' }
      }
    });
    console.log("Seeded SystemAuditLog (ROLE UPDATE)");
  }
  
  if (task) {
    await prisma.processAuditLog.create({
      data: {
        companyId: company.id,
        projectId: project?.id,
        taskId: task.id,
        action: 'STATUS_CHANGE',
        performedById: user?.id,
        oldValue: { status: 'TODO' },
        newValue: { status: 'IN_PROGRESS' }
      }
    });
    console.log("Seeded ProcessAuditLog (TASK UPDATE)");
  }

  console.log("Successfully seeded System and Process Audit Logs!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
