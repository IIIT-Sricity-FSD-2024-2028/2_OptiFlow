const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const admin = await prisma.platformAdminUser.findFirst();
  console.log("Platform Admin:", admin);
}
run().catch(console.error).finally(()=>prisma.$disconnect());
