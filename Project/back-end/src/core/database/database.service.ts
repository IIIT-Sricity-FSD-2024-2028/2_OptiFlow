import { Injectable } from '@nestjs/common';

// ─── Enums / String Literals ──────────────────────────────────────────────
export type ProjectStatus = 'Planning' | 'Active' | 'On_Hold' | 'Completed' | 'Cancelled';
export type StepType = 'Approval' | 'Input_Required' | 'Automated_Task';
export type InstanceStatus = 'Draft' | 'Active' | 'Completed' | 'Cancelled' | 'Rejected';
export type StepExecutionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Skipped';
export type TaskStatus =
  | 'Pending'
  | 'In_Progress'
  | 'In_Review'
  | 'Pending_TL_Review'
  | 'Blocked'
  | 'Completed'
  | 'Cancelled'
  | 'Pending_PM_Review'
  | 'Pending_Compliance';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type RuleSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type ViolationStatus = 'Open' | 'Under_Review' | 'Resolved' | 'Ignored';
export type SystemEntity =
  | 'User'
  | 'Project'
  | 'Task'
  | 'Subtask'
  | 'Escalation'
  | 'Workflow_Instance'
  | 'Workflow_Step';
export type EscalationStatus = 'Open' | 'Reviewed' | 'Resolved' | 'Closed';
export type EvidenceStatus = 'Pending' | 'Under_Review' | 'Approved' | 'Rejected';

export interface AppNotification {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'Task' | 'Project' | 'Compliance' | 'System';
  is_read: boolean;
  link?: string;
  created_at: string;
}

// ─── Interfaces (24 Tables) ────────────────────────────────────────────────

export interface Permission {
  permission_id: number;
  slug: string;
  module: string;
  description: string | null;
  created_at: string;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  permissions?: Record<string, boolean>;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

export interface Department {
  department_id: number;
  department_name: string;
  manager_id: number | null;
  created_at: string;
}

export interface Team {
  team_id: number;
  team_name: string;
  department_id: number;
  created_at: string;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  department_id: number | null;
  team_id: number | null;
  manager_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UserRole {
  user_id: number;
  role_id: number;
  assigned_by: number | null;
  assigned_at: string;
}

export interface UserPermission {
  user_id: number;
  permission_id: number;
  is_granted: boolean;
  granted_by: number | null;
  granted_at: string;
  expires_at: string | null;
}

export interface Project {
  project_id: number;
  project_name: string;
  description: string | null;
  department_id: number | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  template_id: number;
  template_name: string;
  category: string | null;
  description: string | null;
  is_active: boolean;
  version: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateStep {
  step_id: number;
  template_id: number;
  step_order: number;
  step_name: string;
  step_type: StepType;
  required_permission_id: number | null;
  escalation_timeout_hours: number | null;
  on_reject_goto_step_id: number | null;
}

export interface WorkflowInstance {
  instance_id: number;
  title: string;
  template_id: number | null;
  project_id: number | null;
  initiated_by: number | null;
  current_step_id: number | null;
  status: InstanceStatus;
  started_at: string;
  completed_at: string | null;
}

export interface WorkflowInstanceStep {
  instance_step_id: number;
  instance_id: number;
  step_id: number | null;
  assigned_to: number | null;
  status: StepExecutionStatus;
  remarks: string | null;
  actioned_by: number | null;
  created_at: string;
  actioned_at: string | null;
}

export interface Task {
  task_id: number;
  project_id: number | null;
  workflow_instance_id: number | null;
  title: string;
  description: string | null;
  created_by: number | null;
  assigned_to: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number | null;
  actual_hours: number;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Subtask {
  subtask_id: number;
  task_id: number;
  title: string;
  description: string | null;
  created_by: number | null;
  assigned_to: number | null;
  status: TaskStatus;
  estimated_hours: number | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  attachment_id: number;
  task_id: number;
  subtask_id: number | null;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  file_url: string;
  uploaded_by: number | null;
  uploaded_at: string;
}

export interface TaskComment {
  comment_id: number;
  task_id: number;
  subtask_id: number | null;
  user_id: number | null;
  comment_text: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ComplianceCategory {
  category_id: number;
  name: string;
  description: string | null;
  manager_id: number | null;
}

export interface ComplianceRule {
  rule_id: number;
  category_id: number | null;
  rule_name: string;
  description: string | null;
  remediation_steps: string | null;
  severity: RuleSeverity;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplianceViolation {
  violation_id: number;
  rule_id: number | null;
  entity_id: number;
  entity_type: SystemEntity;
  status: ViolationStatus;
  detected_at: string;
  reported_by: number | null;
  resolved_by: number | null;
  resolved_at: string | null;
  resolution_remarks: string | null;
  due_date: string | null;
}

export interface ViolationComment {
  comment_id: number;
  violation_id: number;
  user_id: number | null;
  comment_text: string;
  attachment_url: string | null;
  created_at: string;
}

export interface AuditLog {
  log_id: number;
  entity_id: number;
  entity_type: SystemEntity;
  action: string;
  performed_by: number | null;
  performed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  used_permission_slug: string | null;
  old_value: any | null;
  new_value: any | null;
}

export interface Escalation {
  escalation_id: number;
  task_id: number | null;
  project_id: number | null;
  reported_by: number | null;
  target_manager_id: number | null;
  title: string;
  description: string | null;
  blocker_type: string | null;
  priority: RuleSeverity;
  status: EscalationStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface ComplianceEvidence {
  evidence_id: number;
  user_id: number | null;
  task_id: number | null;
  violation_id: number | null;
  title: string;
  evidence_type: string | null;
  file_url: string;
  notes: string | null;
  status: EvidenceStatus;
  reviewed_by: number | null;
  submitted_at: string;
  reviewed_at: string | null;
}


// ─── DatabaseService ───────────────────────────────────────────────────────────

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  "Team Member": {
    view_assigned_tasks: true,  assign_subtasks: false,
    review_member_submissions: false, create_subtasks: false,
    create_top_level_tasks: false, delete_tasks: false,
    escalate_to_pm: true, resolve_escalations: false,
    view_assigned_projects: true, view_process_stages: false,
    create_projects: false, edit_processes: false,
    submit_evidence: true, view_compliance_status: true,
    approve_evidence: false, manage_compliance_rules: false,
    change_own_password: true, manage_team_members: false,
  },
  "Team Leader": {
    view_assigned_tasks: true,  assign_subtasks: true,
    review_member_submissions: true, create_subtasks: true,
    create_top_level_tasks: false, delete_tasks: false,
    escalate_to_pm: true, resolve_escalations: false,
    view_assigned_projects: true, view_process_stages: true,
    create_projects: false, edit_processes: false,
    submit_evidence: true, view_compliance_status: true,
    approve_evidence: false, manage_compliance_rules: false,
    change_own_password: false, manage_team_members: false,
  },
  "Project Manager": {
    view_assigned_tasks: true,  assign_subtasks: true,
    review_member_submissions: true, create_subtasks: true,
    create_top_level_tasks: true, delete_tasks: true,
    escalate_to_pm: false, resolve_escalations: true,
    view_assigned_projects: true, view_process_stages: true,
    create_projects: true, edit_processes: true,
    submit_evidence: true, view_compliance_status: true,
    approve_evidence: false, manage_compliance_rules: false,
    change_own_password: true, manage_team_members: true,
  },
  "Process Admin": {
    view_assigned_tasks: true,  assign_subtasks: false,
    review_member_submissions: false, create_subtasks: false,
    create_top_level_tasks: false, delete_tasks: false,
    escalate_to_pm: true, resolve_escalations: false,
    view_assigned_projects: true, view_process_stages: true,
    create_projects: true, edit_processes: true,
    submit_evidence: false, view_compliance_status: true,
    approve_evidence: false, manage_compliance_rules: false,
    change_own_password: true, manage_team_members: false,
  },
  "Compliance Officer": {
    view_assigned_tasks: false, assign_subtasks: false,
    review_member_submissions: false, create_subtasks: false,
    create_top_level_tasks: false, delete_tasks: false,
    escalate_to_pm: true, resolve_escalations: false,
    view_assigned_projects: false, view_process_stages: false,
    create_projects: false, edit_processes: false,
    submit_evidence: true, view_compliance_status: true,
    approve_evidence: true, manage_compliance_rules: true,
    change_own_password: true, manage_team_members: false,
  },
  "HR Manager": {
    view_assigned_tasks: false, assign_subtasks: false,
    review_member_submissions: false, create_subtasks: false,
    create_top_level_tasks: false, delete_tasks: false,
    escalate_to_pm: false, resolve_escalations: false,
    view_assigned_projects: false, view_process_stages: false,
    create_projects: false, edit_processes: false,
    submit_evidence: false, view_compliance_status: false,
    approve_evidence: false, manage_compliance_rules: false,
    change_own_password: true, manage_team_members: true,
  },
  "HR Ops": {
    view_assigned_tasks: false, assign_subtasks: false,
    review_member_submissions: false, create_subtasks: false,
    create_top_level_tasks: false, delete_tasks: false,
    escalate_to_pm: false, resolve_escalations: false,
    view_assigned_projects: false, view_process_stages: false,
    create_projects: false, edit_processes: false,
    submit_evidence: false, view_compliance_status: false,
    approve_evidence: false, manage_compliance_rules: false,
    change_own_password: true, manage_team_members: false,
  },
};

@Injectable()
export class DatabaseService {

