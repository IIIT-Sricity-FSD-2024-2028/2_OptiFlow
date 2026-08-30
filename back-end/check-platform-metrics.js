const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const companies = await prisma.company.findMany();
  console.log("Total companies:", companies.length);
}
run().catch(console.error).finally(()=>prisma.$disconnect());
