const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const admins = await prisma.platformAdminUser.findMany({});
  console.log("Platform Admin Users found:", JSON.stringify(admins, null, 2));
}
run().catch(console.error).finally(()=>prisma.$disconnect());
