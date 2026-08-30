const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findFirst({ where: { email: "employee@acme.com" }});
  
  const where = { deletedAt: null, assignedToId: user.id };
  const tasks = await prisma.task.findMany({
    where,
    include: {
      subtasks: { where: { deletedAt: null } },
      assignedTo: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    }
  });
  console.log("Tasks length:", tasks.length);
}
run().catch(console.error).finally(()=>prisma.$disconnect());