  public user_overrides: Record<number, Record<string, boolean>> = {};


  // 1. Permissions
  public permissions: Permission[] = [
    { permission_id: 1, slug: 'workflow:approve', module: 'Workflows', description: 'Approve workflow steps', created_at: '2024-01-01T00:00:00Z' },
    { permission_id: 2, slug: 'compliance:resolve', module: 'Compliance', description: 'Resolve compliance violations', created_at: '2024-01-01T00:00:00Z' },
    { permission_id: 3, slug: 'task:create', module: 'Tasks', description: 'Create new tasks', created_at: '2024-01-01T00:00:00Z' },
    { permission_id: 4, slug: 'project:manage', module: 'Projects', description: 'Manage projects', created_at: '2024-01-01T00:00:00Z' },
    { permission_id: 5, slug: 'hr:manage_users', module: 'HR', description: 'Manage employee records', created_at: '2024-01-01T00:00:00Z' },
    { permission_id: 6, slug: 'evidence:review', module: 'Compliance', description: 'Review submitted evidence', created_at: '2024-01-01T00:00:00Z' },
    { permission_id: 7, slug: 'workflow:create', module: 'Workflows', description: 'Create workflow templates', created_at: '2024-01-01T00:00:00Z' },
  ];

  // 2. Roles
  public roles: Role[] = [
    { role_id: 1, role_name: 'superuser', description: 'Full system access', is_system: true, created_at: '2024-01-01T00:00:00Z', permissions: { ...DEFAULT_ROLE_PERMISSIONS["Process Admin"] } },
    { role_id: 2, role_name: 'project_manager', description: 'Manages projects', is_system: true, created_at: '2024-01-01T00:00:00Z', permissions: { ...DEFAULT_ROLE_PERMISSIONS["Project Manager"] } },
    { role_id: 3, role_name: 'compliance_officer', description: 'Manages compliance and evidence', is_system: true, created_at: '2024-01-01T00:00:00Z', permissions: { ...DEFAULT_ROLE_PERMISSIONS["Compliance Officer"] } },
    { role_id: 4, role_name: 'hr_manager', description: 'Manages HR and onboarding', is_system: true, created_at: '2024-01-01T00:00:00Z', permissions: { ...DEFAULT_ROLE_PERMISSIONS["HR Manager"] } },
    { role_id: 5, role_name: 'team_leader', description: 'Leads a team, assigns tasks', is_system: false, created_at: '2024-01-01T00:00:00Z', permissions: { ...DEFAULT_ROLE_PERMISSIONS["Team Leader"] } },
    { role_id: 6, role_name: 'team_member', description: 'Executes tasks', is_system: false, created_at: '2024-01-01T00:00:00Z', permissions: { ...DEFAULT_ROLE_PERMISSIONS["Team Member"] } },
    { role_id: 7, role_name: 'hr_ops', description: 'HR Operations', is_system: true, created_at: '2024-01-01T00:00:00Z', permissions: { ...DEFAULT_ROLE_PERMISSIONS["HR Ops"] } }
  ];

  // 3. Role_Permissions
  public role_permissions: RolePermission[] = [
    { role_id: 1, permission_id: 1 }, { role_id: 1, permission_id: 2 }, { role_id: 1, permission_id: 3 }, { role_id: 1, permission_id: 4 }, { role_id: 1, permission_id: 5 }, { role_id: 1, permission_id: 6 }, { role_id: 1, permission_id: 7 },
    { role_id: 2, permission_id: 3 }, { role_id: 2, permission_id: 4 },
    { role_id: 3, permission_id: 2 }, { role_id: 3, permission_id: 6 },
    { role_id: 4, permission_id: 5 }, { role_id: 4, permission_id: 7 },
    { role_id: 5, permission_id: 3 }
  ];

