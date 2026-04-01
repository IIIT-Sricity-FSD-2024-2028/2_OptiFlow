# Compliance Officer Role — Architectural Redesign Specification
## OptiFlow | Role-Based Task, Workflow & Compliance Management System

---

## Reasoning Summary

The Compliance Officer in its current state is a **passive observer**: it sees violations, reviews evidence, reads audit logs, and generates reports. Every other role — Super Admin (full CRUD + system config), HR (employee lifecycle, RBAC management), Team Leader (task approvals, escalations), Team Member (task execution + evidence submission) — has **active control authority** over at least one system entity. The Compliance Officer has none.

The redesign transforms the role into an **active control authority** by granting it the power to: (1) author and version compliance rules that *bind* workflow transitions, (2) inject enforcement checkpoints directly into workflow steps, (3) own the full violation lifecycle including escalation-to-closure with state-machine semantics, (4) grant and revoke time-boxed compliance exceptions with mandatory justification, and (5) assign accountability for compliance scores at the project level. All features are anchored to the existing slug-based PBAC system, the `compliance_officer` session role guard, and the evidence/audit infrastructure already present in the Frontend.

---

## Enforcement Logic

### On Task Execution
| Rule Type | Behavior |
|---|---|
| **BLOCK** | Task cannot be marked complete; submit button disabled; toast error shown |
| **WARN** | Task can proceed; yellow banner displayed; violation auto-created at `WARNING` severity |
| **REQUIRE_APPROVAL** | Task enters `pending_compliance_approval` state; Compliance Officer must approve before TL can mark done |
| **AUTO_FLAG** | Task completes normally; a violation record is automatically created for async review |

### On Workflow Transitions
| Rule Type | Behavior |
|---|---|
| **BLOCK** | Stage transition is prevented; `blocked_by_compliance` flag written to the workflow step; PM and TL notified |
| **WARN** | Transition proceeds; compliance warning appended to the step audit entry |
| **REQUIRE_APPROVAL** | Workflow enters `compliance_hold` sub-state; next stage gate cannot open until CO approves |
| **AUTO_FLAG** | Transition succeeds; system creates a `detect` violation referencing the workflow step |

### On Permissions
| Scenario | Behavior |
|---|---|
| Expired temporary exception | Permission reverts to rule default; any active task under that exception gets `WARN` flag |
| CO-issued block on a user | `compliance.user.restricted` slug activates; user's task-complete actions are disabled system-wide |
| Conflicting rules | Higher severity rule wins; lower rule logged as `suppressed` in audit trail |

---

## Feature Specification Table

