const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tasks = await prisma.task.findMany({
    include: {
        subtasks: { where: { deletedAt: null } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
    }
  });
  console.log(JSON.stringify(tasks.slice(0,1), null, 2));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
