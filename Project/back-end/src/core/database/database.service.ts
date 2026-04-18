import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: string;
  department_id: number;
  reports_to: number | null;
  status: string;
}

export interface Department {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  department_id: number;
  status: string;
}

export interface Task {
  id: number;
  title: string;
  project_id: number;
  assigned_to: number;
  priority: string;
  status: string;
}

export interface Escalation {
  id: number;
  task_id: number;
  raised_by: number;
  reason: string;
  status: string;
}

export interface ComplianceEvidence {
  id: number;
  task_id: number;
  submitted_by: number;
  file_url: string;
  status: string;
}

@Injectable()
export class DatabaseService {
  public departments: Department[] = [
    { id: 1, name: 'Operations' },
    { id: 2, name: 'IT Security' },
  ];

  public users: User[] = [
    {
      id: 1,
      full_name: 'Admin User',
      email: 'admin@officesync.in',
      role: 'superuser',
      department_id: 1,
      reports_to: null,
      status: 'Active'
    },
    {
      id: 2,
      full_name: 'Jane Team Lead',
      email: 'lead@officesync.in',
      role: 'team_leader',
      department_id: 1,
      reports_to: 1,
      status: 'Active'
    },
    {
      id: 3,
      full_name: 'John Member',
      email: 'member@officesync.in',
      role: 'team_member',
      department_id: 1,
      reports_to: 2,
      status: 'Active'
    },
  ];

  public projects: Project[] = [
    {
      id: 1,
      name: 'Q4 Financial Audit',
      description: 'Quarterly compliance and controls review.',
      department_id: 1,
      status: 'Active',
    }
  ];

  public tasks: Task[] = [
    {
      id: 101,
      title: 'Reconcile vendor invoices',
      project_id: 1,
      assigned_to: 3,
      priority: 'High',
      status: 'In_Progress',
    },
    {
      id: 102,
      title: 'Review SOX 404 Packet',
      project_id: 1,
      assigned_to: 2,
      priority: 'Medium',
      status: 'Pending',
    },
  ];

  public escalations: Escalation[] = [];
  
  public compliance_evidence: ComplianceEvidence[] = [];
}