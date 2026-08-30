// js/utils/helpers.js
// ─────────────────────────────────────────
// PART 1: Legacy UI Helpers (Badges, Notifications)
// ─────────────────────────────────────────
function createBadge(text, colorClass) {
  return `<span class="badge ${colorClass}">${text}</span>`;
}

function processComplianceTags(compliances) {
  if (!Array.isArray(compliances)) return "";
  return compliances
    .map((c) => {
      if (typeof c !== 'string') return "";
      if (c.includes("SOX")) return createBadge(c, "purple");
      if (c.includes("ISO")) return createBadge(c, "yellow");
      return createBadge(c, "green");
    })
    .join("");
}

function processStageTags(stages) {
  if (!Array.isArray(stages)) return "";
  return stages.map((s) => createBadge(s, "gray")).join("");
}

function renderStatusTag(status) {
  if (status === "Active") return createBadge(status, "green");
  return createBadge(status, "gray");
}

function renderUsageBar(runs) {
  const max = 15;
  const pct = Math.min((runs / max) * 100, 100);
  return `
        <div class="progress-container">
            <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">${runs} uses</div>
    `;
}

function logout() {
  // Always clear the session!
  sessionStorage.removeItem("currentUser");
  window.location.href = "../login.html";
}

function openNewProcessModal() {
  // Default: navigate to process builder. Pages can override this.
  window.location.href = "process-builder.html";
}

// Legacy notification logic removed. Handled by sidebar.js.

// ─────────────────────────────────────────
// PART 2: PM Module Helpers
// ─────────────────────────────────────────

function unwrapApiListForCollections(res) {
  if (
    typeof window !== "undefined" &&
    window.TasksStore &&
    typeof window.TasksStore.unwrapApiList === "function"
  ) {
    return window.TasksStore.unwrapApiList(res);
  }
  let v = res;
  if (v && !Array.isArray(v) && typeof v === "object" && Array.isArray(v.data)) {
    v = v.data;
  }
  return Array.isArray(v) ? v : [];
}

/**
 * window.Helpers.getState()
 * ─────────────────────────
 * Fetches all 11 backend resource collections concurrently using
 * Promise.allSettled so that a single failing endpoint never wipes
 * the rest of the application state.
 *
 * All snake_case backend fields are mapped to camelCase before returning.
 * Every entity exposes both:
 *   • `id`  (string) — legacy alias used throughout older dashboard pages
 *   • a typed numeric PK alias (e.g. userId, taskId, projectId …)
 *
 * Endpoints consumed:
 *   GET /users                  → users[]
 *   GET /departments            → departments[]
 *   GET /roles                  → roles[]
 *   GET /projects               → projects[]
 *   GET /tasks                  → tasks[]
 *   GET /subtasks               → subtasks[]
 *   GET /escalations            → escalations[]
 *   GET /evidence               → evidence[]
 *   GET /audit-logs             → auditLogs[]
 */
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MOCK TEST ACTOR PRESET CONFIGURATION (SWAP ACTIVE_PRESET_KEY TO TEST ROLES)
 * ─────────────────────────────────────────────────────────────────────────────
 * To test the app as different multi-tenant users, set ACTIVE_PRESET_KEY:
 *
 *  • 'ACME_CEO'      : Acme Corp CEO (Full company visibility, create/resolve/report)
 *  • 'ACME_PM'       : Acme Corp Project Manager
 *  • 'ACME_TL'       : Acme Corp Team Leader
 *  • 'ACME_MEMBER1'  : Acme Corp Team Member (Role filtered: only assigned tasks, NO rule creation)
 *  • 'BETA_CEO'      : Beta LLC CEO (Isolated Beta LLC tenant data)
 *  • 'BETA_MEMBER'   : Beta LLC Team Member (Isolated Beta LLC team member data)
 */
