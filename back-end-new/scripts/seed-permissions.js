import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SYSTEM_PERMISSIONS = [
  // Work Delivery & Tasks
  { slug: 'task:create', module: 'Tasks', description: 'Design and delegate parent project tasks' },
  { slug: 'task:subtask:create', module: 'Tasks', description: 'Decompose tasks into granular subtasks' },
  { slug: 'task:execute', module: 'Tasks', description: 'Update progress, submit deliverables and hours' },
  { slug: 'task:review', module: 'Tasks', description: 'First-line review and approval of deliverables' },
  { slug: 'task:change_request', module: 'Tasks', description: 'Petition upward baseline modifications' },

  // Company Governance & HR
  { slug: 'hr:user:create', module: 'HR', description: 'Create user profiles and assign primary roles' },
  { slug: 'hr:user:manage', module: 'HR', description: 'Edit employee profiles, job titles, and status' },
  { slug: 'hr:branch:manage', module: 'HR', description: 'Create and administer regional branch hubs' },
  { slug: 'hr:team:manage', module: 'HR', description: 'Organize functional pods and assign members' },
  { slug: 'hr:role:architect', module: 'HR', description: 'Define dynamic custom roles & permissions' },

  // Compliance & Auditing
  { slug: 'compliance:rule:manage', module: 'Compliance', description: 'Establish compliance policies and categories' },
  { slug: 'compliance:evidence:audit', module: 'Compliance', description: 'Inspect deliverables and cryptographic hashes' },
  { slug: 'compliance:violation:adjudicate', module: 'Compliance', description: 'Issue and resolve compliance penalties' },

  // Workflow & Process
  { slug: 'process:template:design', module: 'Process', description: 'Author reusable multi-stage workflows' },
  { slug: 'executive:telemetry:view', module: 'Executive', description: 'Access cross-branch financial KPIs' },
];

export const ROLE_DEFAULT_PERMISSIONS = {
  system_admin: SYSTEM_PERMISSIONS.map((p) => p.slug),
  company_owner: SYSTEM_PERMISSIONS.map((p) => p.slug),
  access_governance: [
    'hr:user:create',
    'hr:user:manage',
    'hr:branch:manage',
    'hr:team:manage',
    'hr:role:architect',
    'task:create',
    'task:execute',
    'executive:telemetry:view',
  ],
  hr_manager: [
    'hr:user:create',
    'hr:user:manage',
    'hr:branch:manage',
    'hr:team:manage',
    'hr:role:architect',
    'task:create',
    'task:execute',
    'executive:telemetry:view',
  ],
  branch_manager: [
    'hr:user:manage',
    'hr:branch:manage',
    'hr:team:manage',
    'task:create',
    'task:subtask:create',
    'task:execute',
    'task:review',
    'executive:telemetry:view',
  ],
  project_manager: [
    'task:create',
    'task:subtask:create',
    'task:execute',
    'task:review',
    'task:change_request',
    'hr:team:manage',
    'process:template:design',
    'executive:telemetry:view',
  ],
  process_admin: [
    'process:template:design',
    'task:create',
    'task:subtask:create',
    'task:execute',
    'task:review',
    'executive:telemetry:view',
  ],
  compliance_officer: [
    'compliance:rule:manage',
    'compliance:evidence:audit',
    'compliance:violation:adjudicate',
    'executive:telemetry:view',
  ],
  team_lead: [
    'task:subtask:create',
    'task:execute',
    'task:review',
    'task:change_request',
    'hr:team:manage',
  ],
  team_member: [
    'task:execute',
    'task:change_request',
  ],
};

export function normalizeRoleSlug(labelOrSlug = '') {
  return labelOrSlug.toLowerCase().trim().replace(/[\s-]+/g, '_');
}

export async function seedPermissions() {
  console.log('1. Upserting system permissions...');
  const permRecords = {};
  for (const p of SYSTEM_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { slug: p.slug },
      update: { module: p.module, description: p.description },
      create: { slug: p.slug, module: p.module, description: p.description },
    });
    permRecords[p.slug] = record.id;
  }
  console.log('✓ Upserted', Object.keys(permRecords).length, 'permissions');

  console.log('2. Linking RoleTemplatePermissions...');
  const templates = await prisma.roleTemplate.findMany();
  for (const t of templates) {
    const slug = normalizeRoleSlug(t.slug || t.label);
    const slugs = ROLE_DEFAULT_PERMISSIONS[slug] || [];
    for (const pSlug of slugs) {
      const permissionId = permRecords[pSlug];
      if (permissionId) {
        await prisma.roleTemplatePermission.upsert({
          where: {
            roleTemplateId_permissionId: {
              roleTemplateId: t.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleTemplateId: t.id,
            permissionId,
          },
        });
      }
    }
    console.log(`  Template [${t.label}] linked with ${slugs.length} default permissions`);
  }

  console.log('3. Linking RolePermissions for all company roles...');
  const roles = await prisma.role.findMany({
    include: { roleTemplate: true },
  });
  for (const r of roles) {
    const slug = normalizeRoleSlug(r.roleTemplate?.slug || r.name || r.label);
    const slugs = ROLE_DEFAULT_PERMISSIONS[slug] || [];
    let count = 0;
    for (const pSlug of slugs) {
      const permissionId = permRecords[pSlug];
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: r.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: r.id,
            permissionId,
          },
        });
        count++;
      }
    }
    console.log(`  Role [${r.label}] (${r.id}) in company ${r.companyId} -> ${count} permissions assigned`);
  }

  console.log('✓ All roles and templates populated with default permissions!');
}

if (process.argv[1]?.endsWith('seed-permissions.js')) {
  seedPermissions()
    .catch((err) => {
      console.error('Error seeding permissions:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
