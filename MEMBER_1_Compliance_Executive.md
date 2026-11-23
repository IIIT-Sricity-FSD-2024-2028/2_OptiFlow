# Member 1: Compliance, Executive, Audit and Evidence

Estimate: 9-11 person-days. Part of the OptiFlow plan (see `00_MASTER_PLAN.md`). Waterfall: finish Phase B here, then wait for G3, then the Redux cycle.

## 1. Dependencies

- Waits for (Phase A only): A1, A4.
- Others wait for you: A7 (`openEvidenceFile`), `<AuditLogTable>` later (soft).
- Outside Phase A you depend on nobody; if you need a change in someone else's file, send the owner a note and carry on.

## 2. Files you own (edit only these)

Backend: `controllers|routes` for compliance-*, executive, audit-logs; `services/compliance.service.js`; `services/storage.service.js`; `engine/`; `prisma/seeds/compliance.ts`. Frontend: `features/compliance/`, `features/executive/`, `features/audit/`.

## 3. Phase A tasks you own

- **A7 `openEvidenceFile(id)` helper**: Fetch an evidence file with the Authorization header and open it as a blob, in `react_frontend/src/utils/evidenceFile.js`, with no store or client dependency. Five pages put the login token in a URL; they all switch to this one helper. (Done)

## 4. Security fixes (16)

**SEC-M1-01** · Critical · Open
**Evidence files are public**
- Problem: `/uploads` is served by `express.static` with no login (`app.js:50`), so anyone with a file URL can read any tenant's evidence.
- Solution: Serve files only through `GET /evidence/:id/file` with tenant and role checks (D-S7); make sure every page uses it; Member 2 removes the static mount in Phase C.
- Why: A guessed or leaked URL currently exposes another company's documents.
- Files: `compliance-evidence.controller.js, services/storage.service.js`

**SEC-M1-02** · Critical · Open
**Any file type can be uploaded (stored XSS)**
- Problem: `ALLOWED_MIME_TYPES` is declared but never used, so an HTML or SVG upload is later served from the app's own origin.
- Solution: Enforce the allow-list from D-S7 on extension and detected type; send files as attachments with `X-Content-Type-Options: nosniff`.
- Why: Served HTML on the app origin can steal logged-in sessions.
- Files: `compliance-evidence.controller.js, routes`

**SEC-M1-05** · Critical · Open
**Evidence can be approved by its own submitter**
- Problem: Any Team Leader or Project Manager can approve evidence including their own, which also auto-resolves the violation and escalation.
- Solution: Apply D-S4: reviewer must differ from submitter and hold a reviewer role for that task or project; reject otherwise with 403.
- Why: Self-approval defeats the compliance control the evidence exists for.
- Files: `compliance-evidence.controller.js (updateEvidence)`

**SEC-M1-03** · High · Open
**Evidence can be swapped after approval**
- Problem: `uploadEvidenceFile` does not check who uploads or the evidence status, so a file can be replaced after approval.
- Solution: Only the submitter may upload and only while status is Pending.
- Why: An approved record must not change silently.
- Files: `compliance-evidence.controller.js (uploadEvidenceFile)`

**SEC-M1-04** · High · Open
**Evidence read and create have no scope**
- Problem: `getEvidenceById` and the file stream skip the role scope the list applies; `createEvidence` does not check the task is in the caller's scope.
- Solution: Reuse the list's scope rule in get, stream and create.
- Why: Direct URLs bypass the filtering the list does.
- Files: `compliance-evidence.controller.js`

**SEC-M1-06** · High · Open
**Approved-to-Rejected does not reopen the violation**
- Problem: Changing evidence from Approved to Rejected leaves the violation resolved and the task unblocked.
- Solution: On rejection, reopen the linked violation and escalation.
- Why: Compliance state must follow the evidence decision both ways.
- Files: `compliance-evidence.controller.js`

