# OptiFlow
> Enterprise Multi-Tenant Workflow, Process Orchestration & Compliance Management Platform

## 1. Overview & Problem Statement
In enterprise environments, task management, standard operating procedures (SOPs), and compliance activities are often fragmented across disparate tools (spreadsheets, chat, wikis). This results in:
- **No Compliance Enforcement**: Tasks are marked "Done" without mandatory evidence, validation, or reviews.
- **Inflexible Access Control**: Global permissions lack multi-tier organizational scoping (Branches/Teams/Projects).
- **Process & Blocker Delays**: Lack of formal escalation chains and automated approval/rejection workflows.
- **Audit Gaps**: Missing immutable audit logs across administrative, identity, process, and compliance events.

**OptiFlow** unifies SaaS tenant administration, multi-level organizational modeling, BPMN-style process execution, task management, compliance gating, and non-repudiable audit logging into one platform.

---

## 2. System Actors & Features

OptiFlow defines **8 specialized actors** across the SaaS Platform and Tenant layers:

| Actor | Role Code | Scope | Key Features & Responsibilities |
|---|---|---|---|
| **Platform Admin** | `platform_admin` | Global SaaS | Provisions tenant companies with 1-time setup links, manages plan tiers & quotas, issues audited break-glass support access, views platform audit logs. |
| **Company Owner / Exec** | `company_owner` | Company | Company-wide KPI dashboard, cross-project portfolio health, SLA oversight, organizational metrics, full system audit logs. |
| **HR / Access Governance** | `hr_manager` | Company | Manages user directory, branch offices & teams, manager-report hierarchy, assigns scoped RBAC roles (`Company`, `Branch`, `Team`, `Project`). |
| **Process Admin** | `process_admin` | Company | Designs and versions SOP process templates with step types (`Approval`, `Input_Required`, `Automated_Task`) and rejection rollback paths (`onRejectGotoStepId`). |
| **Compliance Officer** | `compliance_officer` | Company | Configures compliance rule catalogs, binds rules to scopes, enforces `BLOCK_TRANSITION` criteria, audits violations, inspects/approves evidence. |
| **Project Manager** | `project_manager` | Project | Creates projects, instantiates process templates into project instances, delegates tasks, schedules deadlines, resolves team escalations. |
| **Team Lead** | `team_lead` | Team / Branch | Deconstructs tasks into subtasks, reviews task deliverables, approves process steps, triages team blockers and escalations. |
| **Team Member** | `team_member` | User / Team | "My Tasks" workbench, logs actual vs. estimated hours, uploads required compliance evidence (files/notes), submits work, raises blockers. |

---

## 3. Core App Features

- **Multi-Tenant SaaS Isolation**: Strict tenant data separation with subscription plans and enforced quotas (`maxUsers`, `maxBranches`, `maxActiveTemplates`, `maxComplianceRules`).
- **BPM Process Engine**: Sequential and branched workflows, multi-step approvals, conditional rollback routing, and live instance tracking.
- **Automated Compliance Gating**: Real-time transition evaluator blocking (`BLOCK_TRANSITION`) or warning (`ALLOW_WITH_WARNING`) unauthorized status changes until verified evidence is approved.
- **Hierarchical Scoped RBAC**: Permissions enforced across four distinct levels: `Company` → `Branch` → `Team` → `Project`.
- **First-Class Escalation System**: Tracked blocker management linking stalled tasks to root cause categories, priority ratings, and target managers.
- **Four-Tier Audit Trail**: Immutable logging across `PlatformAuditLog` (SaaS ops), `SystemAuditLog` (IAM & orgs), `ProcessAuditLog` (workflows & tasks), and `ComplianceAuditLog` (violations & evidence).
- **Break-Glass Support Protocol**: Audited, time-bounded emergency tenant access for platform administrators with mandatory justification logging.

---

## 4. Tech Stack & Architecture

- **Frontend**: React 19, Tailwind CSS v4, Vite 8, React Router v7, Lucide Icons, Recharts.
- **Backend**: Express.js 5, Node.js (ES Modules), Prisma ORM 6, PostgreSQL.
- **Security**: JWT authentication (httpOnly cookies & Bearer tokens), Bcrypt hashing, token versioning for instant session revocation.

---

## 5. Quick Start

### Backend (`/back-end-new`)
```bash
cd back-end-new && npm install
# Setup .env with DATABASE_URL & JWT_SECRET, then push schema & seed:
npx prisma db push && npm run db:seed
npm run dev # Starts server on http://localhost:5500
```

### Frontend (`/react_frontend`)
```bash
cd react_frontend && npm install
npm run dev # Starts client on http://localhost:5173
```

> **Default Seed Password (All Roles)**: `password123`  
> Platform Admin: `admin@platform.com` | Owner: `ceo@acme.com` | HR: `hr@acme.com` | PM: `pm@acme.com` | TL: `tl@acme.com` | Member: `employee@acme.com`