  // 4. Departments
  public departments: Department[] = [
    { department_id: 1, department_name: 'Operations', manager_id: 1, created_at: '2024-01-01T09:00:00Z' },
    { department_id: 2, department_name: 'IT Security', manager_id: 3, created_at: '2024-01-05T09:00:00Z' },
    { department_id: 3, department_name: 'Finance', manager_id: 6, created_at: '2024-01-10T09:00:00Z' },
    { department_id: 4, department_name: 'Human Resources', manager_id: 7, created_at: '2024-01-12T09:00:00Z' },
    { department_id: 5, department_name: 'Engineering', manager_id: 10, created_at: '2024-01-15T09:00:00Z' }
  ];

  // 4.5 Teams
  public teams: Team[] = [
    { team_id: 1, team_name: 'Ops-Admin', department_id: 1, created_at: '2024-01-01T09:00:00Z' },
    { team_id: 2, team_name: 'PMO', department_id: 1, created_at: '2024-01-01T09:00:00Z' },
    { team_id: 3, team_name: 'IT-Security', department_id: 2, created_at: '2024-01-05T09:00:00Z' },
    { team_id: 4, team_name: 'Finance-Audit', department_id: 3, created_at: '2024-01-10T09:00:00Z' },
    { team_id: 5, team_name: 'HR-Talent', department_id: 4, created_at: '2024-01-12T09:00:00Z' },
    { team_id: 6, team_name: 'HR-Ops', department_id: 4, created_at: '2024-01-12T09:00:00Z' },
    { team_id: 7, team_name: 'Compliance-Core', department_id: 5, created_at: '2024-01-15T09:00:00Z' }
  ];

  // 5. Users
  public users: User[] = [
    { user_id: 1, full_name: 'Arjun Mehta', email: 'arjun@officesync.in', phone: '+91 9876543210', password_hash: 'hashed_pw', department_id: 1, team_id: 1, manager_id: null, is_active: true, created_at: '2024-01-15T08:00:00Z', updated_at: '2024-01-15T08:00:00Z', deleted_at: null },
    { user_id: 2, full_name: 'Priya Sharma', email: 'priya@officesync.in', phone: '+91 9876543211', password_hash: 'hashed_pw', department_id: 1, team_id: 2, manager_id: 1, is_active: true, created_at: '2024-01-16T08:00:00Z', updated_at: '2024-01-16T08:00:00Z', deleted_at: null },
    { user_id: 3, full_name: 'Rohan Nair', email: 'rohan@officesync.in', phone: '+91 9876543212', password_hash: 'hashed_pw', department_id: 2, team_id: 3, manager_id: 1, is_active: true, created_at: '2024-01-17T08:00:00Z', updated_at: '2024-01-17T08:00:00Z', deleted_at: null },
    { user_id: 4, full_name: 'Sneha Kapoor', email: 'sneha@officesync.in', phone: '+91 9876543213', password_hash: 'hashed_pw', department_id: 1, team_id: 2, manager_id: 2, is_active: true, created_at: '2024-01-18T08:00:00Z', updated_at: '2024-01-18T08:00:00Z', deleted_at: null },
    { user_id: 5, full_name: 'Vikram Desai', email: 'vikram@officesync.in', phone: '+91 9876543214', password_hash: 'hashed_pw', department_id: 1, team_id: 2, manager_id: 4, is_active: true, created_at: '2024-01-19T08:00:00Z', updated_at: '2024-01-19T08:00:00Z', deleted_at: null },
    { user_id: 6, full_name: 'Anjali Rao', email: 'anjali@officesync.in', phone: '+91 9876543215', password_hash: 'hashed_pw', department_id: 3, team_id: 4, manager_id: 1, is_active: true, created_at: '2024-01-20T08:00:00Z', updated_at: '2024-01-20T08:00:00Z', deleted_at: null },
    { user_id: 7, full_name: 'Kiran Patel', email: 'kiran@officesync.in', phone: '+91 9876543216', password_hash: 'hashed_pw', department_id: 4, team_id: 5, manager_id: 1, is_active: true, created_at: '2024-01-21T08:00:00Z', updated_at: '2024-01-21T08:00:00Z', deleted_at: null },
    { user_id: 8, full_name: 'Divya Menon', email: 'divya@officesync.in', phone: '+91 9876543217', password_hash: 'hashed_pw', department_id: 2, team_id: 3, manager_id: 3, is_active: true, created_at: '2024-01-22T08:00:00Z', updated_at: '2024-01-22T08:00:00Z', deleted_at: null },
    { user_id: 9, full_name: 'Rahul Iyer', email: 'rahul@officesync.in', phone: '+91 9876543218', password_hash: 'hashed_pw', department_id: 2, team_id: 3, manager_id: 8, is_active: true, created_at: '2024-01-23T08:00:00Z', updated_at: '2024-01-23T08:00:00Z', deleted_at: null },
    { user_id: 10, full_name: 'Meera Krishnan', email: 'meera@officesync.in', phone: '+91 9876543219', password_hash: 'hashed_pw', department_id: 5, team_id: 7, manager_id: 1, is_active: true, created_at: '2024-02-01T08:00:00Z', updated_at: '2024-02-01T08:00:00Z', deleted_at: null }
  ];

  // 6. User_Roles
  public user_roles: UserRole[] = [
    { user_id: 1, role_id: 1, assigned_by: 1, assigned_at: '2024-01-15T08:00:00Z' },
    { user_id: 2, role_id: 2, assigned_by: 1, assigned_at: '2024-01-16T08:00:00Z' },
    { user_id: 3, role_id: 3, assigned_by: 1, assigned_at: '2024-01-17T08:00:00Z' },
    { user_id: 4, role_id: 5, assigned_by: 2, assigned_at: '2024-01-18T08:00:00Z' }, // Team Leader
    { user_id: 5, role_id: 6, assigned_by: 4, assigned_at: '2024-01-19T08:00:00Z' }, // Team Member
    { user_id: 6, role_id: 2, assigned_by: 1, assigned_at: '2024-01-20T08:00:00Z' },
    { user_id: 7, role_id: 4, assigned_by: 1, assigned_at: '2024-01-21T08:00:00Z' }, // HR Manager
    { user_id: 8, role_id: 5, assigned_by: 3, assigned_at: '2024-01-22T08:00:00Z' }, // Team Leader
    { user_id: 9, role_id: 6, assigned_by: 8, assigned_at: '2024-01-23T08:00:00Z' }, // Team Member
    { user_id: 10, role_id: 2, assigned_by: 1, assigned_at: '2024-02-01T08:00:00Z' } // Engineering PM
  ];

  // 7. User_Permissions
  public user_permissions: UserPermission[] = [
    { user_id: 2, permission_id: 1, is_granted: true, granted_by: 1, granted_at: '2024-01-16T08:00:00Z', expires_at: null },
    { user_id: 5, permission_id: 3, is_granted: true, granted_by: 4, granted_at: '2024-02-01T10:00:00Z', expires_at: '2024-12-31T23:59:59Z' } // Temp task creation
  ];