| # | Feature Name | Description | Module | Required Permission (slug) | UI Page / Component | Difference vs Other Roles | Justification |
|---|---|---|---|---|---|---|---|
| 1 | **Compliance Rule Authoring & Versioning** | Create, edit, and version-control compliance rules. Each save creates a new immutable version (v1, v2…). CO can activate/deactivate any version. Fields: name, policy framework (GDPR/SOX/ISO/HR/Finance/Security/Internal), description, severity (Low/Medium/High/Critical), category, deadline-to-comply (days), escalation threshold (days). Enforced via toggle controls for BLOCK, WARN, REQUIRE_APPROVAL, AUTO_FLAG. | Policy | `compliance.rules.create` `compliance.rules.edit` `compliance.rules.version` | `compliance_rules.html` — enhanced with version drawer panel on existing table row | Super Admin: creates system config globally. HR: creates role assignments. **CO uniquely creates domain-specific rules that gate workflow behavior with force** — no other role can author enforcement rules. | Without versioning, rule changes silently overwrite history. Real-world compliance (SOX, GDPR) requires demonstrating *which rule version* was active at time of a violation for audit defensibility. |
| 2 | **Rule-to-Workflow Step Injection** | Attach one or more compliance rules to specific steps inside any published workflow. CO selects a workflow, picks a step by name, attaches a rule and sets enforcement type (BLOCK/WARN/REQUIRE_APPROVAL/AUTO_FLAG). The injection is stored as a `workflow_step_rule` binding. When the step is reached during execution, the rule fires against the task's current state. | Enforcement | `compliance.workflow.inject` | `compliance_rules.html` — new "Attach to Workflow" modal triggered from rule row action button | Super Admin: builds workflows. TL: executes steps. **CO is the only role that can inject compliance checkpoints into existing published workflows without rebuilding them** — a non-destructive enforcement layer. | Workflow steps currently have no native compliance gate. Without injection, CO can only react to violations after the fact rather than preventing them at source. |
| 3 | **Task Compliance Flag & Block** | Annotate any task in any project as compliance-flagged. CO can choose flag severity: INFO, WARN, or BLOCK. BLOCK renders the task's submit button inactive for the assignee. All flag events are written to the audit log with CO identity, timestamp, and reason. Unflagging requires CO action plus a reason entry. | Enforcement | `compliance.task.flag` `compliance.task.block` | New: `compliance_task_control.html` — searchable task list with flag/block action column | TM: executes tasks. TL: approves tasks. PM: assigns tasks. **CO is the only role that can externally freeze a task in mid-execution without reassigning it or modifying the workflow** — surgical compliance control. | Edge case: a task may be near-complete but discovered to violate a rule introduced after its start. CO needs to freeze it without disrupting the broader workflow topology. |
| 4 | **Violation State Machine Management** | Manage the full lifecycle of each violation: `CREATED → DETECTED → UNDER_INVESTIGATION → RESOLVED → ESCALATED → CLOSED`. CO drives all state transitions. Each transition requires a reason field (mandatory, min 10 chars). State history is stored as an ordered log per violation. Only CO can move from `ESCALATED` to `CLOSED`. Status timestamps are immutable once written. | Violation Lifecycle | `compliance.violations.manage` `compliance.violations.escalate` `compliance.violations.close` | `compliance_violations.html` — enhanced detail pane with state-transition buttons replacing current flat Escalate/Resolve buttons | TL: can mark tasks done (resolves operational status). PM: can escalate to management. **CO owns the compliance-specific state machine independently of task/workflow status — a violation can be OPEN even after a task is marked done.** | Current implementation has only Escalate and Mark Resolved with no state history. Regulators require proof of investigation steps; a flat two-button model provides no audit trail of the investigative process. |
| 5 | **Multi-Evidence Validation & Linkage** | Accept multiple evidence files per violation or workflow step. Validate: file type whitelist (PDF, PNG, JPG, XLSX, DOCX), max 10 MB per file, max 5 files per submission. Evidence is linked to both its source violation ID and the specific workflow step ID. CO can reject individual files with a rejection reason (stored in audit log). Accepted evidence is tagged `verified` and becomes immutable. | Evidence Management | `compliance.evidence.validate` `compliance.evidence.reject` `compliance.evidence.link` | `compliance_evidence.html` — enhanced with per-file validation status, rejection reason input, and workflow-step linkage selector | TM: submits evidence. TL: reviews evidence at task level. **CO validates against regulatory standards (type/size/completeness) and creates cross-links between evidence and both violations AND workflow steps** — a deeper traceability layer no other role performs. | Current evidence page has no file-type or size validation. A 50-page PDF and a corrupted file look identical in the queue. Regulatory audits require evidence integrity guarantees. |
| 6 | **Compliance Exception Granting** | Grant a time-limited exception to a specific user or team for a specific rule. Exception fields: target user/team, rule, start date, end date (max 90 days), justification (mandatory free text), approver identity (CO). During the exception window, the rule's enforcement type downgrades to WARN only for the selected scope. Exception expiry is auto-detected; upon expiry, original enforcement type is reinstated and a log entry is created. | Exception Handling | `compliance.exception.grant` `compliance.exception.revoke` | New: `compliance_exceptions.html` — table of active/expired exceptions with grant modal; link from Sidebar | Super Admin: grants system-level access. HR: grants role overrides. **CO grants domain-specific rule exceptions that are time-boxed, scoped, and automatically expire — no other role can create exceptions to compliance enforcement rules.** | Without formal exception tracking, teams verbally agree to defer a rule, leaving no audit evidence. Regulators require documented exception authorization chains. |
| 7 | **Project Compliance Score & Status Assignment** | Assign a compliance score (0–100) and status label (Compliant / At Risk / Non-Compliant) to each project. Score is auto-calculated: 100 − (open violations × severity weight) but CO can manually override with a written reason. Score is displayed on the project card visible to PMs. Status label drives dashboard badge color. CO can attach a compliance note to any project (max 500 chars). | Cross-Module (Projects) | `compliance.project.score` `compliance.project.annotate` | New: `compliance_projects.html` — project list with score badge and override controls | PM: manages project timeline/resources. **CO is the only role that can publish an external compliance rating that is visible to other roles and affects governance decisions — a public accountability signal.** | Currently compliance score on the dashboard is a single system-wide number with no per-project breakdown. PMs have no visibility into which projects are compliance risks until a violation fires. |
| 8 | **User Accountability Assignment** | Assign a named compliance accountability owner (from any role) to a specific rule or violation. The assigned user receives a system notification and their profile gains a `compliance_accountable` tag for that rule/violation scope. CO can reassign at any time. Accountability assignments are listed on the user's profile view visible to HR and Super Admin. | Cross-Module (Users) | `compliance.accountability.assign` | `compliance_violations.html` — Responsible PM and Team Leader fields converted from display labels to editable dropdowns with save action | HR: assigns role-level permissions. **CO can assign compliance-specific accountability that transcends organisational hierarchy — a TM can be made accountable for a rule even if their TL is technically responsible.** | Current violations show "PM: Arjun Mehta" as static display text. There is no mechanism to formally assign, notify, or track accountability, making it unenforceable. |
| 9 | **Duplicate Violation Detection & Merge** | Before creating a new violation, the system checks for open violations on the same rule + project + workflow step combination (within 30-day window). If a match exists, CO is shown a conflict dialog offering: create anyway (new record), merge into existing (append description), or dismiss. Merged violations carry a `merged_from: [id]` reference. Dismissed violations are logged as `suppressed` with CO identity. | Violation Lifecycle / Edge Cases | `compliance.violations.create` `compliance.violations.merge` | `compliance_violations.html` — conflict resolution modal on violation creation flow | No other role creates violations. **CO uniquely manages the de-duplication logic to prevent regulatory double-counting and maintain clean violation records.** | Without de-dup, the same missed SOX deadline could generate 7 violations (one per day of polling), inflating the violation count and distorting compliance scoring. |
| 10 | **Time-Based Escalation Rules** | Configure auto-escalation triggers on any rule: if a violation in state `CREATED` or `UNDER_INVESTIGATION` is not advanced within N days, it auto-transitions to `ESCALATED` and sends a notification to Super Admin. CO sets N per rule (default: 7 days). Escalation events are immutable audit entries. CO can disable auto-escalation per rule with a written justification. | Enforcement / Edge Cases | `compliance.escalation.configure` | `compliance_rules.html` — escalation configuration section within rule detail drawer | Super Admin: system-level escalation triggers. TL: task deadline escalation. **CO configures compliance-domain escalation timers that are independent of task deadlines — a violation can auto-escalate even if no task is past due.** | Current escalation is manual (button click). Violations that are created and then ignored — a known edge case — have no automated pressure mechanism. |
| 11 | **Immutable Compliance Audit Export** | Export the compliance audit log as a cryptographically signed CSV/PDF. Each export record includes: timestamp, actor, action, entity type, entity ID, old state, new state, and session token hash. CO selects date range, policy filter, and project filter. Export is itself logged as an audit event (who exported, when, what filters). Exported files cannot be deleted through the UI. | Audit & Traceability | `compliance.audit.export` `compliance.audit.sign` | `compliance_audit_log.html` — enhanced Export button with filter dialog and download-with-hash confirmation modal | Super Admin: can export any system log. **CO's export is compliance-grade: it includes state-change diffs, session provenance, and is itself audit-recorded — making it legally defensible in a way a standard CSV download is not.** | Current export button has no filter, no state-diff column, and no self-logging. A regulatory auditor receiving this file has no way to verify it hasn't been tampered with. |
| 12 | **Conflicting Rule Resolution** | When two rules attached to the same workflow step have conflicting enforcement types (e.g., Rule A = BLOCK, Rule B = WARN), CO is alerted via a dashboard badge. CO enters the conflict resolution panel, reviews both rules, and designates one as the active rule for that step. The suppressed rule is logged with `conflict_suppressed_by: [active_rule_id]`. Unresolved conflicts default to the higher-severity rule automatically. | Enforcement / Edge Cases | `compliance.rules.conflict.resolve` | `compliance_dashboard.html` — new Conflicts card in Metrics Grid; `compliance_rules.html` — Conflicts tab in rule table toolbar | No other role manages rule precedence. **CO is the sole arbiter of conflicting enforcement signals — Super Admin cannot override this since it is a domain-specific compliance judgment call.** | Without resolution, step injection conflicts silently default to the highest severity (BLOCK), which can freeze workflows unexpectedly. CO must own this conflict surface to prevent unintended operational disruption. |
| 13 | **Compliance Health Report with Trend Analysis** | Generate a compliance health report showing: violation rate trend (weekly), rule activation vs. breach ratio per department, top 3 at-risk projects, evidence rejection rate, and exception grant frequency. Report renders as visual cards + table in the UI and can be exported (PDF/XLSX/CSV). Trend data spans up to 90 days. CO can schedule recurring report generation (weekly/monthly) with email-style notification stub. | Reporting | `compliance.reports.health` `compliance.reports.schedule` | `compliance_reports.html` — new "Health Report" report type card added to existing report type grid | HR: workforce analytics. PM: project analytics. **CO's health report aggregates compliance-specific signals that exist in no other report type in the system — it is the only cross-module compliance trend view.** | Current reports are static snapshots (Summary, Violations, Audit Trail, Evidence Log). There is no trend view across time, no department-level breakdown, and no predictive at-risk indicator. |
| 14 | **Compliance Hold Workflow Gate** | Issue a formal Compliance Hold on any active workflow, preventing any new stage transitions until the hold is lifted. Hold reasons are mandatory. The hold state is visible to PMs and TLs as a banner on the workflow view. Only CO can lift the hold, and must record a resolution note. While on hold, evidence can still be submitted but tasks cannot change status. Holds are time-stamped and logged as a new audit event type `COMPLIANCE_HOLD`. | Enforcement / Workflow | `compliance.workflow.hold` `compliance.workflow.hold.lift` | New: `compliance_hold_center.html` — active holds list with issue/lift controls; hold banner injected into PM workflow view | Super Admin: can pause workflows via system config. **CO's hold is domain-specific, reversible only by CO, and carries a formal paper trail separate from admin pause actions — it is a compliance-law instrument, not an operational pause.** | Currently a CO discovering a live GDPR breach on a running workflow has no mechanism to freeze it. They can flag a violation, but the workflow proceeds unchecked. This closes the most critical enforcement gap. |

