-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('Monthly', 'Annual');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Active', 'PastDue', 'Cancelled', 'Trialing');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('Active', 'Suspended', 'Closed');

-- CreateEnum
CREATE TYPE "RoleTemplateOrigin" AS ENUM ('platform_predefined', 'company_custom');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('Company', 'Branch', 'Team', 'Project');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('Planning', 'Active', 'OnHold', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('Draft', 'Active', 'In_Review', 'Blocked', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('Approval', 'Input_Required', 'Automated_Task');

-- CreateEnum
CREATE TYPE "ProcessInstanceStatus" AS ENUM ('Draft', 'Active', 'Completed', 'Cancelled', 'Rejected');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Skipped');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('Open', 'Under_Review', 'Resolved', 'Ignored');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('Open', 'Reviewed', 'Resolved', 'Closed');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('Pending', 'Under_Review', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'PERMISSION_CHANGE', 'LOGOUT', 'TOKEN_REFRESH', 'TOKEN_REUSE_DETECTED', 'ROLE_ASSIGNED', 'ROLE_REVOKED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'SUPPORT_ACCESS_GRANTED', 'SUPPORT_ACCESS_REVOKED', 'EVIDENCE_APPROVED', 'EVIDENCE_REJECTED', 'VIOLATION_RESOLVED');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxBranches" INTEGER,
    "maxUsers" INTEGER,
    "maxActiveProcessTemplates" INTEGER,
    "maxComplianceRules" INTEGER,
    "auditLogRetentionDays" INTEGER NOT NULL,
    "allowsIntegrations" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'Monthly',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'Active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "platform_admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_support_accesses" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "actionLog" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "platform_support_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "size" TEXT,
    "industry" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleTitle" TEXT,
    "passwordHash" TEXT NOT NULL,
    "managerUserId" TEXT,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "origin" "RoleTemplateOrigin" NOT NULL DEFAULT 'platform_predefined',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_template_permissions" (
    "roleTemplateId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_template_permissions_pkey" PRIMARY KEY ("roleTemplateId","permissionId")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roleTemplateId" TEXT,
    "name" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'Member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'Planning',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "processInstanceStepId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'Draft',
    "priority" "TaskPriority" NOT NULL DEFAULT 'Medium',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedHours" DECIMAL(65,30),
    "actualHours" DECIMAL(65,30) DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtasks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'Draft',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_template_steps" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "templateId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "stepType" "StepType" NOT NULL,
    "onRejectGotoStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_template_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_instances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "projectId" TEXT,
    "currentStepId" TEXT,
    "status" "ProcessInstanceStatus" NOT NULL DEFAULT 'Draft',
    "initiatedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "process_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_instance_steps" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "processInstanceId" TEXT NOT NULL,
    "templateStepId" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'Pending',
    "assignedToId" TEXT,
    "actionedById" TEXT,
    "actionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_instance_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceTemplateId" TEXT,
    "criteria" JSONB,
    "actionOnFail" TEXT NOT NULL DEFAULT 'BLOCK_TRANSITION',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_bindings" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "scopeType" "ScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "compliance_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_violations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "ViolationStatus" NOT NULL DEFAULT 'Open',
    "severity" "Severity" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedById" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionRemarks" TEXT,
    "dueDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taskId" TEXT,
    "projectId" TEXT,
    "reportedById" TEXT NOT NULL,
    "targetManagerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "blockerType" TEXT,
    "priority" "Severity" NOT NULL DEFAULT 'High',
    "status" "EscalationStatus" NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_evidence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "violationId" TEXT,
    "title" TEXT NOT NULL,
    "evidenceType" TEXT,
    "fileUrl" TEXT NOT NULL,
    "notes" TEXT,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'Pending',
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'System',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleId" TEXT,
    "violationId" TEXT,
    "evidenceId" TEXT,
    "action" "AuditAction" NOT NULL,
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValue" JSONB,
    "newValue" JSONB,

    CONSTRAINT "ComplianceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "roleId" TEXT,
    "teamId" TEXT,
    "branchId" TEXT,
    "action" "AuditAction" NOT NULL,
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,

    CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessAuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "templateId" TEXT,
    "action" "AuditAction" NOT NULL,
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValue" JSONB,
    "newValue" JSONB,

    CONSTRAINT "ProcessAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_companyId_idx" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_users_email_key" ON "platform_admin_users"("email");

-- CreateIndex
CREATE INDEX "platform_support_accesses_adminUserId_idx" ON "platform_support_accesses"("adminUserId");

-- CreateIndex
CREATE INDEX "platform_support_accesses_companyId_idx" ON "platform_support_accesses"("companyId");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "users_companyId_email_key" ON "users"("companyId", "email");

-- CreateIndex
CREATE INDEX "roles_companyId_idx" ON "roles"("companyId");

-- CreateIndex
CREATE INDEX "role_assignments_userId_idx" ON "role_assignments"("userId");

-- CreateIndex
CREATE INDEX "role_assignments_roleId_idx" ON "role_assignments"("roleId");

-- CreateIndex
CREATE INDEX "role_assignments_scopeType_scopeId_idx" ON "role_assignments"("scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "branches_companyId_idx" ON "branches"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "branches_companyId_name_key" ON "branches"("companyId", "name");

-- CreateIndex
CREATE INDEX "teams_branchId_idx" ON "teams"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_branchId_name_key" ON "teams"("branchId", "name");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE INDEX "projects_teamId_idx" ON "projects"("teamId");

-- CreateIndex
CREATE INDEX "tasks_companyId_idx" ON "tasks"("companyId");

-- CreateIndex
CREATE INDEX "tasks_projectId_idx" ON "tasks"("projectId");

-- CreateIndex
CREATE INDEX "tasks_assignedToId_idx" ON "tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "subtasks_taskId_idx" ON "subtasks"("taskId");

-- CreateIndex
CREATE INDEX "process_templates_companyId_idx" ON "process_templates"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "process_templates_companyId_name_version_key" ON "process_templates"("companyId", "name", "version");

-- CreateIndex
CREATE INDEX "process_template_steps_templateId_idx" ON "process_template_steps"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "process_template_steps_templateId_stepOrder_key" ON "process_template_steps"("templateId", "stepOrder");

-- CreateIndex
CREATE INDEX "process_instances_companyId_idx" ON "process_instances"("companyId");

-- CreateIndex
CREATE INDEX "process_instances_templateId_idx" ON "process_instances"("templateId");

-- CreateIndex
CREATE INDEX "process_instances_projectId_idx" ON "process_instances"("projectId");

-- CreateIndex
CREATE INDEX "process_instance_steps_processInstanceId_idx" ON "process_instance_steps"("processInstanceId");

-- CreateIndex
CREATE INDEX "process_instance_steps_templateStepId_idx" ON "process_instance_steps"("templateStepId");

-- CreateIndex
CREATE INDEX "compliance_categories_companyId_idx" ON "compliance_categories"("companyId");

-- CreateIndex
CREATE INDEX "compliance_rules_companyId_idx" ON "compliance_rules"("companyId");

-- CreateIndex
CREATE INDEX "compliance_rules_categoryId_idx" ON "compliance_rules"("categoryId");

-- CreateIndex
CREATE INDEX "compliance_bindings_scopeType_scopeId_idx" ON "compliance_bindings"("scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_bindings_ruleId_scopeType_scopeId_key" ON "compliance_bindings"("ruleId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "compliance_violations_companyId_idx" ON "compliance_violations"("companyId");

-- CreateIndex
CREATE INDEX "compliance_violations_entityType_entityId_idx" ON "compliance_violations"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "compliance_violations_ruleId_idx" ON "compliance_violations"("ruleId");

-- CreateIndex
CREATE INDEX "escalations_companyId_idx" ON "escalations"("companyId");

-- CreateIndex
CREATE INDEX "escalations_taskId_idx" ON "escalations"("taskId");

-- CreateIndex
CREATE INDEX "compliance_evidence_companyId_idx" ON "compliance_evidence"("companyId");

-- CreateIndex
CREATE INDEX "compliance_evidence_taskId_idx" ON "compliance_evidence"("taskId");

-- CreateIndex
CREATE INDEX "compliance_evidence_violationId_idx" ON "compliance_evidence"("violationId");

-- CreateIndex
CREATE INDEX "file_objects_companyId_idx" ON "file_objects"("companyId");

-- CreateIndex
CREATE INDEX "file_objects_resourceType_resourceId_idx" ON "file_objects"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_companyId_idx" ON "ComplianceAuditLog"("companyId");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_ruleId_idx" ON "ComplianceAuditLog"("ruleId");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_violationId_idx" ON "ComplianceAuditLog"("violationId");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_evidenceId_idx" ON "ComplianceAuditLog"("evidenceId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_companyId_idx" ON "SystemAuditLog"("companyId");

-- CreateIndex
CREATE INDEX "SystemAuditLog_targetUserId_idx" ON "SystemAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "ProcessAuditLog_companyId_idx" ON "ProcessAuditLog"("companyId");

-- CreateIndex
CREATE INDEX "ProcessAuditLog_projectId_idx" ON "ProcessAuditLog"("projectId");

-- CreateIndex
CREATE INDEX "ProcessAuditLog_taskId_idx" ON "ProcessAuditLog"("taskId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_support_accesses" ADD CONSTRAINT "platform_support_accesses_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "platform_admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_support_accesses" ADD CONSTRAINT "platform_support_accesses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_template_permissions" ADD CONSTRAINT "role_template_permissions_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "role_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_template_permissions" ADD CONSTRAINT "role_template_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "role_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_templates" ADD CONSTRAINT "process_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_template_steps" ADD CONSTRAINT "process_template_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "process_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_template_steps" ADD CONSTRAINT "process_template_steps_onRejectGotoStepId_fkey" FOREIGN KEY ("onRejectGotoStepId") REFERENCES "process_template_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instances" ADD CONSTRAINT "process_instances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instances" ADD CONSTRAINT "process_instances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "process_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instances" ADD CONSTRAINT "process_instances_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance_steps" ADD CONSTRAINT "process_instance_steps_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance_steps" ADD CONSTRAINT "process_instance_steps_templateStepId_fkey" FOREIGN KEY ("templateStepId") REFERENCES "process_template_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance_steps" ADD CONSTRAINT "process_instance_steps_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance_steps" ADD CONSTRAINT "process_instance_steps_actionedById_fkey" FOREIGN KEY ("actionedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_categories" ADD CONSTRAINT "compliance_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_categories" ADD CONSTRAINT "compliance_categories_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "compliance_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_rules" ADD CONSTRAINT "compliance_rules_sourceTemplateId_fkey" FOREIGN KEY ("sourceTemplateId") REFERENCES "compliance_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_bindings" ADD CONSTRAINT "compliance_bindings_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "compliance_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_violations" ADD CONSTRAINT "compliance_violations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_violations" ADD CONSTRAINT "compliance_violations_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "compliance_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_violations" ADD CONSTRAINT "compliance_violations_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_violations" ADD CONSTRAINT "compliance_violations_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_targetManagerId_fkey" FOREIGN KEY ("targetManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "compliance_violations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAuditLog" ADD CONSTRAINT "ComplianceAuditLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "compliance_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAuditLog" ADD CONSTRAINT "ComplianceAuditLog_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "compliance_violations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAuditLog" ADD CONSTRAINT "ComplianceAuditLog_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "compliance_evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAuditLog" ADD CONSTRAINT "ComplianceAuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAuditLog" ADD CONSTRAINT "SystemAuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAuditLog" ADD CONSTRAINT "ProcessAuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAuditLog" ADD CONSTRAINT "ProcessAuditLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAuditLog" ADD CONSTRAINT "ProcessAuditLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "process_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessAuditLog" ADD CONSTRAINT "ProcessAuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