  // 8. Projects
  public projects: Project[] = [
    { project_id: 1, project_name: 'Q4 Financial Audit', description: 'End-of-year review.', department_id: 3, status: 'Active', start_date: '2024-10-01', end_date: '2024-12-31', created_by: 6, created_at: '2024-09-25T10:00:00Z', updated_at: '2024-09-25T10:00:00Z' },
    { project_id: 2, project_name: 'IT Infrastructure Hardening', description: 'Security patches.', department_id: 2, status: 'Active', start_date: '2024-09-01', end_date: '2025-03-31', created_by: 2, created_at: '2024-08-20T10:00:00Z', updated_at: '2024-08-20T10:00:00Z' },
    { project_id: 3, project_name: 'Employee Onboarding Revamp', description: 'Redesign onboarding flow.', department_id: 4, status: 'Planning', start_date: '2025-01-15', end_date: '2025-06-30', created_by: 7, created_at: '2024-12-01T10:00:00Z', updated_at: '2024-12-01T10:00:00Z' },
    { project_id: 4, project_name: 'Operations Efficiency Drive', description: 'Identify bottlenecks.', department_id: 1, status: 'On_Hold', start_date: '2024-07-01', end_date: '2024-12-31', created_by: 2, created_at: '2024-06-15T10:00:00Z', updated_at: '2024-06-15T10:00:00Z' },
    { project_id: 5, project_name: 'ISO 27001 Certification', description: 'Achieve security cert.', department_id: 2, status: 'Completed', start_date: '2024-01-01', end_date: '2024-10-31', created_by: 3, created_at: '2023-12-20T10:00:00Z', updated_at: '2024-10-31T15:00:00Z' },
    { project_id: 6, project_name: 'Backend Microservices Migration', description: 'Split monolith to microservices.', department_id: 5, status: 'Active', start_date: '2024-11-01', end_date: '2025-08-31', created_by: 10, created_at: '2024-10-10T10:00:00Z', updated_at: '2024-10-10T10:00:00Z' }
  ];

  // 9. Workflow_Templates
  public workflow_templates: WorkflowTemplate[] = [
    { template_id: 1, template_name: 'Finance Q4 Reporting', category: 'Finance', description: 'End-of-year financial reconciliation and audit.', is_active: true, version: 3, created_by: 1, created_at: '2024-10-01T00:00:00Z', updated_at: '2024-12-10T00:00:00Z' },
    { template_id: 2, template_name: 'Employee Onboarding', category: 'HR', description: 'Standard onboarding flow for new hires.', is_active: true, version: 3, created_by: 7, created_at: '2024-10-01T00:00:00Z', updated_at: '2024-12-05T00:00:00Z' },
    { template_id: 3, template_name: 'IT Security Audit Protocol', category: 'IT', description: 'Protocol for scanning and assessing IT infrastructure security.', is_active: true, version: 3, created_by: 3, created_at: '2024-10-01T00:00:00Z', updated_at: '2024-11-20T00:00:00Z' },
    { template_id: 4, template_name: 'GDPR Client Verification', category: 'Operations', description: 'Verification steps to ensure GDPR compliance for client data.', is_active: true, version: 3, created_by: 10, created_at: '2024-10-01T00:00:00Z', updated_at: '2025-01-08T00:00:00Z' },
    { template_id: 5, template_name: 'Vendor Invoice Verification', category: 'Finance', description: 'Matching and approving vendor invoices.', is_active: true, version: 3, created_by: 6, created_at: '2024-10-01T00:00:00Z', updated_at: '2025-01-15T00:00:00Z' }
  ];

  // 10. Workflow_Template_Steps
  public workflow_template_steps: WorkflowTemplateStep[] = [
    // Finance Q4 Reporting
    { step_id: 1, template_id: 1, step_order: 1, step_name: 'Data Collection', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 48, on_reject_goto_step_id: null },
    { step_id: 2, template_id: 1, step_order: 2, step_name: 'Draft', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 48, on_reject_goto_step_id: null },
    { step_id: 3, template_id: 1, step_order: 3, step_name: 'Review', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 48, on_reject_goto_step_id: 2 },
    { step_id: 4, template_id: 1, step_order: 4, step_name: 'Audit', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 48, on_reject_goto_step_id: 3 },

    // Employee Onboarding
    { step_id: 5, template_id: 2, step_order: 1, step_name: 'Documents', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 24, on_reject_goto_step_id: null },
    { step_id: 6, template_id: 2, step_order: 2, step_name: 'HR Verify', step_type: 'Approval', required_permission_id: 5, escalation_timeout_hours: 24, on_reject_goto_step_id: 5 },
    { step_id: 7, template_id: 2, step_order: 3, step_name: 'IT Setup', step_type: 'Automated_Task', required_permission_id: null, escalation_timeout_hours: 24, on_reject_goto_step_id: null },
    { step_id: 8, template_id: 2, step_order: 4, step_name: 'Account Setup', step_type: 'Automated_Task', required_permission_id: null, escalation_timeout_hours: 24, on_reject_goto_step_id: null },
    { step_id: 9, template_id: 2, step_order: 5, step_name: 'Orientation', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 24, on_reject_goto_step_id: null },

    // IT Security Audit Protocol
    { step_id: 10, template_id: 3, step_order: 1, step_name: 'Scan', step_type: 'Automated_Task', required_permission_id: null, escalation_timeout_hours: 12, on_reject_goto_step_id: null },
    { step_id: 11, template_id: 3, step_order: 2, step_name: 'Assess', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 24, on_reject_goto_step_id: 10 },
    { step_id: 12, template_id: 3, step_order: 3, step_name: 'Report', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 24, on_reject_goto_step_id: null },
    { step_id: 13, template_id: 3, step_order: 4, step_name: 'Remediation', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 72, on_reject_goto_step_id: null },
    { step_id: 14, template_id: 3, step_order: 5, step_name: 'Verify', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 24, on_reject_goto_step_id: 13 },
    { step_id: 15, template_id: 3, step_order: 6, step_name: 'Sign-off', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 24, on_reject_goto_step_id: null },

    // GDPR Client Verification
    { step_id: 16, template_id: 4, step_order: 1, step_name: 'Data Request', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 48, on_reject_goto_step_id: null },
    { step_id: 17, template_id: 4, step_order: 2, step_name: 'Identity Check', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 48, on_reject_goto_step_id: 16 },
    { step_id: 18, template_id: 4, step_order: 3, step_name: 'Consent Review', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 48, on_reject_goto_step_id: 17 },
    { step_id: 19, template_id: 4, step_order: 4, step_name: 'Compliance Sign-off', step_type: 'Approval', required_permission_id: 6, escalation_timeout_hours: 48, on_reject_goto_step_id: 18 },

    // Vendor Invoice Verification
    { step_id: 20, template_id: 5, step_order: 1, step_name: 'Invoice Receipt', step_type: 'Input_Required', required_permission_id: null, escalation_timeout_hours: 24, on_reject_goto_step_id: null },
    { step_id: 21, template_id: 5, step_order: 2, step_name: 'PO Matching', step_type: 'Automated_Task', required_permission_id: null, escalation_timeout_hours: 24, on_reject_goto_step_id: null },
    { step_id: 22, template_id: 5, step_order: 3, step_name: 'Finance Approval', step_type: 'Approval', required_permission_id: 1, escalation_timeout_hours: 24, on_reject_goto_step_id: 20 }
  ];