---

## New Pages Required (Not Yet Built)

| Page File | Purpose | Route |
|---|---|---|
| `compliance_task_control.html` | Task flag/block management | `admin/compliance/compliance_task_control.html` |
| `compliance_exceptions.html` | Exception grant/revoke/track | `admin/compliance/compliance_exceptions.html` |
| `compliance_projects.html` | Per-project compliance score & notes | `admin/compliance/compliance_projects.html` |
| `compliance_hold_center.html` | Active workflow holds management | `admin/compliance/compliance_hold_center.html` |

## Enhanced Existing Pages

| Page File | Enhancement Required |
|---|---|
| `compliance_rules.html` | Version drawer, Attach-to-Workflow modal, Conflicts tab, Escalation config section |
| `compliance_violations.html` | State machine buttons (7-state), Duplicate-check on create, Accountability assignment dropdowns |
| `compliance_evidence.html` | Per-file type/size validation UI, Rejection reason input, Workflow step linkage selector |
| `compliance_audit_log.html` | Filter dialog on Export, State-diff column, Self-logging confirmation modal |
| `compliance_reports.html` | Health Report card in report type grid, Schedule recurring toggle |
| `compliance_dashboard.html` | Conflicts metric card in metrics grid |

## New Permission Slugs Required

```
compliance.rules.create
compliance.rules.edit
compliance.rules.version
compliance.workflow.inject
compliance.task.flag
compliance.task.block
compliance.violations.manage
compliance.violations.escalate
compliance.violations.close
compliance.violations.merge
compliance.evidence.validate
compliance.evidence.reject
compliance.evidence.link
compliance.exception.grant
compliance.exception.revoke
compliance.project.score
compliance.project.annotate
compliance.accountability.assign
compliance.escalation.configure
compliance.audit.export
compliance.audit.sign
compliance.rules.conflict.resolve
compliance.reports.health
compliance.reports.schedule
compliance.workflow.hold
compliance.workflow.hold.lift
compliance.user.restricted
```
