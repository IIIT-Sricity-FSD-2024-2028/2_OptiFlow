import { Injectable } from '@nestjs/common';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Department {
  department_id: number;
  department_name: string;
  manager_id: number | null;
  created_at: string;
}

export interface Role {
  role_id: number;
  role_name: string;
  description: string;
  is_system: boolean;
  created_at: string;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;           // role slug used by frontend & RolesGuard
  department_id: number;
  manager_id: number | null; // direct manager (reports_to)
  is_active: boolean;
  created_at: string;
}

export interface Project {
  project_id: number;
  project_name: string;
  description: string;
  department_id: number;
  status: 'Planning' | 'Active' | 'On_Hold' | 'Completed' | 'Cancelled';
  start_date: string;
  end_date: string | null;
  created_by: number;
  created_at: string;
}

export interface Task {
  task_id: number;
  project_id: number | null;
  title: string;
  description: string;
  created_by: number;
  assigned_to: number;
  status: 'Pending' | 'In_Progress' | 'In_Review' | 'Blocked' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimated_hours: number;
  actual_hours: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Subtask {
  subtask_id: number;
  task_id: number;
  title: string;
  description: string;
  assigned_to: number;
  status: 'Pending' | 'In_Progress' | 'In_Review' | 'Blocked' | 'Completed' | 'Cancelled';
  estimated_hours: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Escalation {
  escalation_id: number;
  task_id: number;
  project_id: number;
  reported_by: number;
  target_manager_id: number;
  title: string;
  description: string;
  blocker_type: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Reviewed' | 'Resolved' | 'Closed';
  created_at: string;
  resolved_at: string | null;
}

export interface AuditLog {
  log_id: number;
  entity_id: number;
  entity_type: string;
  action: string;
  performed_by: number | null;
  performed_at: string;
  ip_address: string | null;
  old_value: object | null;
  new_value: object | null;
}

export interface ComplianceRule {
  rule_id: number;
  rule_name: string;
  description: string;
  remediation_steps: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  is_active: boolean;
  created_at: string;
}

export interface ComplianceViolation {
  violation_id: number;
  rule_id: number;
  entity_id: number;
  entity_type: string;
  status: 'Open' | 'Under_Review' | 'Resolved' | 'Ignored';
  detected_at: string;
  reported_by: number | null;
  resolved_by: number | null;
  resolved_at: string | null;
  resolution_remarks: string | null;
  due_date: string | null;
}

export interface Evidence {
  evidence_id: number;
  user_id: number;
  task_id: number | null;
  violation_id: number | null;
  title: string;
  evidence_type: string;
  file_url: string;
  notes: string;
  status: 'Pending' | 'Under_Review' | 'Approved' | 'Rejected';
  reviewed_by: number | null;
  submitted_at: string;
  reviewed_at: string | null;
}

// ─── DatabaseService ───────────────────────────────────────────────────────────

@Injectable()
export class DatabaseService {

  public departments: Department[] = [
    { department_id: 1, department_name: 'Operations',       manager_id: 2,    created_at: '2024-01-10T09:00:00Z' },
    { department_id: 2, department_name: 'IT Security',      manager_id: 3,    created_at: '2024-01-10T09:00:00Z' },
    { department_id: 3, department_name: 'Finance',          manager_id: 6,    created_at: '2024-01-12T09:00:00Z' },
    { department_id: 4, department_name: 'Human Resources',  manager_id: 7,    created_at: '2024-01-12T09:00:00Z' },
  ];

  public roles: Role[] = [
    { role_id: 1, role_name: 'superuser',           description: 'Full system access',                       is_system: true,  created_at: '2024-01-01T00:00:00Z' },
    { role_id: 2, role_name: 'project_manager',     description: 'Manages projects and team assignments',     is_system: true,  created_at: '2024-01-01T00:00:00Z' },
    { role_id: 3, role_name: 'compliance_officer',  description: 'Reviews and resolves compliance issues',    is_system: true,  created_at: '2024-01-01T00:00:00Z' },
    { role_id: 4, role_name: 'hr_manager',          description: 'Manages HR operations and user accounts',   is_system: true,  created_at: '2024-01-01T00:00:00Z' },
    { role_id: 5, role_name: 'team_leader',         description: 'Leads a team, assigns tasks',               is_system: false, created_at: '2024-01-01T00:00:00Z' },
    { role_id: 6, role_name: 'team_member',         description: 'Individual contributor, executes tasks',    is_system: false, created_at: '2024-01-01T00:00:00Z' },
  ];

  public users: User[] = [
    { user_id: 1,  full_name: 'Arjun Mehta',       email: 'arjun@officesync.in',     password_hash: 'hashed_pw_1', role: 'superuser',          department_id: 1, manager_id: null, is_active: true,  created_at: '2024-01-15T08:00:00Z' },
    { user_id: 2,  full_name: 'Priya Sharma',       email: 'priya@officesync.in',     password_hash: 'hashed_pw_2', role: 'project_manager',    department_id: 1, manager_id: 1,    is_active: true,  created_at: '2024-01-16T08:00:00Z' },
    { user_id: 3,  full_name: 'Rohan Nair',         email: 'rohan@officesync.in',     password_hash: 'hashed_pw_3', role: 'compliance_officer', department_id: 2, manager_id: 1,    is_active: true,  created_at: '2024-01-17T08:00:00Z' },
    { user_id: 4,  full_name: 'Sneha Kapoor',       email: 'sneha@officesync.in',     password_hash: 'hashed_pw_4', role: 'team_leader',        department_id: 1, manager_id: 2,    is_active: true,  created_at: '2024-01-18T08:00:00Z' },
    { user_id: 5,  full_name: 'Vikram Desai',       email: 'vikram@officesync.in',    password_hash: 'hashed_pw_5', role: 'team_member',        department_id: 1, manager_id: 4,    is_active: true,  created_at: '2024-01-19T08:00:00Z' },
    { user_id: 6,  full_name: 'Anjali Rao',         email: 'anjali@officesync.in',    password_hash: 'hashed_pw_6', role: 'project_manager',    department_id: 3, manager_id: 1,    is_active: true,  created_at: '2024-01-20T08:00:00Z' },
    { user_id: 7,  full_name: 'Kiran Patel',        email: 'kiran@officesync.in',     password_hash: 'hashed_pw_7', role: 'hr_manager',         department_id: 4, manager_id: 1,    is_active: true,  created_at: '2024-01-21T08:00:00Z' },
    { user_id: 8,  full_name: 'Divya Menon',        email: 'divya@officesync.in',     password_hash: 'hashed_pw_8', role: 'team_leader',        department_id: 2, manager_id: 3,    is_active: true,  created_at: '2024-01-22T08:00:00Z' },
    { user_id: 9,  full_name: 'Rahul Iyer',         email: 'rahul@officesync.in',     password_hash: 'hashed_pw_9', role: 'team_member',        department_id: 2, manager_id: 8,    is_active: true,  created_at: '2024-01-23T08:00:00Z' },
    { user_id: 10, full_name: 'Meera Krishnan',     email: 'meera@officesync.in',     password_hash: 'hashed_pw_10', role: 'team_member',       department_id: 1, manager_id: 4,    is_active: false, created_at: '2024-02-01T08:00:00Z' },
  ];

  public projects: Project[] = [
    { project_id: 1, project_name: 'Q4 Financial Audit',          description: 'End-of-year financial controls review and SOX compliance testing.',        department_id: 3, status: 'Active',     start_date: '2024-10-01', end_date: '2024-12-31', created_by: 6, created_at: '2024-09-25T10:00:00Z' },
    { project_id: 2, project_name: 'IT Infrastructure Hardening',  description: 'Upgrade firewalls, patch servers, and conduct penetration testing.',       department_id: 2, status: 'Active',     start_date: '2024-09-01', end_date: '2025-03-31', created_by: 2, created_at: '2024-08-20T10:00:00Z' },
    { project_id: 3, project_name: 'Employee Onboarding Revamp',   description: 'Redesign the onboarding workflow to reduce ramp-up time by 30%.',          department_id: 4, status: 'Planning',   start_date: '2025-01-15', end_date: '2025-06-30', created_by: 7, created_at: '2024-12-01T10:00:00Z' },
    { project_id: 4, project_name: 'Operations Efficiency Drive',  description: 'Identify and eliminate bottlenecks in daily operations workflows.',         department_id: 1, status: 'On_Hold',    start_date: '2024-07-01', end_date: '2024-12-31', created_by: 2, created_at: '2024-06-15T10:00:00Z' },
    { project_id: 5, project_name: 'ISO 27001 Certification',      description: 'Achieve ISO 27001 information security management certification.',          department_id: 2, status: 'Active',     start_date: '2024-11-01', end_date: '2025-05-31', created_by: 3, created_at: '2024-10-20T10:00:00Z' },
  ];

  public tasks: Task[] = [
    { task_id: 101, project_id: 1, title: 'Reconcile vendor invoices',            description: 'Cross-check all vendor invoices against PO records for Q4.',         created_by: 4, assigned_to: 5,  status: 'In_Progress', priority: 'High',     estimated_hours: 8,  actual_hours: 3,  due_date: '2024-11-20', completed_at: null,                  created_at: '2024-10-05T09:00:00Z' },
    { task_id: 102, project_id: 1, title: 'Review SOX 404 Control Testing',       description: 'Validate all in-scope controls have been tested per SOX 404.',        created_by: 6, assigned_to: 4,  status: 'In_Review',   priority: 'Critical', estimated_hours: 16, actual_hours: 16, due_date: '2024-11-15', completed_at: null,                  created_at: '2024-10-06T09:00:00Z' },
    { task_id: 103, project_id: 2, title: 'Firewall rule audit',                  description: 'Review all existing firewall rules, remove stale entries.',           created_by: 8, assigned_to: 9,  status: 'Pending',     priority: 'High',     estimated_hours: 6,  actual_hours: 0,  due_date: '2024-12-01', completed_at: null,                  created_at: '2024-09-10T09:00:00Z' },
    { task_id: 104, project_id: 2, title: 'Patch server vulnerabilities',         description: 'Apply critical CVE patches to all production servers.',               created_by: 8, assigned_to: 9,  status: 'Blocked',     priority: 'Critical', estimated_hours: 12, actual_hours: 2,  due_date: '2024-11-30', completed_at: null,                  created_at: '2024-09-15T09:00:00Z' },
    { task_id: 105, project_id: 5, title: 'Gap analysis for ISO 27001',           description: 'Identify gaps between current state and ISO 27001 Annex A controls.', created_by: 3, assigned_to: 8,  status: 'Completed',   priority: 'High',     estimated_hours: 20, actual_hours: 22, due_date: '2024-11-10', completed_at: '2024-11-09T17:00:00Z', created_at: '2024-11-01T09:00:00Z' },
    { task_id: 106, project_id: 4, title: 'Map current ops workflows',            description: 'Document all existing operational workflows using BPMN notation.',    created_by: 2, assigned_to: 5,  status: 'Pending',     priority: 'Medium',   estimated_hours: 10, actual_hours: 0,  due_date: '2025-01-15', completed_at: null,                  created_at: '2024-11-05T09:00:00Z' },
    { task_id: 107, project_id: 1, title: 'Draft audit findings report',          description: 'Compile all audit findings into the final management report.',        created_by: 6, assigned_to: 6,  status: 'Pending',     priority: 'High',     estimated_hours: 8,  actual_hours: 0,  due_date: '2024-12-15', completed_at: null,                  created_at: '2024-11-10T09:00:00Z' },
    { task_id: 108, project_id: 3, title: 'Interview HR stakeholders',            description: 'Collect requirements from HR team for the new onboarding system.',    created_by: 7, assigned_to: 7,  status: 'In_Progress', priority: 'Medium',   estimated_hours: 4,  actual_hours: 2,  due_date: '2025-01-20', completed_at: null,                  created_at: '2024-12-05T09:00:00Z' },
  ];

  public subtasks: Subtask[] = [
    { subtask_id: 1, task_id: 101, title: 'Export invoice data from ERP',       description: 'Pull all Q4 invoices from SAP into a CSV.',             assigned_to: 5, status: 'Completed', estimated_hours: 1,   due_date: '2024-11-06', completed_at: '2024-11-06T12:00:00Z', created_at: '2024-10-05T09:30:00Z' },
    { subtask_id: 2, task_id: 101, title: 'Match invoices to POs in spreadsheet', description: 'Use VLOOKUP to find mismatches.',                      assigned_to: 5, status: 'In_Progress', estimated_hours: 5, due_date: '2024-11-18', completed_at: null,                   created_at: '2024-10-05T09:30:00Z' },
    { subtask_id: 3, task_id: 102, title: 'Test ITGCs for user access',         description: 'Validate user access control evidence for all systems.',  assigned_to: 4, status: 'Completed', estimated_hours: 6,   due_date: '2024-11-10', completed_at: '2024-11-10T16:00:00Z', created_at: '2024-10-06T09:30:00Z' },
    { subtask_id: 4, task_id: 103, title: 'Export firewall rules to CSV',       description: 'Use CLI to export all active rules.',                     assigned_to: 9, status: 'Pending',   estimated_hours: 1,   due_date: '2024-11-28', completed_at: null,                   created_at: '2024-09-10T09:30:00Z' },
    { subtask_id: 5, task_id: 104, title: 'Test patches in staging environment','description': 'Apply patches to staging, run regression tests.',       assigned_to: 9, status: 'Blocked',   estimated_hours: 4,   due_date: '2024-11-25', completed_at: null,                   created_at: '2024-09-15T09:30:00Z' },
  ];

  public escalations: Escalation[] = [
    { escalation_id: 1, task_id: 104, project_id: 2, reported_by: 9, target_manager_id: 8, title: 'Staging environment not accessible',  description: 'The staging server has been down for 3 days, blocking patching work.', blocker_type: 'System Issue',  priority: 'Critical', status: 'Open',     created_at: '2024-11-18T10:00:00Z', resolved_at: null },
    { escalation_id: 2, task_id: 101, project_id: 1, reported_by: 5, target_manager_id: 4, title: 'ERP access denied for invoice export', description: 'User does not have read access to the SAP FI module.',                    blocker_type: 'Access Issue',  priority: 'High',     status: 'Resolved', created_at: '2024-11-05T10:00:00Z', resolved_at: '2024-11-06T09:00:00Z' },
    { escalation_id: 3, task_id: 106, project_id: 4, reported_by: 5, target_manager_id: 2, title: 'Conflicting priorities from management', description: 'Task 106 and a separate ops request are both marked Critical.',           blocker_type: 'Dependency',    priority: 'Medium',   status: 'Reviewed', created_at: '2024-11-12T10:00:00Z', resolved_at: null },
  ];

  public audit_logs: AuditLog[] = [
    { log_id: 1, entity_id: 5,   entity_type: 'User',    action: 'CREATE',        performed_by: 7,    performed_at: '2024-01-19T08:05:00Z', ip_address: '10.0.1.22', old_value: null, new_value: { role: 'team_member', department_id: 1 } },
    { log_id: 2, entity_id: 101, entity_type: 'Task',    action: 'STATUS_CHANGE', performed_by: 5,    performed_at: '2024-11-07T11:00:00Z', ip_address: '10.0.1.45', old_value: { status: 'Pending' }, new_value: { status: 'In_Progress' } },
    { log_id: 3, entity_id: 1,   entity_type: 'Project', action: 'UPDATE',        performed_by: 6,    performed_at: '2024-10-10T14:00:00Z', ip_address: '10.0.1.12', old_value: { status: 'Planning' }, new_value: { status: 'Active' } },
    { log_id: 4, entity_id: 2,   entity_type: 'User',    action: 'UPDATE',        performed_by: 1,    performed_at: '2024-03-01T09:00:00Z', ip_address: '10.0.0.1',  old_value: { role: 'team_leader' }, new_value: { role: 'project_manager' } },
    { log_id: 5, entity_id: 104, entity_type: 'Task',    action: 'STATUS_CHANGE', performed_by: 9,    performed_at: '2024-11-18T08:00:00Z', ip_address: '10.0.1.50', old_value: { status: 'In_Progress' }, new_value: { status: 'Blocked' } },
    { log_id: 6, entity_id: 1,   entity_type: 'Escalation', action: 'CREATE',     performed_by: 9,    performed_at: '2024-11-18T10:00:00Z', ip_address: '10.0.1.50', old_value: null, new_value: { title: 'Staging environment not accessible' } },
  ];

  public compliance_rules: ComplianceRule[] = [
    { rule_id: 1, rule_name: 'Task Due Date Overdue > 7 Days',       description: 'Any task overdue by more than 7 days must be escalated.',              remediation_steps: 'Reassign task or extend deadline with PM approval.',   severity: 'High',     is_active: true, created_at: '2024-01-01T00:00:00Z' },
    { rule_id: 2, rule_name: 'Inactive User Account Not Offboarded', description: 'Users marked inactive must have accounts disabled within 48 hours.',    remediation_steps: 'IT Security must revoke all system access immediately.', severity: 'Critical', is_active: true, created_at: '2024-01-01T00:00:00Z' },
    { rule_id: 3, rule_name: 'Evidence Not Submitted for Closed Task', description: 'Completed tasks with a compliance tag must have evidence attached.',   remediation_steps: 'Submit supporting evidence within 5 business days.',    severity: 'Medium',   is_active: true, created_at: '2024-01-01T00:00:00Z' },
    { rule_id: 4, rule_name: 'Critical Blocker Open > 48 Hours',     description: 'Any Critical escalation unresolved after 48 hours is a violation.',    remediation_steps: 'Escalate to senior management immediately.',            severity: 'Critical', is_active: true, created_at: '2024-01-01T00:00:00Z' },
    { rule_id: 5, rule_name: 'Firewall Rules Not Reviewed Quarterly', description: 'All firewall rules must be audited at least once per quarter.',         remediation_steps: 'Schedule and complete a firewall rule review.',         severity: 'High',     is_active: true, created_at: '2024-01-01T00:00:00Z' },
  ];

  public compliance_violations: ComplianceViolation[] = [
    { violation_id: 1, rule_id: 2, entity_id: 10,  entity_type: 'User',        status: 'Open',         detected_at: '2024-02-03T09:00:00Z', reported_by: null, resolved_by: null, resolved_at: null, resolution_remarks: null, due_date: '2024-02-05' },
    { violation_id: 2, rule_id: 4, entity_id: 1,   entity_type: 'Escalation',  status: 'Under_Review', detected_at: '2024-11-20T10:00:00Z', reported_by: 3,    resolved_by: null, resolved_at: null, resolution_remarks: null, due_date: '2024-11-22' },
    { violation_id: 3, rule_id: 1, entity_id: 103, entity_type: 'Task',        status: 'Open',         detected_at: '2024-12-05T00:00:00Z', reported_by: null, resolved_by: null, resolved_at: null, resolution_remarks: null, due_date: '2024-12-10' },
    { violation_id: 4, rule_id: 3, entity_id: 105, entity_type: 'Task',        status: 'Resolved',     detected_at: '2024-11-12T00:00:00Z', reported_by: 3,    resolved_by: 8,    resolved_at: '2024-11-14T10:00:00Z', resolution_remarks: 'Evidence document uploaded to shared drive.', due_date: '2024-11-15' },
    { violation_id: 5, rule_id: 5, entity_id: 2,   entity_type: 'Project',     status: 'Open',         detected_at: '2024-10-01T00:00:00Z', reported_by: 3,    resolved_by: null, resolved_at: null, resolution_remarks: null, due_date: '2024-10-15' },
  ];

  public evidence: Evidence[] = [
    { evidence_id: 1, user_id: 9,  task_id: 104, violation_id: null, title: 'Server patch test results',    evidence_type: 'Document',    file_url: 'https://storage.officesync.in/evidence/patch_test_results.pdf',  notes: 'Partial test results from staging.', status: 'Pending',      reviewed_by: null, submitted_at: '2024-11-20T10:00:00Z', reviewed_at: null },
    { evidence_id: 2, user_id: 8,  task_id: 105, violation_id: 4,   title: 'ISO 27001 gap analysis report', evidence_type: 'Document',    file_url: 'https://storage.officesync.in/evidence/iso_gap_analysis.pdf',   notes: 'Full gap report covering all Annex A controls.', status: 'Approved', reviewed_by: 3, submitted_at: '2024-11-09T17:30:00Z', reviewed_at: '2024-11-14T09:00:00Z' },
    { evidence_id: 3, user_id: 5,  task_id: 101, violation_id: null, title: 'Invoice reconciliation sheet',  evidence_type: 'Document',    file_url: 'https://storage.officesync.in/evidence/q4_invoice_recon.xlsx',  notes: 'Excel sheet with matched and unmatched invoices.', status: 'Under_Review', reviewed_by: null, submitted_at: '2024-11-17T14:00:00Z', reviewed_at: null },
    { evidence_id: 4, user_id: 4,  task_id: 102, violation_id: null, title: 'SOX control test screenshots', evidence_type: 'Screenshot',  file_url: 'https://storage.officesync.in/evidence/sox_control_tests.zip',  notes: 'Zipped screenshots of all ITGC tests.', status: 'Approved', reviewed_by: 3, submitted_at: '2024-11-12T11:00:00Z', reviewed_at: '2024-11-13T10:00:00Z' },
    { evidence_id: 5, user_id: 9,  task_id: 103, violation_id: 5,   title: 'Current firewall rules export',  evidence_type: 'Archive',     file_url: 'https://storage.officesync.in/evidence/firewall_rules_q4.tar',  notes: 'Raw firewall config archive. Review pending.', status: 'Pending', reviewed_by: null, submitted_at: '2024-12-02T09:00:00Z', reviewed_at: null },
  ];
}