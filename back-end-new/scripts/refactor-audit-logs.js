import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'back-end-new/src/controllers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix imports
  if (content.includes('createAuditLog,')) {
    content = content.replace(
      /import \{ createAuditLog, AUDIT_ACTIONS \} from ['"]\.\.\/utils\/audit\.js['"];?/g,
      `import { createSystemAuditLog, createProcessAuditLog, createComplianceAuditLog, AUDIT_ACTIONS } from '../utils/audit.js';`
    );
  }

  // Find all createAuditLog blocks
  const regex = /createAuditLog\(\{\s*([\s\S]*?)\}\)/g;
  content = content.replace(regex, (match, body) => {
    // Determine type
    if (body.includes("entityType: 'User'") || body.includes('entityType: "User"')) {
      let newBody = body.replace(/entityType:\s*['"]User['"],?\s*/, '');
      newBody = newBody.replace(/entityId:/, 'targetUserId:');
      return `createSystemAuditLog({${newBody}})`;
    }
    if (body.includes("entityType: 'Role'") || body.includes('entityType: "Role"')) {
      let newBody = body.replace(/entityType:\s*['"]Role['"],?\s*/, '');
      newBody = newBody.replace(/entityId:/, 'roleId:');
      return `createSystemAuditLog({${newBody}})`;
    }
    if (body.includes("entityType: 'Team'") || body.includes('entityType: "Team"')) {
      let newBody = body.replace(/entityType:\s*['"]Team['"],?\s*/, '');
      newBody = newBody.replace(/entityId:/, 'teamId:');
      return `createSystemAuditLog({${newBody}})`;
    }
    if (body.includes("entityType: 'Branch'") || body.includes('entityType: "Branch"')) {
      let newBody = body.replace(/entityType:\s*['"]Branch['"],?\s*/, '');
      newBody = newBody.replace(/entityId:/, 'branchId:');
      return `createSystemAuditLog({${newBody}})`;
    }
    if (body.includes("entityType: 'Project'") || body.includes('entityType: "Project"')) {
      let newBody = body.replace(/entityType:\s*['"]Project['"],?\s*/, '');
      newBody = newBody.replace(/entityId:/, 'projectId:');
      return `createProcessAuditLog({${newBody}})`;
    }
    if (body.includes("entityType: 'Task'") || body.includes('entityType: "Task"')) {
      let newBody = body.replace(/entityType:\s*['"]Task['"],?\s*/, '');
      newBody = newBody.replace(/entityId:/, 'taskId:');
      return `createProcessAuditLog({${newBody}})`;
    }
    if (body.includes("entityType: 'ProcessTemplate'") || body.includes('entityType: "ProcessTemplate"')) {
      let newBody = body.replace(/entityType:\s*['"]ProcessTemplate['"],?\s*/, '');
      newBody = newBody.replace(/entityId:/, 'templateId:');
      return `createProcessAuditLog({${newBody}})`;
    }
    
    // For anything else (like attachments, permissions), we'll map to SystemAuditLog without a specific FK for now, 
    // or just leave it commented if it breaks. Let's map unknown to SystemAuditLog and just drop entityId.
    let newBody = body.replace(/entityType:\s*['"][a-zA-Z]+['"],?\s*/, '');
    newBody = newBody.replace(/entityId:\s*[^,]+,?\s*/, '');
    return `createSystemAuditLog({${newBody}})`;
  });

  fs.writeFileSync(filePath, content);
}

console.log("Refactoring complete.");