  // 11. Workflow_Instances
  public workflow_instances: WorkflowInstance[] = [
    { instance_id: 1, title: 'Annual Leave - Vikram Desai', template_id: 1, project_id: null, initiated_by: 5, current_step_id: 1, status: 'Active', started_at: '2024-11-01T09:00:00Z', completed_at: null },
    { instance_id: 2, title: 'Hardware Request - Rahul Iyer', template_id: 2, project_id: 2, initiated_by: 9, current_step_id: 3, status: 'Active', started_at: '2024-11-15T10:00:00Z', completed_at: null },
    { instance_id: 3, title: 'Budget Approval - Q4 Audit', template_id: 3, project_id: 1, initiated_by: 6, current_step_id: null, status: 'Completed', started_at: '2024-10-05T09:00:00Z', completed_at: '2024-10-07T14:00:00Z' },
    { instance_id: 4, title: 'Annual Leave - Sneha Kapoor', template_id: 1, project_id: null, initiated_by: 4, current_step_id: 1, status: 'Rejected', started_at: '2024-09-01T09:00:00Z', completed_at: '2024-09-02T09:00:00Z' }
  ];

  // 12. Workflow_Instance_Steps
  public workflow_instance_steps: WorkflowInstanceStep[] = [
    { instance_step_id: 1, instance_id: 1, step_id: 1, assigned_to: 4, status: 'Pending', remarks: null, actioned_by: null, created_at: '2024-11-01T09:00:00Z', actioned_at: null },
    { instance_step_id: 2, instance_id: 2, step_id: 3, assigned_to: 3, status: 'Pending', remarks: 'Awaiting IT Sec validation of laptop specs.', actioned_by: null, created_at: '2024-11-15T10:00:00Z', actioned_at: null },
    { instance_step_id: 3, instance_id: 3, step_id: 4, assigned_to: 6, status: 'Approved', remarks: 'Budget looks good, approved.', actioned_by: 6, created_at: '2024-10-05T09:00:00Z', actioned_at: '2024-10-07T14:00:00Z' },
    { instance_step_id: 4, instance_id: 4, step_id: 1, assigned_to: 2, status: 'Rejected', remarks: 'We need all hands on deck this month.', actioned_by: 2, created_at: '2024-09-01T09:00:00Z', actioned_at: '2024-09-02T09:00:00Z' }
  ];

