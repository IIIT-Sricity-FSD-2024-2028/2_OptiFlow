import { prisma } from '../src/config/prisma.js';
import fs from 'fs';

async function detailedComparator() {
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
      if (line.startsWith('@@')) continue;

      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];
      const isScalar = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal', 'Bytes'].includes(fieldType?.replace('?', '').replace('[]', ''));
      const isEnum = !isScalar && !fieldType.includes('[]') && !['User', 'Company', 'Branch', 'Team', 'Project', 'Task', 'Subtask', 'Plan', 'Subscription', 'PlatformAdminUser', 'PlatformSupportAccess', 'Role', 'RoleTemplate', 'Permission', 'ProcessTemplate', 'ProcessTemplateStep', 'ProcessInstance', 'ProcessInstanceStep', 'ComplianceCategory', 'ComplianceRule', 'ComplianceBinding', 'ComplianceViolation', 'Escalation', 'ComplianceEvidence', 'AuditLog', 'Notification', 'Comment', 'Attachment', 'RoleAssignment', 'RolePermission', 'RoleTemplatePermission'].includes(fieldType.replace('?', ''));

      const mapMatch = line.match(/@map\("([^"]+)"\)/);
      const columnMap = mapMatch ? mapMatch[1] : null;

      prismaModels[modelName].fields[fieldName] = {
        type: fieldType,
        isScalar: isScalar || isEnum,
        columnMap,
        rawLine: line,
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

  const tableMapping = {
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

  const modelAnalysis = {};

  for (const [modelName, modelInfo] of Object.entries(prismaModels)) {
    const tableName = tableMapping[modelName];
    const dbCols = dbTables[tableName];

    if (!dbCols) {
      modelAnalysis[modelName] = { status: 'TABLE_MISSING', tableName };
      continue;
    }

    const matchedColumns = [];
    const missingColumnsInDb = [];
    const extraColumnsInDb = [];

    const dbColSet = new Set(Object.keys(dbCols));

    for (const [fieldName, fieldInfo] of Object.entries(modelInfo.fields)) {
      if (!fieldInfo.isScalar) continue;

      const colName = fieldInfo.columnMap || fieldName;
      if (dbCols[colName]) {
        matchedColumns.push({
          field: fieldName,
          column: colName,
          prismaType: fieldInfo.type,
          dbType: dbCols[colName].udt_name,
          nullable: dbCols[colName].is_nullable === 'YES',
        });
        dbColSet.delete(colName);
      } else {
        missingColumnsInDb.push({
          field: fieldName,
          expectedColumn: colName,
          prismaType: fieldInfo.type,
        });
      }
    }

    for (const col of dbColSet) {
      extraColumnsInDb.push({
        column: col,
        dbType: dbCols[col].udt_name,
        nullable: dbCols[col].is_nullable === 'YES',
        default: dbCols[col].column_default,
      });
    }

    modelAnalysis[modelName] = {
      status: missingColumnsInDb.length === 0 ? 'PERFECT_OR_SUBSET' : 'FIELD_MISMATCH',
      tableName,
      matchedCount: matchedColumns.length,
      missingInDbCount: missingColumnsInDb.length,
      missingInDb: missingColumnsInDb,
      extraInDbCount: extraColumnsInDb.length,
      extraInDb: extraColumnsInDb,
    };
  }

  console.log(JSON.stringify(modelAnalysis, null, 2));

  await prisma.$disconnect();
}

detailedComparator();
