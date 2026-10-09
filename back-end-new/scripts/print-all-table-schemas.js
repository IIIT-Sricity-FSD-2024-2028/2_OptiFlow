import { prisma } from '../src/config/prisma.js';

async function printAllTableSchemas() {
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;

  for (const t of tables) {
    const cols = await prisma.$queryRaw`
      SELECT 
        column_name, 
        data_type, 
        udt_name, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = ${t.table_name}
      ORDER BY ordinal_position;
    `;
    console.log(`\n================ TABLE: "${t.table_name}" ================`);
    cols.forEach(c => {
      console.log(`  ${c.column_name.padEnd(25)} ${c.udt_name.padEnd(20)} ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} default: ${c.column_default}`);
    });
  }

  await prisma.$disconnect();
}

printAllTableSchemas();