window.TEST_ACTOR_PRESETS = {
  ACME_CEO:     { email: "ceo@acmecorp.com",     role: "superuser",          label: "Acme Corp CEO" },
  ACME_PM:      { email: "pm@acmecorp.com",      role: "project_manager",    label: "Acme Corp PM" },
  ACME_TL:      { email: "tl@acmecorp.com",      role: "team_leader",        label: "Acme Corp TL" },
  ACME_MEMBER1: { email: "member1@acmecorp.com", role: "team_member",        label: "Acme Corp Team Member 1" },
  BETA_CEO:     { email: "ceo@betallc.com",      role: "superuser",          label: "Beta LLC CEO" },
  BETA_MEMBER:  { email: "member1@betallc.com",  role: "team_member",        label: "Beta LLC Team Member" },
};

// Toggle active test preset here (or set to null to use standard login session)
// Set to null to use the real logged-in session. Set to a preset key (e.g. 'ACME_CEO') only for local dev testing.
window.ACTIVE_PRESET_KEY = null;

window.Helpers = window.Helpers || {};
window.Helpers.api = window.Helpers.api || {
  baseUrl: 'http://localhost:3000',

  async request(endpoint, method = 'GET', body = null, customHeaders = {}) {
    const preset = window.ACTIVE_PRESET_KEY && window.TEST_ACTOR_PRESETS[window.ACTIVE_PRESET_KEY];
    const sessionRaw = sessionStorage.getItem("currentUser");
    
    let role = preset ? preset.role : "guest";
    let userEmail = preset ? preset.email : null;
    let actorId = null;
    let companyId = null;
    let isPlatformAdmin = false;

    if (!preset && sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);
        role = session.role || "guest";
        userEmail = session.email;
        companyId = session.companyId;
        actorId = session.id ?? session.userId ?? null;
        if (role === 'platform_admin' || session.roleName === 'Platform_Admin') {
          isPlatformAdmin = true;
        }
      } catch (e) {
        console.warn("Failed to parse currentUser from sessionStorage");
      }
    }

    const tokenIdentifier = actorId || userEmail || 'acme-ceo-uuid';

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenIdentifier}`,
      'x-user-role': role,
      ...customHeaders
    };

    if (userEmail && !headers['x-user-email']) {
      headers['x-user-email'] = userEmail;
    }

    if (isPlatformAdmin) {
      if (!headers['x-platform-admin-id'] && actorId) {
        headers['x-platform-admin-id'] = String(actorId);
      }
    } else {
      if (companyId && !headers['x-company-id']) {
        headers['x-company-id'] = companyId;
      }
    }

    if (actorId && !headers["x-user-id"] && !isPlatformAdmin) {
      headers["x-user-id"] = String(actorId);
    }

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const data = await response.json();
          if (data.message) errorMsg = data.message;
        } catch (err) {}
        throw new Error(errorMsg);
      }

      const json = await response.json();
      if (json && typeof json.success === 'boolean' && 'data' in json) {
        return json.data;
      }
      return json;
    } catch (error) {
      console.error(`API Request Failed [${method} ${endpoint}]:`, error);
      throw error;
    }
  }
};

let _stateCacheVal = null;
Object.defineProperty(window.Helpers, '_stateCache', {
  get() {
    return _stateCacheVal;
  },
  set(val) {
    _stateCacheVal = val;
    if (val === null) {
      sessionStorage.removeItem("officesync_global_state");
      sessionStorage.removeItem("officesync_global_state_time");
    }
  },
  configurable: true,
  enumerable: true
});

Object.assign(window.Helpers, {
  _statePromise: null,

  async getState(forceRefresh = false) {
    const CACHE_KEY = "officesync_global_state";
    const CACHE_TIME_KEY = "officesync_global_state_time";
    const CACHE_TTL = 30000; // 30 seconds TTL

    if (forceRefresh) {
      window.Helpers._stateCache = null;
      this._statePromise = null;
    }

    if (!forceRefresh) {
      const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedTime && cachedData && (Date.now() - Number(cachedTime) < CACHE_TTL)) {
        try {
          const parsed = JSON.parse(cachedData);
          _stateCacheVal = parsed;
          return parsed;
        } catch (e) {
          console.warn("Failed to parse cached state, refetching...");
        }
      }
    }

    if (window.Helpers._stateCache) {
      return window.Helpers._stateCache;
    }
    if (this._statePromise) {
      return this._statePromise;
    }

    this._statePromise = (async () => {
      try {
        const sessionRaw = sessionStorage.getItem('currentUser');
        let isScopedExecutiveContext = false;
        if (sessionRaw) {
          try {
            const s = JSON.parse(sessionRaw);
            isScopedExecutiveContext = window.ExecutiveBranchSwitcher
              ? window.ExecutiveBranchSwitcher.hasScopedExecutiveAccess(s)
              : false;
          } catch { /* ignore */ }
        }

        const branchQuery =
          isScopedExecutiveContext &&
          window.ExecutiveBranchSwitcher &&
          typeof window.ExecutiveBranchSwitcher.buildQueryString === 'function'
            ? window.ExecutiveBranchSwitcher.buildQueryString()
            : '';

        const ENDPOINTS = [
          '/users',                  // 0
          `/tasks${branchQuery}`,                  // 1
          `/projects${branchQuery}`,               // 2
          '/escalations',            // 3
          '/evidence',               // 4
          '/branches',               // 5
          '/roles',                  // 6
          '/subtasks',               // 7
          '/audit-logs',             // 8
          '/compliance-rules',       // 9
          `/compliance-violations${branchQuery}`,  // 10
          '/users/roles/mapping',    // 11
          '/process-instances',      // 12
          '/process-templates',      // 13
          '/process-instance-steps', // 14
          '/teams',                  // 15
          '/notifications',          // 16
          '/compliance-categories',  // 17
          '/compliance-bindings',    // 18
        ];

        const settled = await Promise.allSettled(
          ENDPOINTS.map((ep) => this.api.request(ep))
        );

        const unwrap = (result) => {
          if (result.status === "fulfilled") return unwrapApiListForCollections(result.value);
          return [];
        };

    const [
      rawUsers,                  // 0
      rawTasks,                  // 1
      rawProjects,               // 2
      rawEscalations,            // 3
      rawEvidence,               // 4
      rawBranches,               // 5
      rawRoles,                  // 6
      rawSubtasks,               // 7
      rawAuditLogs,              // 8
      rawComplianceRules,        // 9
      rawViolations,             // 10
      rawRoleAssignments,        // 11 ← renamed from rawUserRoles
      rawProcessInstances,       // 12
      rawProcessTemplates,       // 13
      rawProcessInstanceSteps,   // 14
      rawTeams,                  // 15
      rawNotifications,          // 16
      rawComplianceCategories,   // 17
      rawComplianceBindings,     // 18
    ] = settled.map((r, i) => unwrap(r, ENDPOINTS[i]));

    // ── 2. Map each collection using ACTUAL backend camelCase field names ──────

    // ── Roles ─────────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, label, isSystem, companyId, createdAt }
    const roles = rawRoles.map((r) => ({
      id:          String(r.id),
      roleId:      r.id,
      name:        r.label       || '',
      roleName:    r.label       || '',
      label:       r.label       || '',
      description: r.description || '',
      isSystem:    r.isSystem    || false,
      createdAt:   r.createdAt   || null,
    }));

    // ── Role Assignments ──────────────────────────────────────────────────────
    // Backend (Prisma): { id, userId, roleId, scopeType, scopeId, grantedAt, role:{id,label}, user:{id,fullName} }
    const userRoles = rawRoleAssignments.map(ra => ({
      id:         ra.id,
      userId:     ra.userId,
      roleId:     ra.roleId,
      roleLabel:  ra.role ? ra.role.label : null,
      scopeType:  ra.scopeType || null,
      scopeId:    ra.scopeId   || null,
      grantedAt:  ra.grantedAt || null,
    }));

    // ── Branches ──────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, name, companyId, createdAt }
    const branches = rawBranches.map((b) => ({
      id:        String(b.id),
      branchId:  b.id,
      name:      b.name || '',
      head:      'Branch Head',
      companyId: b.companyId || null,
      createdAt: b.createdAt || null,
    }));
    // Legacy alias
    const departments = branches.map(b => ({ ...b, departmentId: b.id, departmentName: b.name }));

    // ── Teams ─────────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, name, branchId, createdAt, branch:{id,name} }
    const teams = rawTeams.map((t) => ({
      id:        String(t.id),
      teamId:    t.id,
      name:      t.name     || '',
      teamName:  t.name     || '',
      branchId:  t.branchId || null,
      createdAt: t.createdAt || null,
    }));

    // ── Users ─────────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, companyId, fullName, email, managerUserId, createdAt }
    const users = rawUsers.map((u) => {
      // Find this user's primary role assignment
      const ra = userRoles.find(r => r.userId === u.id);
      const roleLabel = ra ? ra.roleLabel : null;
      // Map role label to frontend role slug — covers all common variants
      const roleLabelMap = {
        // Owner / CEO variants
        'Owner': 'superuser',
        'Company Owner': 'superuser',
        'CEO': 'superuser',
        'CTO': 'superuser',
        'COO': 'superuser',
        'Superuser': 'superuser',
        // Project Manager
        'Project Manager': 'project_manager',
        'PM': 'project_manager',
        // Team Leader variants
        'Team Leader': 'team_leader',
        'Team Lead': 'team_leader',
        'TL': 'team_leader',
        // Team Member
        'Team Member': 'team_member',
        // HR variants
        'HR Manager': 'hr_manager',
        'HR Admin': 'hr_manager',
        'HR': 'hr_manager',
        'Access Governance': 'hr_manager',
        'Governance': 'hr_manager',
        // Compliance
        'Compliance Officer': 'compliance_officer',
        'Compliance': 'compliance_officer',
        // Process Admin
        'Process Admin': 'project_manager',
      };
      const roleSlug = roleLabelMap[roleLabel] || (roleLabel ? roleLabel.toLowerCase().replace(/ /g,'_') : 'team_member');

      const teamObj = teams.find(t => t.id === u.teamId);
      const branchObj = branches.find(b => b.id === u.branchId);

      const initials = u.fullName
        ? u.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
        : '??';

      return {
        id:             String(u.id),
        userId:         u.id,
        fullName:       u.fullName      || 'Unknown User',
        email:          u.email         || '',
        roleId:         ra ? ra.roleId  : null,
        roleName:       roleSlug,
        roleLabel:      roleLabel,
        departmentId:   u.branchId      || null,
        departmentName: branchObj ? branchObj.name : null,
        teamId:         u.teamId        || null,
        teamName:       teamObj ? teamObj.name : null,
        managerId:      u.managerUserId || null,
        reportsTo:      u.managerUserId ? String(u.managerUserId) : null,
        phone:          u.phone         || '',
        isActive:       true,
        status:         'active',
        avatar:         initials,
        avatarColor:    'blue',
        createdAt:      u.createdAt     || null,
      };
    });

    // ── Projects ──────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, name, status, teamId, createdById, startDate, endDate, createdAt,
    //                     team:{id,name,branch:{id,name,companyId}}, tasks[], escalations[] }
    const projects = rawProjects.map((p) => {
      const projectTasks = p.tasks || rawTasks.filter(t => t.projectId === p.id);
      const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
      const progressPct = projectTasks.length > 0
        ? Math.round((completedTasks / projectTasks.length) * 100)
        : 0;
      const companyId = p.team && p.team.branch ? p.team.branch.companyId : null;
      const teamName  = p.team ? p.team.name : null;
      const branchId  = p.team && p.team.branch ? p.team.branch.id : null;
      const branchName = p.team && p.team.branch ? p.team.branch.name : null;

      return {
        id:           String(p.id),
        projectId:    p.id,
        name:         p.name          || '',
        projectName:  p.name          || '',
        description:  p.description   || '',
        teamId:       p.teamId        || null,
        teamName:     teamName,
        branchId:     branchId,
        branchName:   branchName,
        companyId:    companyId,
        departmentId: p.teamId        || null,   // legacy alias used in some pages
        status:       p.status        || 'Active',
        progress:     progressPct,
        startDate:    p.startDate     || null,
        endDate:      p.endDate       || null,
        createdBy:    p.createdById   || null,
        createdAt:    p.createdAt     || null,
      };
    });

    // ── Tasks ─────────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, title, description, status, priority, projectId, companyId,
    //                     assignedToId, createdById, dueDate, estimatedHours, actualHours,
    //                     completedAt, createdAt, assignedTo:{id,fullName}, project:{id,name} }
    const tasks = rawTasks.map((t) => {
      const assigneeName = t.assignedTo ? t.assignedTo.fullName : 'Unassigned';
      const projectName  = t.project ? t.project.name : 'General';
      const branchId     = t.project?.team?.branch?.id || null;
      const branchName   = t.project?.team?.branch?.name || null;
      return {
        id:             String(t.id),
        taskId:         t.id,
        title:          t.title          || '',
        description:    t.description    || '',
        projectId:      t.projectId      || null,
        projectName:    projectName,
        branchId:       branchId,
        branchName:     branchName,
        createdBy:      t.createdById    || null,
        assignedTo:     t.assignedToId   || null,
        assigneeName:   assigneeName,
        assignedUserId: t.assignedToId   ? String(t.assignedToId) : null,
        priority:       t.priority       || 'Medium',
        status:         t.status         || 'Draft',
        estimatedHours: t.estimatedHours || 0,
        actualHours:    t.actualHours    || 0,
        dueDate:        t.dueDate        || null,
        completedAt:    t.completedAt    || null,
        createdAt:      t.createdAt      || null,
        overdue:        t.dueDate ? new Date(t.dueDate) < new Date() : false,
        subtasks:       t.subtasks       || [],
      };
    });

    // ── Subtasks ──────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, taskId, title, description, assignedToId, status, createdById,
    //                     estimatedHours, dueDate, completedAt, createdAt }
    const subtasks = rawSubtasks.map((s) => ({
      id:             String(s.id),
      subtaskId:      s.id,
      taskId:         s.taskId          || null,
      title:          s.title           || '',
      description:    s.description     || '',
      assignedTo:     s.assignedToId    || null,
      status:         s.status          || 'Draft',
      estimatedHours: s.estimatedHours  || 0,
      dueDate:        s.dueDate         || null,
      completedAt:    s.completedAt     || null,
      createdAt:      s.createdAt       || null,
    }));

    // ── Escalations ───────────────────────────────────────────────────────────
    // Backend (Prisma): { id, title, status, priority, blockerType, companyId, taskId, projectId,
    //                     reportedById, targetManagerId, createdAt, resolvedAt,
    //                     reportedBy:{id,fullName}, targetManager:{id,fullName} }
    const escalations = rawEscalations.map((e) => ({
      id:              String(e.id),
      escalationId:    e.id,
      taskId:          e.taskId            || null,
      projectId:       e.projectId         || null,
      reportedBy:      e.reportedById      || null,
      targetManagerId: e.targetManagerId   || null,
      title:           e.title             || '',
      description:     e.description       || '',
      blockerType:     e.blockerType       || '',
      priority:        e.priority          || 'Medium',
      status:          e.status            || 'Open',
      createdAt:       e.createdAt         || null,
      resolvedAt:      e.resolvedAt        || null,
    }));

    // ── Audit Logs ────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, entityId, entityType, action, performedById, createdAt, oldValue, newValue, ipAddress }
    const auditLogs = rawAuditLogs.map((l) => ({
      id:          String(l.id),
      logId:       l.id,
      entityId:    l.entityId       || null,
      entityType:  l.entityType     || '',
      action:      l.action         || '',
      performedBy: l.performedById  || null,
      performedAt: l.createdAt      || null,
      ipAddress:   l.ipAddress      || null,
      oldValue:    l.oldValue       || null,
      newValue:    l.newValue       || null,
    }));

    // ── Compliance Rules ──────────────────────────────────────────────────────
    // Backend (Prisma): { id, name, description, severity, companyId, categoryId, createdAt }
    const complianceRules = rawComplianceRules.map((r) => ({
      id:               String(r.id),
      ruleId:           r.id,
      name:             r.name             || '',
      ruleName:         r.name             || '',
      description:      r.description      || '',
      severity:         r.severity         || 'Medium',
      isActive:         true,
      categoryId:       r.categoryId       || null,
      createdAt:        r.createdAt        || null,
    }));

    // ── Compliance Violations ─────────────────────────────────────────────────
    // Backend (Prisma): { id, ruleId, entityType, entityId, status, severity, companyId,
    //                     reportedById, resolvedById, resolvedAt, createdAt }
    const complianceViolations = rawViolations.map((v) => {
      const rule = complianceRules.find(r => r.id === v.ruleId);
      const proj = projects.find(p => p.id === v.entityId && v.entityType === 'Project');
      return {
        id:                 String(v.id),
        violationId:        v.id,
        ruleId:             v.ruleId            || null,
        ruleName:           rule ? rule.name    : 'General Policy',
        entityId:           v.entityId          || null,
        entityType:         v.entityType        || '',
        projectName:        proj ? proj.name    : 'General',
        status:             v.status            || 'Open',
        severity:           v.severity          || 'Medium',
        detectedAt:         v.createdAt         || null,
        reportedBy:         v.reportedById      || null,
        resolvedBy:         v.resolvedById      || null,
        resolvedAt:         v.resolvedAt        || null,
        evidenceLabel:      v.status === 'Open' ? 'At Risk' : 'Compliant',
      };
    });

    // ── Evidence ──────────────────────────────────────────────────────────────
    // Backend (Prisma): { id, title, evidenceType, fileUrl, notes, status, companyId,
    //                     userId, taskId, violationId, reviewedById, createdAt, reviewedAt }
    const evidence = rawEvidence.map((e) => ({
      id:           String(e.id),
      evidenceId:   e.id,
      userId:       e.userId           || null,
      taskId:       e.taskId           || null,
      violationId:  e.violationId      || null,
      title:        e.title            || '',
      evidenceType: e.evidenceType     || 'Document',
      fileUrl:      e.fileUrl          || '',
      notes:        e.notes            || '',
      status:       e.status           || 'Pending',
      reviewedBy:   e.reviewedById     || null,
      submittedAt:  e.createdAt        || null,
      reviewedAt:   e.reviewedAt       || null,
    }));

    // ── Process Instances ─────────────────────────────────────────────────────
    // Backend (Prisma): { id, title, status, templateId, projectId, initiatedById, currentStepId, createdAt, completedAt }
    const processInstances = rawProcessInstances.map(w => ({
      id:            String(w.id),
      instanceId:    w.id,
      title:         w.title         || '',
      templateId:    w.templateId    || null,
      projectId:     w.projectId     || null,
      initiatedBy:   w.initiatedById || null,
      currentStepId: w.currentStepId || null,
      status:        w.status        || 'Draft',
      startedAt:     w.createdAt     || null,
      completedAt:   w.completedAt   || null,
    }));

    // ── Process Templates ─────────────────────────────────────────────────────
    // Backend (Prisma): { id, name, category, companyId, createdById, createdAt, updatedAt, compliance, steps[] }
    const processTemplates = rawProcessTemplates.map(t => ({
      id:            String(t.id),
      templateId:    t.id,
      name:          t.name          || '',
      category:      t.category      || 'General',
      department:    t.category      || 'General',
      stages:        t.steps ? t.steps.map(s => s.name) : [],
      steps:         t.steps         || [],
      totalStages:   t.steps ? t.steps.length : 0,
      description:   t.description   || '',
      compliance:    Array.isArray(t.compliance) ? t.compliance : [],
      runs:          t.instances ? t.instances.length : 0,
      status:        'Active',
      lastModified:  t.updatedAt ? this.formatDate(t.updatedAt) : (t.createdAt ? this.formatDate(t.createdAt) : 'Recently'),
      createdAt:     t.createdAt     || null,
      createdBy:     t.createdById   || null,
    }));

    // ── Process Instance Steps ────────────────────────────────────────────────
    // Backend (Prisma): { id, processInstanceId, templateStepId, assignedToId, status, remarks, createdAt }
    const processInstanceSteps = rawProcessInstanceSteps.map(s => ({
      id:              String(s.id),
      instanceStepId:  s.id,
      instanceId:      s.processInstanceId  || null,
      stepId:          s.templateStepId     || null,
      assignedTo:      s.assignedToId       || null,
      status:          s.status             || 'Pending',
      remarks:         s.remarks            || null,
      createdAt:       s.createdAt          || null,
    }));

    // ── Compliance Categories ─────────────────────────────────────────────────
    // Backend (Prisma): { id, name, description, companyId, ownerId, createdAt }
    const complianceCategories = rawComplianceCategories.map(c => ({
      name:        c.name || '',
      description: c.description || '',
      createdAt:   c.createdAt || null,
    }));

    const complianceBindings = rawComplianceBindings.map(b => ({
      id:                 String(b.id || b.bindingId),
      bindingId:          b.id || b.bindingId,
      ruleId:             b.ruleId,
      processTemplateId:  b.processTemplateId || null,
      branchId:           b.branchId || null,
      mandatory:          b.mandatory !== undefined ? b.mandatory : true,
      createdAt:          b.createdAt || null,
    }));

    const notifications = rawNotifications.map(n => ({
      id:             String(n.notification_id || n.id),
      notificationId: n.notification_id || n.id,
      userId:         n.user_id || n.userId,
      title:          n.title || '',
      message:        n.message || '',
      type:           n.type || 'System',
      isRead:         n.is_read || n.isRead || false,
      link:           n.link || '',
      createdAt:      n.created_at || n.createdAt || null,
    }));

    // ── 4. Assemble and return the unified application state ──────────────────
    return {
      users,
      userRoles,
      branches,
      departments,
      teams,
      roles,
      projects,
      tasks,
      subtasks,
      escalations,
      auditLogs,
      complianceRules,
      complianceViolations,
      complianceCategories,
      complianceBindings,
      evidence,
      processInstances,
      processTemplates,
      processInstanceSteps,
      workflowInstances: processInstances,
      workflowTemplates: processTemplates,
      workflowInstanceSteps: processInstanceSteps,
      notifications,
      // Legacy aliases for backward-compat with older dashboard pages
      complianceItems:    complianceViolations,
      activeViolations:   complianceViolations.filter((v) => v.status === 'Open'),
      complianceReports:  [],
    };

    // Save to sessionStorage cache
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(resObj));
      sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
    } catch (err) {
      console.warn("sessionStorage save failed:", err);
    }

    window.Helpers._stateCache = resObj;
    setTimeout(() => { window.Helpers._stateCache = null; }, 30000);
    return resObj;
      } finally {
        this._statePromise = null;
      }
    })();
    return this._statePromise;
  },

  /**
   * pushNotification(targetUserId, payload)
   * ─────────────────────────────────────────
   * The single, canonical way to send a notification to another user.
   * Persists to localStorage["system_notifications"] using targetUserId,
   * which is the exact field read by initNotifications() in the bell dropdown.
   *
   * @param {number|string} targetUserId - The numeric/string ID of the recipient.
   * @param {{ title: string, message: string, type?: string }} payload
   */
  async pushNotification(targetUserId, payload) {
    if (!targetUserId) return;
    try {
      await this.api.request('/notifications', 'POST', {
        user_id: Number(targetUserId),
        title: payload.title || 'Notification',
        message: payload.message || '',
        type: payload.type || 'System',
        link: payload.link || '#'
      });
    } catch (e) {
      console.error('[pushNotification] API failed:', e);
    }
  },

  async saveState(state) {
    // saveState is a legacy no-op. Use Helpers.pushNotification() for notifications
    // and Helpers.api.request() for API mutations.
    console.warn('[saveState] Deprecated — use Helpers.pushNotification() for notifications.');
  },

  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  },

  nextId(arr, idKey = "id") {
    return arr.length > 0
      ? Math.max(...arr.map((i) => parseInt(i[idKey]) || 0)) + 1
      : 1;
  },
  $id(id) {
    return document.getElementById(id);
  },
  $q(sel, ctx) {
    return (ctx || document).querySelector(sel);
  },
  $qa(sel, ctx) {
    return [...(ctx || document).querySelectorAll(sel)];
  },
  setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  },
  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },
  show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  },
  hide(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  },
  getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  },
  setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  },

  notifyApiError(err, fallbackMsg) {
    const msg =
      err && err.message
        ? String(err.message)
        : typeof fallbackMsg === "string" && fallbackMsg
          ? fallbackMsg
          : "Request failed.";
    const lower = msg.toLowerCase();
    let title = "Request failed";
    if (/\b403\b/.test(msg) || lower.includes("forbidden")) title = "Access denied";
    else if (/\b404\b/.test(msg) || lower.includes("not found")) title = "Not found";
    if (typeof window !== "undefined" && window.Toast && typeof window.Toast.error === "function") {
      window.Toast.error(title, msg);
    }
  },

  statusClass(status) {
    const map = {
      Active: "status-active",
      Completed: "status-done",
      Pending: "status-not-started",
      In_Progress: "status-in-progress",
      In_Review: "status-pending",
      Pending_TL_Review: "status-pending",
      Cancelled: "status-blocked",
      On_Hold: "status-at-risk",
      Draft: "badge-gray",
      Rejected: "status-violation",
      Open: "badge-red",
      Resolved: "status-verified",
      Under_Review: "badge-orange",
    };
    return map[status] || "badge-gray";
  },

  projectBorderClass(status) {
    const map = {
      Active: "border-blue",
      Completed: "border-green",
      On_Hold: "border-red",
    };
    return map[status] || "border-blue";
  },

  progressFill(status) {
    const map = {
      Active: "fill-blue",
      Completed: "fill-green",
      On_Hold: "fill-red",
    };
    return map[status] || "fill-blue";
  },

  formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },

  async log(action, entityType, entityId, oldValue = null, newValue = null) {
    try {
      await this.api.request('/audit-logs', 'POST', {
        action: action,
        entityType: entityType,
        entityId: String(entityId),
        oldValue: oldValue,
        newValue: newValue,
      });
    } catch (e) {
      console.warn('[AuditLog] API log creation failed:', e);
    }
  },

  async sendSystemNotification(targetUserId, title, message) {
    return this.pushNotification(targetUserId, { title, message, type: 'System' });
  },

  timeAgo(dateString) {
    if (!dateString) return "";
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return past.toLocaleDateString();
  }
});

// ─────────────────────────────────────────
// Global Modal Controls (Click Outside & Escape Key)
// ─────────────────────────────────────────
document.addEventListener('click', (e) => {
  if (e.target && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-overlay'))) {
    e.target.style.display = 'none';
    e.target.classList.remove('active');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop, .modal-overlay').forEach((el) => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
  }
});
