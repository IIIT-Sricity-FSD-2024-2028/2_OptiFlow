# Platform Admin Redesign — Execution Checklist

Based on `PLATFORM_ADMIN_AUDIT.md`. Items are ordered so that each phase unblocks the next. Do not start a phase until the previous phase's **Exit check** passes.

## Execution order at a glance

| Phase | Goal | Depends on |
|---|---|---|
| 0 | Cleanup and unblock (fix what is broken) | nothing |
| 1 | Shared foundations (list contract, audit log, session, shared UI) | Phase 0 |
| 2 | Core pages, built in this order: Plans → Companies → Subscriptions → Support access → Admin users → Audit log | Phase 1 |
| 3 | Dashboard and account pages | Phase 2 |
| 4 | Hardening (MFA, roles, jobs, tenant-side checks) | Phase 2 |

Why this order inside Phase 2: provisioning a company needs a plan to assign, so Plans come first. Subscription changes and support access both hang off a company, so Companies come before them. The audit log page comes last because every earlier page must already be writing to it.

## Decisions to confirm before the phases that need them

- [ ] **Plan pricing** (affects 2.1 and 3.1). Default: add nullable `priceMonthly`, `priceAnnual`, `currency` to Plan; no payment gateway yet.
- [ ] **First-owner credentials** (affects 2.2). Default: one-time set-password link, not an emailed temporary password.
- [ ] **Token storage** (affects 1.4). Default: httpOnly cookie instead of `sessionStorage`.
- [ ] **Platform roles** (affects 4.2). Default: two roles, `super_admin` and `support`, built in Phase 4. Skip if the team is tiny.

---

## Phase 0 — Cleanup and unblock

### 0.1 Delete dead code
- [ ] Delete `front-end/platform-admin/`
- [ ] Delete `front-end/react-app/` (throwaway shell)
- [ ] Delete `react_frontend/src/services/api/platform.js` (replaced in 1.7)

### 0.2 Fix the refresh-logout bug
- [ ] Use the single slug `platform_admin` in `roles.js`
- [ ] Update `router/index.jsx` guard to `allowedRoles={['platform_admin']}`
- [ ] Update `ProtectedRoute.jsx` and `RoleRedirect.jsx` to recognise `platform_admin`
- [ ] Remove the `role: 'system_admin'` override in `AuthContext.platformLogin`
- [ ] Make `restoreSession()` and login produce the same user shape

### 0.3 Fix Companies page defects
- [ ] Add leading slash to the single-company request (`/platform/companies/${id}`)
- [ ] Bind `Details` and `Edit` buttons with `onClick` using the row id
- [ ] Remove unused imports and state (`companies`, `setCompanies`, etc.)

### 0.4 Canonical API paths
- [ ] Keep only `/api/platform/*`
- [ ] Remove aliases: `/platform/*`, `/api/platform-admin-users`, `/platform-support-access`, `/api/platform-support-access`
- [ ] Update frontend calls and the test files (`test-step9.js`, `test-contract-audit.js`) to the canonical paths

### 0.5 Small backend bugs
- [ ] `createSubscription`: normalise billing cycle to `Monthly` / `Annual` (PascalCase)
- [ ] `updatePlan`: accept `maxActiveProcessTemplates`, `maxComplianceRules`, `auditLogRetentionDays`

### 0.6 Quality baseline
- [ ] Platform folders pass lint with zero errors

**Exit check:** refreshing any `/platform/*` page keeps the session; Company Details opens from the table; platform lint is clean; existing backend tests still pass.

---

## Phase 1 — Shared foundations

### Backend
- ['X'] **1.1 List contract.** Shared helper accepting `?page&pageSize&q&status`, returning `{ items, total, page, pageSize }`; enforce a max `pageSize`
- [ ] **1.2 Indexes.** `companies(status)`, `subscriptions(status, currentPeriodEnd)`, audit log `(createdAt)`, `(companyId)`, `(adminUserId)`
- [ ] **1.3 Platform audit log.**
  - [ ] `PlatformAuditLog` model: id, adminUserId, action, entityType, entityId, companyId (nullable), before JSON, after JSON, ip, createdAt
  - [ ] Migration
  - [ ] Single helper `writeAuditLog(req, action, entity, before, after)`; append-only, no update or delete path
- [ ] **1.4 Session handling.**
  - [ ] Shorten token lifetime
  - [ ] Token storage per the decision above
  - [ ] `POST /api/platform/auth/change-password`
- [ ] **1.5 Test environment.** Test database available so `test-step10.js` and `test-contract-audit.js` run in CI instead of failing on connection

### Frontend
- [ ] **1.6 Add TanStack Query** and `QueryClientProvider` in `main.jsx`
- [ ] **1.7 Rewrite `apiClient` and API modules.**
  - [ ] Auto-logout and redirect on 401
  - [ ] Consistent error shape surfaced to the UI
  - [ ] JSON-stringify request bodies
  - [ ] One API module per resource: `companies`, `plans`, `subscriptions`, `supportAccess`, `admins`, `auditLogs`, `metrics`
- [ ] **1.8 Shared components.**
  - [ ] Paginated `DataTable` wrapper (search, status filter, pager)
  - [ ] `ConfirmDialog`
  - [ ] `StatusBadge` with a status-to-colour map
  - [ ] Standard loading, empty and error blocks