  // 13. Tasks
  public tasks: Task[] = [
    // ── Project 1: Q4 Financial Audit (Active) — target ~50% progress ──
    { task_id: 101, project_id: 1, workflow_instance_id: null, title: 'Reconcile vendor invoices', description: 'Cross-check invoices against POs.', created_by: 4, assigned_to: 5, status: 'Completed', priority: 'High', estimated_hours: 8, actual_hours: 8, start_date: '2024-10-05', due_date: '2024-11-15', completed_at: '2024-11-14T17:00:00Z', created_at: '2024-10-05T09:00:00Z', updated_at: '2024-11-14T17:00:00Z', deleted_at: null },
    { task_id: 102, project_id: 1, workflow_instance_id: 3, title: 'Review SOX Controls', description: 'Validate controls (budget approved).', created_by: 6, assigned_to: 4, status: 'Completed', priority: 'Critical', estimated_hours: 16, actual_hours: 16, start_date: '2024-11-01', due_date: '2024-11-15', completed_at: '2024-11-15T12:00:00Z', created_at: '2024-10-06T09:00:00Z', updated_at: '2024-11-15T12:00:00Z', deleted_at: null },
    { task_id: 108, project_id: 1, workflow_instance_id: null, title: 'Review expense reports', description: 'Ensure valid receipts for Q4.', created_by: 4, assigned_to: 5, status: 'Completed', priority: 'Medium', estimated_hours: 5, actual_hours: 5, start_date: '2024-10-10', due_date: '2024-10-15', completed_at: '2024-10-14T16:00:00Z', created_at: '2024-10-05T09:00:00Z', updated_at: '2024-10-14T16:00:00Z', deleted_at: null },
    { task_id: 109, project_id: 1, workflow_instance_id: null, title: 'Prepare audit summary report', description: 'Compile final audit findings.', created_by: 6, assigned_to: 6, status: 'In_Progress', priority: 'High', estimated_hours: 10, actual_hours: 4, start_date: '2024-11-16', due_date: '2024-12-10', completed_at: null, created_at: '2024-11-01T09:00:00Z', updated_at: '2024-11-20T09:00:00Z', deleted_at: null },
    { task_id: 110, project_id: 1, workflow_instance_id: null, title: 'CFO sign-off presentation', description: 'Final CFO review deck.', created_by: 6, assigned_to: 6, status: 'Pending', priority: 'Critical', estimated_hours: 6, actual_hours: 0, start_date: null, due_date: '2024-12-20', completed_at: null, created_at: '2024-11-01T09:00:00Z', updated_at: '2024-11-01T09:00:00Z', deleted_at: null },
    { task_id: 111, project_id: 1, workflow_instance_id: null, title: 'Archive audit documents', description: 'Upload all docs to SharePoint.', created_by: 4, assigned_to: 5, status: 'Pending', priority: 'Low', estimated_hours: 3, actual_hours: 0, start_date: null, due_date: '2024-12-31', completed_at: null, created_at: '2024-11-01T09:00:00Z', updated_at: '2024-11-01T09:00:00Z', deleted_at: null },

    // ── Project 2: IT Infrastructure Hardening (Active) — target ~25% progress ──
    { task_id: 103, project_id: 2, workflow_instance_id: null, title: 'Patch server vulnerabilities', description: 'Apply OS patches.', created_by: 8, assigned_to: 9, status: 'Completed', priority: 'Critical', estimated_hours: 12, actual_hours: 14, start_date: '2024-11-15', due_date: '2024-11-30', completed_at: '2024-11-28T18:00:00Z', created_at: '2024-09-15T09:00:00Z', updated_at: '2024-11-28T18:00:00Z', deleted_at: null },
    { task_id: 104, project_id: 2, workflow_instance_id: null, title: 'Firewall rules audit', description: 'Review stale FW rules.', created_by: 8, assigned_to: 9, status: 'In_Progress', priority: 'High', estimated_hours: 6, actual_hours: 2, start_date: '2024-12-01', due_date: '2024-12-15', completed_at: null, created_at: '2024-09-16T09:00:00Z', updated_at: '2024-12-02T09:00:00Z', deleted_at: null },
    { task_id: 112, project_id: 2, workflow_instance_id: null, title: 'Deploy endpoint detection (EDR)', description: 'Roll out CrowdStrike to all nodes.', created_by: 3, assigned_to: 8, status: 'Pending', priority: 'High', estimated_hours: 8, actual_hours: 0, start_date: null, due_date: '2025-01-15', completed_at: null, created_at: '2024-09-20T09:00:00Z', updated_at: '2024-09-20T09:00:00Z', deleted_at: null },
    { task_id: 113, project_id: 2, workflow_instance_id: null, title: 'MFA rollout for all users', description: 'Enforce MFA on all accounts.', created_by: 3, assigned_to: 9, status: 'Blocked', priority: 'Critical', estimated_hours: 10, actual_hours: 1, start_date: '2024-12-10', due_date: '2025-01-31', completed_at: null, created_at: '2024-09-21T09:00:00Z', updated_at: '2024-12-15T09:00:00Z', deleted_at: null },

    // ── Project 3: Employee Onboarding Revamp (Planning) — target ~0% progress ──
    { task_id: 107, project_id: 3, workflow_instance_id: null, title: 'Draft Onboarding Surveys', description: 'Get feedback from new hires.', created_by: 7, assigned_to: 7, status: 'Pending', priority: 'Low', estimated_hours: 4, actual_hours: 0, start_date: null, due_date: '2025-02-01', completed_at: null, created_at: '2024-12-02T10:00:00Z', updated_at: '2024-12-02T10:00:00Z', deleted_at: null },
    { task_id: 114, project_id: 3, workflow_instance_id: null, title: 'Map current onboarding process', description: 'Document existing steps.', created_by: 7, assigned_to: 7, status: 'In_Progress', priority: 'Medium', estimated_hours: 6, actual_hours: 2, start_date: '2025-01-15', due_date: '2025-02-15', completed_at: null, created_at: '2024-12-05T10:00:00Z', updated_at: '2025-01-15T10:00:00Z', deleted_at: null },

    // ── Project 5: ISO 27001 Certification (Completed) — target 100% ──
    { task_id: 105, project_id: 5, workflow_instance_id: null, title: 'ISO 27001 Gap Analysis', description: 'Identify missing controls.', created_by: 3, assigned_to: 8, status: 'Completed', priority: 'High', estimated_hours: 20, actual_hours: 22, start_date: '2024-01-10', due_date: '2024-02-15', completed_at: '2024-02-14T17:00:00Z', created_at: '2024-01-05T09:00:00Z', updated_at: '2024-02-14T17:00:00Z', deleted_at: null },
    { task_id: 115, project_id: 5, workflow_instance_id: null, title: 'Implement access control policy', description: 'Write and enforce AC policy.', created_by: 3, assigned_to: 8, status: 'Completed', priority: 'High', estimated_hours: 12, actual_hours: 12, start_date: '2024-03-01', due_date: '2024-04-15', completed_at: '2024-04-10T15:00:00Z', created_at: '2024-02-20T09:00:00Z', updated_at: '2024-04-10T15:00:00Z', deleted_at: null },
    { task_id: 116, project_id: 5, workflow_instance_id: null, title: 'Internal audit preparation', description: 'Pre-audit internal checks.', created_by: 3, assigned_to: 3, status: 'Completed', priority: 'Critical', estimated_hours: 16, actual_hours: 18, start_date: '2024-06-01', due_date: '2024-07-31', completed_at: '2024-07-28T16:00:00Z', created_at: '2024-05-15T09:00:00Z', updated_at: '2024-07-28T16:00:00Z', deleted_at: null },
    { task_id: 117, project_id: 5, workflow_instance_id: null, title: 'External auditor review', description: 'Liaise with certification body.', created_by: 3, assigned_to: 3, status: 'Completed', priority: 'Critical', estimated_hours: 20, actual_hours: 20, start_date: '2024-08-01', due_date: '2024-09-30', completed_at: '2024-09-25T17:00:00Z', created_at: '2024-07-30T09:00:00Z', updated_at: '2024-09-25T17:00:00Z', deleted_at: null },
    { task_id: 118, project_id: 5, workflow_instance_id: null, title: 'Certificate receipt & archival', description: 'File ISO cert in document store.', created_by: 3, assigned_to: 8, status: 'Completed', priority: 'Medium', estimated_hours: 2, actual_hours: 1, start_date: '2024-10-25', due_date: '2024-10-31', completed_at: '2024-10-30T14:00:00Z', created_at: '2024-10-20T09:00:00Z', updated_at: '2024-10-30T14:00:00Z', deleted_at: null },

    // ── Project 6: Backend Microservices Migration (Active) — target ~40% ──
    { task_id: 106, project_id: 6, workflow_instance_id: null, title: 'Setup Docker Swarm cluster', description: 'Initialize the new swarm.', created_by: 10, assigned_to: 10, status: 'Completed', priority: 'Medium', estimated_hours: 10, actual_hours: 10, start_date: '2024-11-05', due_date: '2024-11-25', completed_at: '2024-11-22T16:00:00Z', created_at: '2024-11-01T10:00:00Z', updated_at: '2024-11-22T16:00:00Z', deleted_at: null },
    { task_id: 119, project_id: 6, workflow_instance_id: null, title: 'Extract Auth service', description: 'Decouple auth from monolith.', created_by: 10, assigned_to: 10, status: 'Completed', priority: 'High', estimated_hours: 16, actual_hours: 18, start_date: '2024-11-25', due_date: '2024-12-20', completed_at: '2024-12-18T17:00:00Z', created_at: '2024-11-20T10:00:00Z', updated_at: '2024-12-18T17:00:00Z', deleted_at: null },
    { task_id: 120, project_id: 6, workflow_instance_id: null, title: 'Extract Notifications service', description: 'Decouple notifications.', created_by: 10, assigned_to: 10, status: 'In_Progress', priority: 'High', estimated_hours: 14, actual_hours: 5, start_date: '2025-01-05', due_date: '2025-02-15', completed_at: null, created_at: '2024-12-20T10:00:00Z', updated_at: '2025-01-10T10:00:00Z', deleted_at: null },
    { task_id: 121, project_id: 6, workflow_instance_id: null, title: 'API Gateway setup (Kong)', description: 'Route all services via Kong.', created_by: 10, assigned_to: 10, status: 'Pending', priority: 'High', estimated_hours: 12, actual_hours: 0, start_date: null, due_date: '2025-03-31', completed_at: null, created_at: '2024-12-20T10:00:00Z', updated_at: '2024-12-20T10:00:00Z', deleted_at: null },
    { task_id: 122, project_id: 6, workflow_instance_id: null, title: 'Load testing all services', description: 'k6 load tests for each microservice.', created_by: 10, assigned_to: 10, status: 'Pending', priority: 'Medium', estimated_hours: 8, actual_hours: 0, start_date: null, due_date: '2025-06-30', completed_at: null, created_at: '2024-12-20T10:00:00Z', updated_at: '2024-12-20T10:00:00Z', deleted_at: null },
  ];

