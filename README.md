# OptiFlow

### Task, Process & Compliance Management Platform

---

## 1. Problem Statement

Modern organizations execute their operations through structured tasks, processes, and compliance-driven activities. However, in many environments, these activities are managed using fragmented tools such as emails, spreadsheets, or messaging platforms, leading to inefficiencies, delays, and accountability gaps.

Common challenges include:

- Lack of centralized task and process tracking
- Unclear ownership and responsibility for tasks
- Delays caused by undefined approval and escalation chains
- Poor visibility into task progress and compliance status
- Incomplete or missing audit trails
- Difficulty generating accurate operational and compliance reports

OptiFlow is a **centralized, web-based Office & Organisational Workflow Management System** that standardizes task execution, enforces predefined workflows, integrates automated compliance checks, and maintains complete audit logs. The system improves transparency, accountability, and operational control across departments.

---

## 2. Actors and Responsibilities

| Actor / Role | Responsibilities |
| --- | --- |
| **Superuser (Platform / Business Owner)** | The SaaS business owners who manage multi-tenant client companies, subscription plans, platform-wide billing, and global system health. |
| **Company Owner / Org Admin** | Client organization administrators who manage their company branches, departments, internal settings, employee roles, and company-level subscriptions. |
| **Executive** | Views cross-branch performance dashboards, reports, and company-wide analytics. |
| **Compliance Officer** | Defines compliance rules, audits task and process execution, reviews evidence, resolves violations, and monitors audit logs. |
| **HR** | Manages employee records, assigns roles and permissions, and maintains organizational hierarchy required for workflow execution. |
| **Process Admin** | Designs and configures workflow templates, defines process stages and approval sequences, and optimizes process efficiency. |
| **Project Manager** | Oversees project execution, assigns tasks to Team Leaders, sets deadlines and priorities, handles escalations, and monitors compliance status. |
| **Team Leader** | Breaks tasks into subtasks, assigns work to team members, reviews subtask submissions, and escalates unresolved issues. |
| **Team Member** | Executes assigned tasks, updates progress, submits work and compliance evidence, and reports blockers. |

---

## 3. Features for Each Actor

### 3.1 Superuser (SaaS Platform & Business Owner)

- Register, onboard, and manage tenant companies and client organizations
- Define and configure SaaS subscription tiers, pricing, and resource limits
- Monitor global platform usage, revenue, and system audit logs
- Manage platform-level support and multi-tenant access control

### 3.2 Company Owner / Org Admin

- Configure organization settings, departments, and branch hierarchy
- Manage tenant users, employee accounts, and role assignments
- Monitor company-wide task execution, audit trails, and internal analytics
- Oversee company-level billing and subscription status

### 3.3 Executive

- Access executive dashboard with cross-branch switching
- Review organizational task completion and compliance rates
- Export high-level operational and executive reports

### 3.4 Compliance Officer

- Define and manage automated compliance rules and policies
- Review task and process execution for compliance adherence
- Verify submitted compliance documents and evidence
- Approve or reject evidence submissions and resolve violations
- Access real-time audit logs and generate compliance reports

### 3.5 HR

- Create and manage employee profiles
- Assign roles and granular permissions
- Define team structures and reporting hierarchy
- Manage role templates and access governance

### 3.6 Process Admin

- Design and configure workflow templates
- Define process stages, approval sequences, and step permissions
- Configure loopback and rejection rules for workflows
- Monitor overall process instances and execution efficiency

### 3.7 Project Manager

- Create and manage projects and tasks
- Assign tasks to Team Leaders and set priorities/deadlines
- Monitor project progress and compliance status
- Review completed work and handle task escalations

### 3.8 Team Leader

- Break tasks into manageable subtasks
- Assign subtasks to Team Members
- Review submitted subtask work and attached evidence
- Approve or reject subtask submissions
- Track team progress and escalate blockers to Project Managers

### 3.9 Team Member

- View assigned tasks, subtasks, and deadlines
- Update task status (Draft, Active, In Review, Completed, Blocked)
- Submit work outputs and upload required compliance evidence
- Add comments and notes on assigned tasks
- Report blockers and raise escalations

---

## 4. Technology Stack

- **Backend**: NestJS (TypeScript), Prisma ORM, EventEmitter2, Swagger / OpenAPI
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Modular CSS3
- **Database**: PostgreSQL
- **Security & Governance**: Role-Based Access Control (RBAC), Multi-Tenancy Scoping, Immutable Audit Logs

---

## 5. Project Structure

```
.
├── back-end/          # NestJS backend API application
│   ├── src/           # Domain modules, controllers, services, guards
│   ├── prisma/        # Prisma schema, migrations, and seed scripts
│   └── docs/          # Swagger OpenAPI documentation
├── front-end/         # Frontend web application and dashboards
│   ├── admin/         # Dashboards for HR, PM, Compliance, Executive
│   ├── enduser/       # Dashboards for Team Leader and Team Member
│   ├── superuser/     # Dashboards for SaaS Superuser (Platform / Business Owner)
│   ├── org-admin/     # Dashboards for Company Owner / Organization Admin
│   └── js/            # Shared components, auth, and utilities
├── Database/          # SQL database schema and ER diagrams
├── Figma designs/     # UI/UX design assets and PDF exports
└── Video/             # Project demo video
```

---

## 6. Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd back-end
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/optiflow?schema=public"
   PORT=5500
   ```

4. Generate Prisma client, sync database, and seed test data:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

5. Start the backend development server:
   ```bash
   npm run start:dev
   ```

The backend API runs at `http://localhost:5500`.
Swagger API documentation is available at `http://localhost:5500/api/docs`.

### Frontend Setup

Serve the `front-end` directory using any static web server (such as VS Code Live Server or `npx serve front-end`). Open `index.html` or `login.html` in your browser.
