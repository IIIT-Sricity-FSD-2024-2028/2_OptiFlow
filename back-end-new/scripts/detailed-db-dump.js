import { prisma } from '../src/config/prisma.js';

async function detailedDump() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('=== ALL TABLES IN POSTGRESQL ===');
    console.log(tables.map(t => t.table_name));

    const migrationCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
      ) as exists;
    `;
    
    if (migrationCheck[0]?.exists) {
      const records = await prisma.$queryRaw`SELECT * FROM _prisma_migrations;`;
      console.log('\n=== _PRISMA_MIGRATIONS ===');
      console.log(records);
    } else {
      console.log('\n=== NO _PRISMA_MIGRATIONS TABLE ===');
    }

    // Dump column details for all tables
    const cols = await prisma.$queryRaw`
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        udt_name, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `;

    console.log('\n=== COLUMNS PER TABLE ===');
    const byTable = {};
    for (const c of cols) {
      if (!byTable[c.table_name]) byTable[c.table_name] = [];
      byTable[c.table_name].push({
        col: c.column_name,
        type: c.udt_name,
        nullable: c.is_nullable === 'YES',
        default: c.column_default,
      });
    }
    console.log(JSON.stringify(byTable, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

detailedDump();