  // 14. Subtasks
  public subtasks: Subtask[] = [
    { subtask_id: 1, task_id: 101, title: 'Export invoice data', description: 'Pull invoices into CSV.', created_by: 4, assigned_to: 5, status: 'Completed', estimated_hours: 1, due_date: '2024-11-06', completed_at: '2024-11-06T12:00:00Z', created_at: '2024-10-05T09:30:00Z', updated_at: '2024-11-06T12:00:00Z' },
    { subtask_id: 2, task_id: 101, title: 'Cross-check with POs', description: 'VLOOKUP matches.', created_by: 4, assigned_to: 5, status: 'In_Progress', estimated_hours: 7, due_date: '2024-11-20', completed_at: null, created_at: '2024-10-05T09:35:00Z', updated_at: '2024-11-10T10:00:00Z' },
    { subtask_id: 3, task_id: 103, title: 'Backup DBs before patch', description: 'Take full snapshots.', created_by: 8, assigned_to: 9, status: 'Completed', estimated_hours: 2, due_date: '2024-11-16', completed_at: '2024-11-16T09:00:00Z', created_at: '2024-09-15T09:30:00Z', updated_at: '2024-11-16T09:00:00Z' },
    { subtask_id: 4, task_id: 103, title: 'Apply kernel updates', description: 'Run yum update.', created_by: 8, assigned_to: 9, status: 'Blocked', estimated_hours: 4, due_date: '2024-11-18', completed_at: null, created_at: '2024-09-15T09:35:00Z', updated_at: '2024-11-18T10:00:00Z' },
    { subtask_id: 5, task_id: 106, title: 'Provision EC2 nodes', description: 'Use terraform for 3 nodes.', created_by: 10, assigned_to: 10, status: 'Completed', estimated_hours: 2, due_date: '2024-11-10', completed_at: '2024-11-06T15:00:00Z', created_at: '2024-11-01T10:30:00Z', updated_at: '2024-11-06T15:00:00Z' },
    { subtask_id: 6, task_id: 106, title: 'Initialize docker swarm', description: 'docker swarm init on master.', created_by: 10, assigned_to: 10, status: 'In_Progress', estimated_hours: 1, due_date: '2024-11-15', completed_at: null, created_at: '2024-11-01T10:35:00Z', updated_at: '2024-11-10T11:00:00Z' }
  ];

  // 15. Task_Attachments
  public task_attachments: TaskAttachment[] = [
    { attachment_id: 1, task_id: 101, subtask_id: 1, file_name: 'invoices_q4.csv', file_type: 'text/csv', file_size_bytes: 1024500, file_url: 'https://storage.officesync.in/files/invoices_q4.csv', uploaded_by: 5, uploaded_at: '2024-11-06T12:00:00Z' },
    { attachment_id: 2, task_id: 102, subtask_id: null, file_name: 'sox_matrix.pdf', file_type: 'application/pdf', file_size_bytes: 2048000, file_url: 'https://storage.officesync.in/files/sox_matrix.pdf', uploaded_by: 6, uploaded_at: '2024-11-01T09:00:00Z' },
    { attachment_id: 3, task_id: 105, subtask_id: null, file_name: 'iso_gap_report.docx', file_type: 'application/msword', file_size_bytes: 512000, file_url: 'https://storage.officesync.in/files/iso_gap_report.docx', uploaded_by: 8, uploaded_at: '2024-02-14T17:00:00Z' }
  ];

  // 16. Task_Comments
  public task_comments: TaskComment[] = [
    { comment_id: 1, task_id: 101, subtask_id: 1, user_id: 5, comment_text: 'Export is complete, moving to matching phase.', created_at: '2024-11-06T12:05:00Z', updated_at: '2024-11-06T12:05:00Z', deleted_at: null },
    { comment_id: 2, task_id: 103, subtask_id: 4, user_id: 9, comment_text: 'Blocked! Staging env is unreachable via SSH.', created_at: '2024-11-18T10:05:00Z', updated_at: '2024-11-18T10:05:00Z', deleted_at: null },
    { comment_id: 3, task_id: 102, subtask_id: null, user_id: 4, comment_text: 'I have reviewed 80% of the controls, uploading evidence soon.', created_at: '2024-11-10T14:00:00Z', updated_at: '2024-11-10T14:00:00Z', deleted_at: null }
  ];

  // 17. Compliance_Categories
  public compliance_categories: ComplianceCategory[] = [
    { category_id: 1, name: 'Financial Controls', description: 'SOX and internal audit rules.', manager_id: 6 },
    { category_id: 2, name: 'IT Security', description: 'ISO 27001 rules.', manager_id: 3 },
    { category_id: 3, name: 'HR Policies', description: 'Labor laws and onboarding compliance.', manager_id: 7 }
  ];