**Exit check:** the Companies list runs on the new list contract with server-side pagination and search; a mutation writes an audit row; a 401 logs the user out.

---

## Phase 2 — Core pages (build in this order)

### 2.1 Plans
- [x] Backend: add `isActive` to Plan (migration)
- [x] Backend: `PATCH /plans/:id` covers all fields
- [x] Backend: archive action; block assigning an archived plan; no delete
- [x] Backend: pricing fields if confirmed
- [x] Backend: audit calls on create, update, archive
- [x] Frontend: list page with subscription count and limits
- [x] Frontend: create/edit drawer; "unlimited" input for null limits
- [x] Frontend: archive with `ConfirmDialog`

### 2.2 Companies
- [x] Backend: `POST /companies`, one transaction creating company + first owner user + subscription
- [x] Backend: set-password link for the owner (per the decision above)
- [x] Backend: list with pagination, search, status filter
- [x] Backend: `GET /companies/:id` returns subscription, user and branch counts, recent support grants
- [x] Backend: `PATCH` for legal name and status, with audit
- [x] Frontend: list page with search, status filter, pagination
- [x] Frontend: `/platform/companies/new` provisioning form (company, owner, plan)
- [x] Frontend: `/platform/companies/:id` with tabs Overview, Subscription, Support access, Activity
- [x] Frontend: suspend, reactivate and close behind `ConfirmDialog`

### 2.3 Subscriptions
- [x] Backend: `PATCH /subscriptions/:id` for plan, cycle, status, period end
- [x] Backend: enforce allowed status transitions (include `Trialing`)
- [x] Backend: list filters: status, past due, expiring within N days
- [x] Backend: audit calls
- [ ] Frontend: ops list page (links to company)
- [ ] Frontend: change plan/status/cycle action, also reachable from the company Subscription tab

### 2.4 Support access
- [x] Backend: add `revokedAt`, `revokedBy` (migration)
- [x] Backend: revoke endpoint replaces `DELETE`; record is never deleted
- [x] Backend: enforce minimum reason length; reject grants for closed companies
- [x] Backend: list filter for active, expired, revoked
- [x] Backend: audit calls on grant and revoke
- [x] Backend: **verify** that a grant is actually enforced on the tenant side (the audit does not show this)
- [ ] Frontend: list page with status filter
- [ ] Frontend: grant modal from the company page (reason, duration)
- [ ] Frontend: revoke with `ConfirmDialog`
- [ ] Frontend: action-log viewer

### 2.5 Admin users
- [x] Backend: remove `DELETE /admin-users/:id`
- [x] Backend: keep deactivate and the last-active-admin guard
- [x] Backend: reset-password endpoint
- [x] Backend: audit calls
- [ ] Frontend: list page
- [ ] Frontend: create/edit drawer
- [ ] Frontend: deactivate and reset password actions

### 2.6 Audit log
- [ ] Backend: `GET /platform/audit-logs` with filters: admin, company, entity, action, date range
- [ ] Frontend: `/platform/audit-log` read-only filterable page
- [ ] Frontend: company Activity tab reuses the same query filtered by company

**Exit check (each page):** loading, empty, error and unauthorized states render; mutations are confirmed where destructive; every mutation writes an audit row; backend tests cover the endpoints.

---

## Phase 3 — Dashboard and account

### 3.1 Dashboard
- [ ] Backend: extend `/platform/metrics` with `companiesByStatus`, `subscriptionsByStatus`, `pastDueCount`, `expiringSoon`, `activeGrants`, recent platform actions
- [ ] Frontend: remove the 5 shortcut cards
- [ ] Frontend: replace the "Platform Admins" stat with "Past due / expiring"
- [ ] Frontend: add an attention list and a recent-actions list
- [ ] Frontend: revenue figure only if pricing fields were confirmed

### 3.2 Account and shared pages
- [ ] Profile page with change password
- [ ] Remove the platform Notifications page and its nav item
- [ ] Real Unauthorized and NotFound pages

**Exit check:** dashboard numbers match the list pages; profile password change works end to end.

---

## Phase 4 — Hardening

- [ ] **4.1 TOTP MFA** for platform admins (enrol, verify at login, recovery codes)
- [ ] **4.2 Platform roles** (if confirmed): role field, `requirePlatformRole` middleware, hide restricted actions in the UI
- [ ] **4.3 Scheduled job:** move expired subscriptions to `PastDue`
- [ ] **4.4 Tenant visibility:** record platform support access in the tenant's own audit log
- [ ] **4.5 Tenant-side enforcement check:** confirm plan limits (REQ-SUB-02) and suspended/past-due blocking (REQ-SUB-04) are enforced on tenant routes
- [ ] **4.6 Scaling note:** move rate limiting from in-memory to a shared store only when running more than one backend instance

---

## Page definition of done (applies to every page above)

- [ ] Route registered under `/platform/*` and guarded by `platform_admin`
- [ ] Server-side pagination, search and filters where the list can grow
- [ ] Loading, empty, error and unauthorized states
- [ ] Destructive actions behind `ConfirmDialog`
- [ ] Every mutation writes a platform audit row
- [ ] Responsive at tablet width (table collapses to cards)
- [ ] Backend endpoint tests and a basic UI test for the main flow

## Deliberately deferred (do not build now)

Payment gateway and invoices, feature flags, per-tenant usage analytics, impersonation UI, announcements, webhooks, data export.