**SEC-M1-08** · High · Open
**Submit-work leaves a bogus evidence row when upload fails**
- Problem: The page creates the evidence row (with the file name as `fileUrl`) first and uploads second; a failed upload leaves a fake approved-looking record.
- Solution: `POST /evidence` accepts the file in the same multipart request inside one transaction; the pages switch to it during the Redux cycle.
- Why: Two-step creation cannot be made safe on the client.
- Files: `compliance-evidence.controller.js, routes`

**SEC-M1-09** · High · Open
**Any user can write audit rows**
- Problem: `POST /audit-logs` has no role check, so a Team Member can forge audit entries (BD8).
- Solution: Remove the route if unused (the frontend does not call it) or limit it to system code.
- Why: An audit log that anyone can write to is not evidence.
- Files: `audit-logs.routes.js`

**SEC-M1-10** · High · Open
**Any approved evidence satisfies every rule**
- Problem: `checkEvidenceForTask` ends with `approvedEvidences.length > 0`, so one approved file passes all compliance rules for the task.
- Solution: Remove the fallback; only evidence linked to that rule or category counts.
- Why: The check currently proves nothing.
- Files: `services/compliance.service.js`

**SEC-M1-11** · High · Open
**Some rules can never be satisfied**
- Problem: Category rules need evidence linked to a violation; if no violation exists yet the task is blocked permanently.
- Solution: Allow task-level evidence to satisfy a category rule, or create the violation first; document which.
- Why: A permanent block stops legitimate work.
- Files: `services/compliance.service.js`

**SEC-M1-07** · Medium · Open
**Evidence delete is a silent hard delete**
- Problem: Evidence is removed with no audit row, and Team Leaders and Project Managers can delete approved evidence.
- Solution: Soft delete with an audit entry (D-S9); forbid deleting Approved evidence except for Owner and Compliance.
- Why: Deleted proof cannot be audited or recovered.
- Files: `compliance-evidence.controller.js`

**SEC-M1-12** · Medium · Open
**Only exact transitions and parent tasks are checked**
- Problem: Rules fire only on the exact `transitionTo` status and never on subtasks.
- Solution: Evaluate every transition into a restricted status and apply the rule scope to subtasks where the rule says so.
- Why: Work can bypass a rule by taking a different path.
- Files: `services/compliance.service.js`

**SEC-M1-13** · Medium · Open
**Engine ignores scope and picks logic by rule name**
- Problem: The engine includes deleted or cancelled tasks, ignores Team and Branch bindings, selects an evaluator by a substring of the rule name (for example 'assign'), hard-codes severity and never auto-resolves.
- Solution: Add an explicit `ruleType` to choose the evaluator; filter deleted tasks; honour binding scope; take severity from the rule; auto-resolve when the condition clears.
- Why: Renaming a rule must not change what it enforces.
- Files: `engine/compliance.engine.js`

**SEC-M1-14** · Medium · Open
**Engine creates its own database client and only runs on demand**
- Problem: It builds a separate `PrismaClient` and runs only when someone calls `run-engine`.
- Solution: Use the shared client and add a scheduled run (and run after task status changes).
- Why: A second connection pool leaks; manual-only checks miss violations.
- Files: `engine/compliance.engine.js`

**SEC-M1-15** · Medium · Open
**Executive metrics read unscoped lists**
- Problem: Executive metrics depend on lists that are not branch-scoped, so a Branch Manager can see company-wide figures.
- Solution: Compute metrics on the server with the caller's scope.
- Why: Dashboards leak across branches.
- Files: `executive.controller.js`

**SEC-M1-16** · Low · Open
**`alert()` in Billing**
- Problem: The Billing page uses `alert()` for invoice actions.
- Solution: Use the shared Toast.
- Why: Alerts block the page and cannot be tested.
- Files: `executive/pages/Billing.jsx`

## 5. Pre-Redux fixes (8)

