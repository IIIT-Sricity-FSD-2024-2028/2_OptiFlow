const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({
    where: { email: "compliance@acme.com" },
    include: {
      roleAssignments: {
        include: { role: true }
      }
    }
  });
  console.log("Compliance Users found:", JSON.stringify(users, null, 2));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
