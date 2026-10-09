import { prisma } from '../src/config/prisma.js';
import fs from 'fs';

async function fieldByFieldAudit() {
  const schemaText = fs.readFileSync('prisma/schema.prisma', 'utf8');

  // Parse all models and fields from schema.prisma
  const modelBlocks = schemaText.split(/model\s+/).slice(1);
  const prismaModels = {};

  for (const block of modelBlocks) {
    const lines = block.split('\n');
    const header = lines[0].trim().split(/\s+/)[0];
    const modelName = header.replace('{', '').trim();

    prismaModels[modelName] = {
      fields: {},
      tableMap: null,
    };

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;
      if (line.startsWith('}')) break;

      if (line.startsWith('@@map(')) {
        const m = line.match(/@@map\("([^"]+)"\)/);
        if (m) prismaModels[modelName].tableMap = m[1];
        continue;
      }
      if (line.startsWith('@@')) continue; // @@index, @@unique, etc.

      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];
      const isRelation = !['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal', 'Bytes'].includes(fieldType?.replace('?', '').replace('[]', ''));
      
      const mapMatch = line.match(/@map\("([^"]+)"\)/);
      const columnMap = mapMatch ? mapMatch[1] : null;

      prismaModels[modelName].fields[fieldName] = {
        type: fieldType,
        isOptional: fieldType?.includes('?'),
        isArray: fieldType?.includes('[]'),
        isRelation,
        columnMap,
      };
    }
  }

  // Get physical DB table & column data
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

  const dbTables = {};
  for (const c of cols) {
    if (!dbTables[c.table_name]) dbTables[c.table_name] = {};
    dbTables[c.table_name][c.column_name] = c;
  }

  console.log('======================================================================');
  console.log('            FIELD-BY-FIELD & MODEL-BY-TABLE COMPARISON AUDIT           ');
  console.log('======================================================================\n');

  // Mapping heuristic
  const tableMappingCandidates = {
    'Plan': 'plans',
    'Subscription': 'subscriptions',
    'PlatformAdminUser': 'platform_admin_users',
    'PlatformSupportAccess': 'platform_support_accesses',
    'Company': 'companies',
    'User': 'users',
    'Permission': 'permissions',
    'RoleTemplate': 'role_templates',
    'RoleTemplatePermission': 'role_template_permissions',
    'Role': 'roles',
    'RolePermission': 'role_permissions',
    'RoleAssignment': 'role_assignments',
    'Branch': 'branches',
    'Team': 'teams',
    'Project': 'projects',
    'Task': 'tasks',
    'Subtask': 'subtasks',
    'ProcessTemplate': 'process_templates',
    'ProcessTemplateStep': 'process_template_steps',
    'ProcessInstance': 'process_instances',
    'ProcessInstanceStep': 'process_instance_steps',
    'ComplianceCategory': 'compliance_categories',
    'ComplianceRule': 'compliance_rules',
    'ComplianceBinding': 'compliance_bindings',
    'ComplianceViolation': 'compliance_violations',
    'Escalation': 'escalations',
    'ComplianceEvidence': 'compliance_evidence',
    'AuditLog': 'audit_logs',
    'Notification': 'notifications',
    'Comment': 'comments',
    'Attachment': 'file_objects',
  };

  const auditReport = [];

  for (const [modelName, modelInfo] of Object.entries(prismaModels)) {
    const targetTable = modelInfo.tableMap || tableMappingCandidates[modelName] || modelName;
    const dbCols = dbTables[targetTable];

    console.log(`\n----------------------------------------------------------------------`);
    console.log(`MODEL: ${modelName}  -->  PHYSICAL TABLE: "${targetTable}"`);
    console.log(`----------------------------------------------------------------------`);

    if (!dbCols) {
      console.log(`  ❌ CRITICAL: Physical table "${targetTable}" DOES NOT EXIST in database!`);
      auditReport.push({
        model: modelName,
        table: targetTable,
        severity: 'CRITICAL',
        issue: `Table "${targetTable}" not found in PostgreSQL.`,
      });
      continue;
    }

    // Compare fields
    const dbColNames = Object.keys(dbCols);
    const checkedDbCols = new Set();

    for (const [fieldName, fieldInfo] of Object.entries(modelInfo.fields)) {
      if (fieldInfo.isRelation && fieldInfo.isArray) continue; // 1-to-many or many-to-many relation array
      if (fieldInfo.isRelation && !fieldInfo.type.startsWith('String')) {
        // Relation object, skip if there's a scalar ID field
        continue;
      }

      const expectedCol = fieldInfo.columnMap || fieldName;
      const actualCol = dbCols[expectedCol];

      if (!actualCol) {
        // Check if camelCase vs snake_case exists
        const snakeCol = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
        const altCol = dbCols[snakeCol];

        if (altCol) {
          console.log(`  ⚠️ Column mismatch: Field "${fieldName}" expects column "${expectedCol}", but DB has "${snakeCol}"`);
          checkedDbCols.add(snakeCol);
          auditReport.push({
            model: modelName,
            table: targetTable,
            field: fieldName,
            expectedCol,
            actualCol: snakeCol,
            severity: 'MISMATCH',
            fix: `@map("${snakeCol}")`,
          });
        } else {
          console.log(`  ❌ Missing Column: Field "${fieldName}" (expected column "${expectedCol}") is NOT in table "${targetTable}"`);
          auditReport.push({
            model: modelName,
            table: targetTable,
            field: fieldName,
            expectedCol,
            severity: 'MISSING_IN_DB',
          });
        }
      } else {
        checkedDbCols.add(expectedCol);
        // Type / Nullability check
        const isDbNullable = actualCol.is_nullable === 'YES';
        if (!fieldInfo.isOptional && isDbNullable && actualCol.column_default === null && fieldName !== 'id') {
          // Schema says required, DB says nullable (safe for reads, but good to know)
        }
      }
    }

    // Check for physical DB columns not in Prisma schema
    for (const dbCol of dbColNames) {
      if (!checkedDbCols.has(dbCol)) {
        console.log(`  ℹ️ DB column "${dbCol}" is in table "${targetTable}" but not in Prisma model ${modelName}`);
      }
    }
  }

  console.log('\n======================================================================');
  console.log('                         AUDIT SUMMARY REPORT                         ');
  console.log('======================================================================\n');
  console.log(JSON.stringify(auditReport, null, 2));

  await prisma.$disconnect();
}

fieldByFieldAudit();
