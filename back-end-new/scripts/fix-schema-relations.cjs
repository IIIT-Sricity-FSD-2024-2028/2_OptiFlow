const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

const injections = {
  'User': '\n  systemAuditLogsTargeted SystemAuditLog[] @relation("SystemAuditTargetUser")\n  systemAuditLogsPerformed SystemAuditLog[] @relation("SystemPerformedBy")\n  processAuditLogsPerformed ProcessAuditLog[] @relation("ProcessPerformedBy")\n',
  'Role': '\n  systemAuditLogs SystemAuditLog[]\n',
  'Team': '\n  systemAuditLogs SystemAuditLog[]\n',
  'Branch': '\n  systemAuditLogs SystemAuditLog[]\n',
  'Project': '\n  processAuditLogs ProcessAuditLog[]\n',
  'Task': '\n  processAuditLogs ProcessAuditLog[]\n',
  'ProcessTemplate': '\n  processAuditLogs ProcessAuditLog[]\n',
};

for (const [model, fields] of Object.entries(injections)) {
  const regex = new RegExp(`(model ${model} \\{[^}]*)(\\})`, 'm');
  schema = schema.replace(regex, `$1${fields}$2`);
}

fs.writeFileSync(schemaPath, schema);
console.log('Successfully injected back-relations.');