  // 18. Compliance_Rules
  public compliance_rules: ComplianceRule[] = [
    { rule_id: 1, category_id: 1, rule_name: 'Task Due Date Overdue > 7 Days', description: 'Tasks cannot be overdue > 7 days.', remediation_steps: 'Extend deadline or escalate.', severity: 'High', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { rule_id: 2, category_id: 2, rule_name: 'Critical Blocker Open > 48 Hours', description: 'Unresolved critical escalation.', remediation_steps: 'Escalate to management immediately.', severity: 'Critical', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { rule_id: 3, category_id: 2, rule_name: 'Firewall Rules Not Reviewed', description: 'Quarterly review mandatory.', remediation_steps: 'Conduct FW audit.', severity: 'Medium', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { rule_id: 4, category_id: 3, rule_name: 'Onboarding Incomplete', description: 'New hires must complete onboarding in 30 days.', remediation_steps: 'Remind employee and manager.', severity: 'Medium', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' }
  ];

  // 19. Compliance_Violations
  public compliance_violations: ComplianceViolation[] = [
    { violation_id: 1, rule_id: 2, entity_id: 103, entity_type: 'Task', status: 'Open', detected_at: '2024-11-20T10:00:00Z', reported_by: null, resolved_by: null, resolved_at: null, resolution_remarks: null, due_date: '2024-11-22' },
    { violation_id: 2, rule_id: 3, entity_id: 104, entity_type: 'Task', status: 'Under_Review', detected_at: '2024-11-15T09:00:00Z', reported_by: 3, resolved_by: null, resolved_at: null, resolution_remarks: null, due_date: '2024-11-30' },
    { violation_id: 3, rule_id: 1, entity_id: 102, entity_type: 'Task', status: 'Resolved', detected_at: '2024-11-25T00:00:00Z', reported_by: null, resolved_by: 3, resolved_at: '2024-11-26T10:00:00Z', resolution_remarks: 'Deadline officially extended by PM.', due_date: '2024-11-30' },
    { violation_id: 4, rule_id: 4, entity_id: 10, entity_type: 'User', status: 'Open', detected_at: '2024-03-01T09:00:00Z', reported_by: null, resolved_by: null, resolved_at: null, resolution_remarks: null, due_date: '2024-03-05' }
  ];

  // 20. Violation_Comments
  public violation_comments: ViolationComment[] = [
    { comment_id: 1, violation_id: 1, user_id: 3, comment_text: 'Looking into this blocked patch task. It violates our SLA.', attachment_url: null, created_at: '2024-11-20T10:30:00Z' },
    { comment_id: 2, violation_id: 2, user_id: 8, comment_text: 'I have started the review, evidence will be uploaded shortly.', attachment_url: null, created_at: '2024-11-16T11:00:00Z' }
  ];

  // 21. Audit_Logs
  public audit_logs: AuditLog[] = [
    { log_id: 1, entity_id: 101, entity_type: 'Task', action: 'STATUS_CHANGE', performed_by: 5, performed_at: '2024-11-10T11:00:00Z', ip_address: '10.0.1.45', user_agent: 'Chrome', used_permission_slug: null, old_value: { status: 'Pending' }, new_value: { status: 'In_Progress' } },
    { log_id: 2, entity_id: 1, entity_type: 'Workflow_Instance', action: 'CREATE', performed_by: 5, performed_at: '2024-11-01T09:00:00Z', ip_address: '10.0.1.45', user_agent: 'Firefox', used_permission_slug: 'workflow:create', old_value: null, new_value: { status: 'Active', template_id: 1 } },
    { log_id: 3, entity_id: 103, entity_type: 'Task', action: 'STATUS_CHANGE', performed_by: 9, performed_at: '2024-11-18T10:00:00Z', ip_address: '10.0.1.50', user_agent: 'Safari', used_permission_slug: null, old_value: { status: 'In_Progress' }, new_value: { status: 'Blocked' } },
    { log_id: 4, entity_id: 1, entity_type: 'Task', action: 'ESCALATE', performed_by: 9, performed_at: '2024-11-18T10:02:00Z', ip_address: '10.0.1.50', user_agent: 'Safari', used_permission_slug: null, old_value: null, new_value: { escalation_id: 1 } },
    { log_id: 5, entity_id: 3, entity_type: 'Project', action: 'CREATE', performed_by: 7, performed_at: '2024-12-01T10:00:00Z', ip_address: '10.0.1.88', user_agent: 'Edge', used_permission_slug: 'project:manage', old_value: null, new_value: { name: 'Employee Onboarding Revamp' } },
    { log_id: 6, entity_id: 3, entity_type: 'Workflow_Instance', action: 'STATUS_CHANGE', performed_by: 6, performed_at: '2024-10-07T14:00:00Z', ip_address: '10.0.1.33', user_agent: 'Chrome', used_permission_slug: 'workflow:approve', old_value: { status: 'Active' }, new_value: { status: 'Completed' } }
  ];

  // 22. Escalations
  public escalations: Escalation[] = [
    { escalation_id: 1, task_id: 103, project_id: 2, reported_by: 9, target_manager_id: 8, title: 'Patching blocked - Staging Down', description: 'Staging environment is unreachable.', blocker_type: 'System Issue', priority: 'Critical', status: 'Open', created_at: '2024-11-18T10:00:00Z', resolved_at: null },
    { escalation_id: 2, task_id: 101, project_id: 1, reported_by: 5, target_manager_id: 4, title: 'Missing SAP FI access', description: 'Need export permissions.', blocker_type: 'Access Issue', priority: 'High', status: 'Resolved', created_at: '2024-11-05T10:00:00Z', resolved_at: '2024-11-06T09:00:00Z' },
    { escalation_id: 3, task_id: 106, project_id: 6, reported_by: 10, target_manager_id: 1, title: 'AWS Quota Exceeded', description: 'Cannot provision more EC2 instances.', blocker_type: 'Infrastructure', priority: 'Medium', status: 'Reviewed', created_at: '2024-11-06T10:00:00Z', resolved_at: null }
  ];

  // 23. Compliance_Evidence
  public compliance_evidence: ComplianceEvidence[] = [
    { evidence_id: 1, user_id: 5, task_id: 101, violation_id: null, title: 'Invoice reconciliation sheet', evidence_type: 'Document', file_url: 'https://storage.officesync.in/evidence/q4_invoice_recon.xlsx', notes: 'Excel sheet attached.', status: 'Under_Review', reviewed_by: null, submitted_at: '2024-11-17T14:00:00Z', reviewed_at: null },
    { evidence_id: 2, user_id: 8, task_id: 105, violation_id: null, title: 'ISO Gap Report Final', evidence_type: 'Document', file_url: 'https://storage.officesync.in/evidence/iso_gap_report_final.pdf', notes: 'Signed off by CTO.', status: 'Approved', reviewed_by: 3, submitted_at: '2024-02-14T17:05:00Z', reviewed_at: '2024-02-15T09:00:00Z' },
    { evidence_id: 3, user_id: 9, task_id: 104, violation_id: 2, title: 'Firewall rules dump', evidence_type: 'Archive', file_url: 'https://storage.officesync.in/evidence/fw_rules.tar.gz', notes: 'Raw iptables dump.', status: 'Pending', reviewed_by: null, submitted_at: '2024-11-16T11:30:00Z', reviewed_at: null }
  ];

  // 24. Notifications
  public notifications: AppNotification[] = [
    { notification_id: 1, user_id: 5, title: 'New Task Assigned', message: 'You have been assigned to "Data Collection" in Finance Q4.', type: 'Task', is_read: false, link: 'tasks.html?id=1', created_at: '2024-11-20T10:00:00Z' }
  ];

}