**PRE-M1-01** · High · Done locally (not pushed)
**Create/update return full items (BD11)**
- Problem: Compliance rule, category, binding, violation and evidence responses lacked list fields (`_count`, `scopeName`, `entityName`, relations).
- Solution: One shared include per controller for list, create and update.
- Why: A Redux store can insert the response directly.
- Files: `compliance-*.controller.js`

**PRE-M1-02** · Medium · Open
**List endpoints cannot be filtered**
- Problem: Pages load every violation, binding and evidence row and filter in the browser.
- Solution: Add `taskId`, `entityId`, `projectId`, `ruleId` filters to the list endpoints.
- Why: Slices fetch only what a page needs; smaller payloads and less data exposed.
- Files: `compliance-*.controller.js`

**PRE-M1-03** · Medium · Open
**One shared audit table**
- Problem: Four pages call four URLs and re-implement the table (FD4).
- Solution: Presentational `<AuditLogTable>` plus normalisers for the three row shapes; props only.
- Why: One `auditLogs` slice can feed all four pages.
- Files: `features/audit/`

**PRE-M1-04** · Medium · Open
**Wrappers call missing routes (FD3)**
- Problem: `compliance.js` calls `/api/compliance` and `audit.js` guesses its base path.
- Solution: Rewrite against the real routes, keep exported names.
- Why: Thunks need correct URLs.
- Files: `services/api/compliance.js, audit.js`

**PRE-M1-05** · Medium · Done
**Token in evidence link (FD10)**
- Problem: `ReviewEvidenceModal` links `?token=<JWT>`.
- Solution: Use `openEvidenceFile`.
- Why: The token ends up in history and logs.
- Files: `compliance/components/ReviewEvidenceModal.jsx`

**PRE-M1-07** · Medium · Open
**Lint and oversized files**
- Problem: `Employees.jsx` 727 lines, `Dashboard.jsx` 609, unused variables.
- Solution: Fix lint, split into components, no behaviour change.
- Why: Smaller files convert with fewer conflicts.
- Files: `features/compliance, features/executive`

**PRE-M1-06** · Low · Open
**Bindings have no update**
- Problem: No update route exists.
- Solution: Documented as unsupported (delete and re-create); remove any edit control.
- Why: Slices must not expose operations the API lacks.
- Files: `compliance/pages/Bindings.jsx`

**PRE-M1-08** · Low · Open
**Seed and envelope**
- Problem: Compliance seed lives in the big seed file; some responses lack `message`.
- Solution: Move to `prisma/seeds/compliance.ts`; adopt `respond.js`.
- Why: Independent seed and consistent responses.
- Files: `prisma/seeds, controllers`

## 6. Redux cycle preview (Thunk pattern, starts after G3)

- Slices: complianceRules, complianceCategories, complianceBindings, complianceEvidence, complianceViolations, executive, auditLogs
- Custom thunks beyond generated CRUD: `resolveViolation`, `reviewEvidence` (approve/reject), `uploadEvidenceFile`, `runComplianceEngine`, `fetchExecutiveMetrics`
- Pages to convert: `features/compliance/*`, `features/executive/*`, new `features/audit/` (shared `<AuditLogTable>`, `AuditLogDetailModal`)
- Reads from others (generated selectors only): users, teams, tasks (read-only, through generated selectors)
- Pattern: form dispatches `createX/updateX/deleteX`, thunk calls API, store changes only on `fulfilled`; no server data in `useState`; `unwrap()` in forms; one test per mutation.

## 7. Definition of done (Phase B)

- Every item above is Done, or explicitly deferred with a reason Uday has accepted.
- For each fix there is a script or test that fails before and passes after (A6 scripts).
- List, create and update return the same item shape for every resource you own.
- Lint and `vite build` pass for the files you own; no behaviour change in refactors.
- No edits outside the files listed in section 2.
- Nothing pushed without Uday's permission.
