import { prisma } from '../src/config/prisma.js';
import fs from 'fs';
import path from 'path';

async function compareSchema() {
  const schemaText = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const modelRegex = /model\s+(\w+)\s+\{([^}]+)\}/g;
  const models = [];
  let match;
  while ((match = modelRegex.exec(schemaText)) !== null) {
    const modelName = match[1];
    const body = match[2];
    
    // Check for @@map
    const mapMatch = body.match(/@@map\("([^"]+)"\)/);
    const mappedName = mapMatch ? mapMatch[1] : modelName;

    // Check fields
    const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@'));
    const fields = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];
      const fieldMapMatch = line.match(/@map\("([^"]+)"\)/);
      const mappedFieldName = fieldMapMatch ? fieldMapMatch[1] : fieldName;
      fields.push({ fieldName, fieldType, mappedFieldName });
    }

    models.push({ modelName, mappedName, fields });
  }

  // Get physical tables
  const dbTables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
  const dbTableNames = dbTables.map(t => t.table_name);

  console.log('=== COMPARISON: PRISMA MODELS VS DB TABLES ===\n');
  for (const m of models) {
    const existsDirect = dbTableNames.includes(m.modelName);
    const existsMapped = dbTableNames.includes(m.mappedName);
    const snakePlural = m.modelName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + 's';
    // special cases like company -> companies, access -> accesses
    const snakePluralFix = snakePlural.replace(/companys$/, 'companies').replace(/categorys$/, 'categories');
    const existsSnake = dbTableNames.includes(snakePluralFix);

    console.log(`Model: ${m.modelName.padEnd(25)} @@map: ${(m.mappedName !== m.modelName ? m.mappedName : 'none').padEnd(20)} Direct Match: ${existsDirect} | Mapped Match: ${existsMapped} | In DB as: ${dbTableNames.find(t => t.toLowerCase() === m.modelName.toLowerCase() || t === m.mappedName || t === snakePluralFix || t === snakePlural) || 'NOT FOUND'}`);
  }

  console.log('\n=== ALL PHYSICAL DB TABLES ===');
  console.log(dbTableNames.join(', '));

  await prisma.$disconnect();
}

compareSchema();
