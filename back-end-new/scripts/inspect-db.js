import { prisma } from '../src/config/prisma.js';

async function inspectDatabase() {
  console.log('======================================================================');
  console.log('               READ-ONLY POSTGRESQL DATABASE INSPECTION               ');
  console.log('======================================================================\n');

  try {
    // 1. Connection & Session Metadata
    const [meta] = await prisma.$queryRaw`
      SELECT 
        current_database() as db_name,
        current_schema() as current_schema,
        current_user as current_user,
        version() as pg_version,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port
    `;
    console.log('[Metadata]');
    console.log(`Database:       ${meta.db_name}`);
    console.log(`Current Schema: ${meta.current_schema}`);
    console.log(`Current User:   ${meta.current_user}`);
    console.log(`Version:        ${meta.pg_version}`);
    console.log(`Server Port:    ${meta.server_port}\n`);

    // 2. Schemas in database
    const schemas = await prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata
      ORDER BY schema_name
    `;
    console.log(`[Schemas (${schemas.length})]:`, schemas.map(s => s.schema_name).join(', '), '\n');

    // 3. Tables in public schema
    const tables = await prisma.$queryRaw`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`[Tables in 'public' schema (${tables.length})]:`);
    tables.forEach(t => console.log(`  - ${t.table_name} (${t.table_type})`));
    console.log('');

    // 4. Prisma migrations history if table exists
    const hasMigrationTable = tables.some(t => t.table_name === '_prisma_migrations');
    if (hasMigrationTable) {
      const migrations = await prisma.$queryRaw`
        SELECT 
          id, 
          checksum, 
          finished_at, 
          migration_name, 
          logs, 
          rolled_back_at, 
          started_at, 
          applied_steps_count
        FROM _prisma_migrations
        ORDER BY started_at ASC
      `;
      console.log(`[_prisma_migrations records (${migrations.length})]:`);
      migrations.forEach(m => {
        console.log(`  - ${m.migration_name} | steps: ${m.applied_steps_count} | finished: ${m.finished_at ? m.finished_at.toISOString() : 'NULL'} | rolled_back: ${m.rolled_back_at}`);
      });
      console.log('');
    } else {
      console.log('[_prisma_migrations table does NOT exist in public schema]\n');
    }

    // 5. Columns inventory for all tables in public
    const columns = await prisma.$queryRaw`
      SELECT 
        table_name,
        column_name,
        ordinal_position,
        column_default,
        is_nullable,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;

    console.log(`[Columns summary across ${tables.length} tables (${columns.length} columns total)]:`);
    const tablesMap = new Map();
    columns.forEach(col => {
      if (!tablesMap.has(col.table_name)) {
        tablesMap.set(col.table_name, []);
      }
      tablesMap.get(col.table_name).push(col);
    });

    for (const [tableName, colList] of tablesMap.entries()) {
      console.log(`\nTable: "${tableName}" (${colList.length} columns)`);
      colList.forEach(c => {
        const nullableStr = c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultStr = c.column_default ? ` DEFAULT ${c.column_default}` : '';
        console.log(`    ${c.column_name.padEnd(28)} ${c.udt_name.padEnd(16)} ${nullableStr}${defaultStr}`);
      });
    }

    // 6. Enum Types in PostgreSQL
    const enums = await prisma.$queryRaw`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value,
        e.enumsortorder as sort_order
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `;

    console.log(`\n[PostgreSQL Enums in 'public' (${enums.length} values total)]:`);
    const enumMap = new Map();
    enums.forEach(e => {
      if (!enumMap.has(e.enum_name)) {
        enumMap.set(e.enum_name, []);
      }
      enumMap.get(e.enum_name).push(e.enum_value);
    });

    for (const [enumName, values] of enumMap.entries()) {
      console.log(`  Enum "${enumName}": [${values.join(', ')}]`);
    }

    // 7. Foreign Key Constraints
    const fks = await prisma.$queryRaw`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `;

    console.log(`\n[Foreign Key Constraints (${fks.length})]:`);
    fks.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})`);
    });

    console.log('\n======================================================================');
    console.log('                    INSPECTION COMPLETED SUCCESSFULLY                 ');
    console.log('======================================================================');

  } catch (err) {
    console.error('[FATAL] Database inspection error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();
