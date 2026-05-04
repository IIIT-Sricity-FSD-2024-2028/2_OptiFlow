// js/utils/helpers.js
// ─────────────────────────────────────────
// PART 1: Legacy UI Helpers (Badges, Notifications)
// ─────────────────────────────────────────
function createBadge(text, colorClass) {
  return `<span class="badge ${colorClass}">${text}</span>`;
}

function processComplianceTags(compliances) {
  return compliances
    .map((c) => {
      if (c.includes("SOX")) return createBadge(c, "purple");
      if (c.includes("ISO")) return createBadge(c, "yellow");
      return createBadge(c, "green");
    })
    .join("");
}

function processStageTags(stages) {
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
  window.location.href = "workflow-builder.html";
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
 *   GET /compliance-rules       → complianceRules[]
 *   GET /compliance-violations  → complianceViolations[]
 */
window.Helpers = {
  async getState() {
    // 1. Concurrent fetch — perfectly aligned arrays
    const ENDPOINTS = [
      '/users',                  // 0
      '/tasks',                  // 1
      '/projects',               // 2
      '/escalations',            // 3
      '/evidence',               // 4
      '/departments',            // 5
      '/roles',                  // 6
      '/subtasks',               // 7
      '/audit-logs',             // 8
      '/compliance-rules',       // 9
      '/compliance-violations',  // 10
      '/user-roles',             // 11
      '/workflow-instances',     // 12
      '/workflow-templates',     // 13
      '/workflow-instance-steps',// 14
      '/teams',                  // 15
      '/notifications'           // 16
    ];

    const settled = await Promise.allSettled(
      ENDPOINTS.map((ep) => this.api.request(ep))
    );

    const unwrap = (result, endpoint) => {
      if (result.status === "fulfilled") return unwrapApiListForCollections(result.value);
      console.warn(`[getState] Failed to fetch ${endpoint}:`, result.reason?.message ?? result.reason);
      return [];
    };

    // Variables must perfectly match the index of the ENDPOINTS array above
    const [
      rawUsers,                  // 0 matches '/users'
      rawTasks,                  // 1 matches '/tasks'
      rawProjects,               // 2 matches '/projects'
      rawEscalations,            // 3 matches '/escalations'
      rawEvidence,               // 4 matches '/evidence'
      rawDepartments,            // 5 matches '/departments'
      rawRoles,                  // 6 matches '/roles'
      rawSubtasks,               // 7 matches '/subtasks'
      rawAuditLogs,              // 8 matches '/audit-logs'
      rawComplianceRules,        // 9 matches '/compliance-rules'
      rawViolations,             // 10 matches '/compliance-violations'
      rawUserRoles,              // 11 matches '/user-roles'
      rawWorkflowInstances,      // 12 matches '/workflow-instances'
      rawWorkflowTemplates,      // 13 matches '/workflow-templates'
      rawWorkflowInstanceSteps,  // 14 matches '/workflow-instance-steps'
      rawTeams,                  // 15 matches '/teams'
      rawNotifications,          // 16 matches '/notifications'
    ] = settled.map((r, i) => unwrap(r, ENDPOINTS[i]));

    console.log("DEBUG - RAW USERS:", rawUsers);
    console.log("DEBUG - RAW ROLES:", rawRoles);
    console.log("DEBUG - RAW USER-ROLES:", rawUserRoles);
    
    // ── 2. Static lookup: role slug → numeric roleId ──────────────────────────
    // Mirrors the seeded roles table in DatabaseService.
    const roleSlugToId = {
      superuser: 1, project_manager: 2, compliance_officer: 3,
      hr_manager: 4, team_leader: 5, team_member: 6,
    };

    // ── 3. Map each collection — NO object spreads; every field is explicit ───

    // ── Roles ─────────────────────────────────────────────────────────────────
    // Backend: { role_id, role_name, description, is_system, created_at }
    const roles = rawRoles.map((r) => ({
      id:          String(r.role_id),
      roleId:      r.role_id,
      name:        r.role_name    || '',
      roleName:    r.role_name    || '',
      description: r.description  || '',
      isSystem:    r.is_system    || false,
      createdAt:   r.created_at   || null,
    }));

    // ── User Roles Mapping ────────────────────────────────────────────────────
    const userRoles = rawUserRoles.map(ur => ({
      userId: String(ur.user_id),
      roleId: ur.role_id,
      assignedBy: ur.assigned_by || null,
      assignedAt: ur.assigned_at || null
    }));

    // ── Users ─────────────────────────────────────────────────────────────────
    // Backend: { user_id, full_name, email, password_hash, role,
    //            department_id, manager_id, is_active, created_at }
    const users = rawUsers.map((u) => {
      // Normalization Mapping: Attach roleName directly to the user object
      const ur = userRoles.find(ur => String(ur.userId) === String(u.user_id));
      const roleObj = ur ? roles.find(r => String(r.roleId) === String(ur.roleId)) : null;

      const teamObj = rawTeams.find(t => String(t.team_id) === String(u.team_id));

      const initials = u.full_name
        ? u.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2)
        : '??';
      return {
        id:           String(u.user_id),
        userId:       u.user_id,
        fullName:     u.full_name      || 'Unknown User',
        email:        u.email          || '',
        roleId:       roleObj ? roleObj.roleId : null,
        roleName:     roleObj ? roleObj.roleName : 'Team Member',
        departmentId: u.department_id  || null,
        teamId:       u.team_id        || null,
        teamName:     teamObj ? teamObj.team_name : null,
        managerId:    u.manager_id     || null,
        reportsTo:    u.manager_id     ? String(u.manager_id) : null,
        phone:        u.phone          || '',
        isActive:     u.is_active      !== undefined ? u.is_active : true,
        status:       u.is_active === false ? 'inactive' : 'active',
        avatar:       initials,
        avatarColor:  'blue',
        createdAt:    u.created_at     || null,
      };
    });

    // ── Departments ───────────────────────────────────────────────────────────
    // Backend: { department_id, department_name, manager_id, created_at }
    const departments = rawDepartments.map((d) => ({
      id:             String(d.department_id),
      departmentId:   d.department_id,
      name:           d.department_name || '',
      departmentName: d.department_name || '',
      managerId:      d.manager_id      || null,
      createdAt:      d.created_at      || null,
    }));

    // ── Teams ─────────────────────────────────────────────────────────────────
    const teams = rawTeams.map((t) => ({
      id:             String(t.team_id),
      teamId:         t.team_id,
      name:           t.team_name || '',
      teamName:       t.team_name || '',
      departmentId:   t.department_id || null,
      createdAt:      t.created_at || null,
    }));

    // ── Projects ──────────────────────────────────────────────────────────────
    // Backend: { project_id, project_name, description, department_id,
    //            status, start_date, end_date, created_by, created_at }
    const projects = rawProjects.map((p) => {
      const projectTasks = rawTasks.filter(t => t.project_id === p.project_id);
      const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
      const progressPct = projectTasks.length > 0 
        ? Math.round((completedTasks / projectTasks.length) * 100) 
        : 0;

      return {
        id:           String(p.project_id),
        projectId:    p.project_id,
        name:         p.project_name  || '',
        projectName:  p.project_name  || '',
        description:  p.description   || '',
        departmentId: p.department_id || null,
        status:       p.status        || 'Active',
        progress:     progressPct,
        startDate:    p.start_date    || null,
        endDate:      p.end_date      || null,
        createdBy:    p.created_by    || null,
        createdAt:    p.created_at    || null,
      };
    });

    // ── Tasks ─────────────────────────────────────────────────────────────────
    // Backend: { task_id, title, description, project_id, created_by,
    //            assigned_to, priority, status, estimated_hours,
    //            due_date, completed_at, created_at }
    // Note: actual_hours is NOT in the backend schema; omitted.
    const tasks = rawTasks.map((t) => {
      const proj = rawProjects.find(p => p.project_id === t.project_id);
      const user = rawUsers.find(u => u.user_id === t.assigned_to);
      return {
        id:             String(t.task_id),
        taskId:         t.task_id,
        title:          t.title          || '',
        description:    t.description    || '',
        projectId:      t.project_id     || null,
        projectName:    proj ? proj.project_name : 'General',
        createdBy:      t.created_by     || null,
        assignedTo:     t.assigned_to    || null,
        assigneeName:   user ? user.full_name : 'Unassigned',
        assignedUserId: t.assigned_to    ? String(t.assigned_to) : null,
        priority:       t.priority       || 'Medium',
        status:         t.status         || 'Pending',
        estimatedHours: t.estimated_hours || 0,
        dueDate:        t.due_date       || null,
        completedAt:    t.completed_at   || null,
        createdAt:      t.created_at     || null,
        overdue:        t.due_date ? new Date(t.due_date) < new Date() : false,
      };
    });

    // ── Subtasks ──────────────────────────────────────────────────────────────
    // Backend: { subtask_id, task_id, title, description, assigned_to,
    //            status, estimated_hours, due_date, completed_at, created_at }
    const subtasks = rawSubtasks.map((s) => ({
      id:             String(s.subtask_id),
      subtaskId:      s.subtask_id,
      taskId:         s.task_id         || null,
      title:          s.title           || '',
      description:    s.description     || '',
      assignedTo:     s.assigned_to     || null,
      status:         s.status          || 'Pending',
      estimatedHours: s.estimated_hours || 0,
      dueDate:        s.due_date        || null,
      completedAt:    s.completed_at    || null,
      createdAt:      s.created_at      || null,
    }));

    // ── Escalations ───────────────────────────────────────────────────────────
    // Backend: { escalation_id, task_id, project_id, reported_by,
    //            target_manager_id, title, description, blocker_type,
    //            priority, status, created_at, resolved_at }
    const escalations = rawEscalations.map((e) => ({
      id:              String(e.escalation_id),
      escalationId:    e.escalation_id,
      taskId:          e.task_id            || null,
      projectId:       e.project_id         || null,
      reportedBy:      e.reported_by        || null,
      targetManagerId: e.target_manager_id  || null,
      title:           e.title              || '',
      description:     e.description        || '',
      blockerType:     e.blocker_type       || '',
      priority:        e.priority           || 'Medium',
      status:          e.status             || 'Open',
      createdAt:       e.created_at         || null,
      resolvedAt:      e.resolved_at        || null,
    }));

    // ── Audit Logs ────────────────────────────────────────────────────────────
    // Backend: { log_id, entity_id, entity_type, action, performed_by,
    //            performed_at, ip_address, old_value, new_value }
    const auditLogs = rawAuditLogs.map((l) => ({
      id:          String(l.log_id),
      logId:       l.log_id,
      entityId:    l.entity_id       || null,
      entityType:  l.entity_type     || '',
      action:      l.action          || '',
      performedBy: l.performed_by    || null,
      performedAt: l.performed_at    || null,
      ipAddress:   l.ip_address      || null,
      oldValue:    l.old_value       || null,
      newValue:    l.new_value       || null,
    }));

    // ── Compliance Rules ──────────────────────────────────────────────────────
    // Backend: { rule_id, rule_name, description, remediation_steps,
    //            severity, is_active, created_at }
    const complianceRules = rawComplianceRules.map((r) => ({
      id:               String(r.rule_id),
      ruleId:           r.rule_id,
      name:             r.rule_name         || '',
      ruleName:         r.rule_name         || '',
      description:      r.description       || '',
      remediationSteps: r.remediation_steps || '',
      severity:         r.severity          || 'Medium',
      isActive:         r.is_active         !== undefined ? r.is_active : true,
      createdAt:        r.created_at        || null,
    }));

    // ── Compliance Violations ─────────────────────────────────────────────────
    // Backend: { violation_id, rule_id, entity_id, entity_type, status,
    //            detected_at, reported_by, resolved_by, resolved_at,
    //            resolution_remarks, due_date }
    const complianceViolations = rawViolations.map((v) => {
      const rule = rawComplianceRules.find(r => r.rule_id === v.rule_id);
      const proj = rawProjects.find(p => p.project_id === v.entity_id && v.entity_type === 'Project');
      return {
        id:                 String(v.violation_id),
        violationId:        v.violation_id,
        ruleId:             v.rule_id             || null,
        ruleName:           rule ? rule.rule_name : 'General Policy',
        entityId:           v.entity_id           || null,
        entityType:         v.entity_type         || '',
        projectName:        proj ? proj.project_name : 'General',
        status:             v.status              || 'Open',
        detectedAt:         v.detected_at         || null,
        reportedBy:         v.reported_by         || null,
        resolvedBy:         v.resolved_by         || null,
        resolvedAt:         v.resolved_at         || null,
        resolutionRemarks:  v.resolution_remarks  || null,
        dueDate:            v.due_date            || null,
        evidenceLabel:      v.status === 'Open' ? 'At Risk' : 'Compliant'
      };
    });

    // ── Evidence ──────────────────────────────────────────────────────────────
    // Backend: { evidence_id, user_id, task_id, violation_id, title,
    //            evidence_type, file_url, notes, status,
    //            reviewed_by, submitted_at, reviewed_at }
    const evidence = rawEvidence.map((e) => ({
      id:           String(e.evidence_id),
      evidenceId:   e.evidence_id,
      userId:       e.user_id          || null,
      taskId:       e.task_id          || null,
      violationId:  e.violation_id     || null,
      title:        e.title            || '',
      evidenceType: e.evidence_type    || 'Document',
      fileUrl:      e.file_url         || '',
      notes:        e.notes            || '',
      status:       e.status           || 'Pending',
      reviewedBy:   e.reviewed_by      || null,
      submittedAt:  e.submitted_at     || null,
      reviewedAt:   e.reviewed_at      || null,
    }));

    // ── Workflow Data ─────────────────────────────────────────────────────────
    const workflowInstances = rawWorkflowInstances.map(w => ({
      id:            String(w.instance_id),
      instanceId:    w.instance_id,
      title:         w.title           || '',
      templateId:    w.template_id     || null,
      projectId:     w.project_id      || null,
      initiatedBy:   w.initiated_by    || null,
      currentStepId: w.current_step_id || null,
      status:        w.status          || 'Draft',
      startedAt:     w.started_at      || null,
      completedAt:   w.completed_at    || null,
    }));

    const workflowTemplates = rawWorkflowTemplates.map(t => ({
      id:            String(t.template_id),
      templateId:    t.template_id,
      name:          t.template_name || '',
      department:    t.category || 'General',
      stages:        t.stages || [],
      description:   t.description || '',
      createdBy:     t.created_by || null,
      status:        t.status || 'Active',
      createdAt:     t.created_at || null,
    }));

    const workflowInstanceSteps = rawWorkflowInstanceSteps.map(s => ({
      id:              String(s.instance_step_id),
      instanceStepId:  s.instance_step_id,
      instanceId:      s.instance_id || null,
      stepId:          s.step_id     || null,
      assignedTo:      s.assigned_to || null,
      status:          s.status      || 'Pending',
      remarks:         s.remarks     || null,
      actionedBy:      s.actioned_by || null,
      createdAt:       s.created_at  || null,
      actionedAt:      s.actioned_at || null,
    }));

    const notifications = rawNotifications.map(n => ({
      id:             String(n.notification_id),
      notificationId: n.notification_id,
      userId:         n.user_id,
      title:          n.title || '',
      message:        n.message || '',
      type:           n.type || 'System',
      isRead:         n.is_read || false,
      link:           n.link || '',
      createdAt:      n.created_at || null,
    }));

    // ── 4. Assemble and return the unified application state ──────────────────
    return {
      users,
      userRoles,
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
      evidence,
      workflowInstances,
      workflowTemplates,
      workflowInstanceSteps,
      notifications,
      // Legacy aliases for backward-compat with older dashboard pages
      complianceItems:    complianceViolations,
      activeViolations:   complianceViolations.filter((v) => v.status === 'Open'),
      complianceReports:  [],
    };
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

  log(action, entityType, entityId, oldValue = null, newValue = null) {
    const sessionRaw = sessionStorage.getItem("currentUser");
    if (!sessionRaw) return;
    const session = JSON.parse(sessionRaw);
    let logs = JSON.parse(localStorage.getItem("pm_audit_logs")) || [];
    logs.unshift({
      log_id: this.nextId(logs, "log_id"),
      entity_id: entityId,
      entity_type: entityType,
      action: action,
      performed_by: session.id,
      performed_by_name: session.name,
      performed_at: new Date().toISOString(),
      old_value: oldValue,
      new_value: newValue,
    });
    localStorage.setItem("pm_audit_logs", JSON.stringify(logs));
  },

  api: {
    baseUrl: 'http://localhost:3000',

    async request(endpoint, method = 'GET', body = null) {
      const sessionRaw = sessionStorage.getItem("currentUser");
      let role = "guest";
      let numericActorId = null;
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw);
          role = session.role || "guest";
          numericActorId =
            window.TasksStore && typeof window.TasksStore.parseNumericUserId === "function"
              ? window.TasksStore.parseNumericUserId(session)
              : typeof session.id === "number"
                ? session.id
                : parseInt(String(session.id).replace(/\D/g, ""), 10) || null;
        } catch (e) {
          console.warn("Failed to parse currentUser from sessionStorage");
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-user-role': role
      };

      const m = String(method).toUpperCase();
      if (
        ["POST", "PATCH", "PUT", "DELETE"].includes(m) &&
        numericActorId != null &&
        Number.isFinite(numericActorId)
      ) {
        headers["x-user-id"] = String(numericActorId);
      }

      const config = { method, headers };
      if (body) config.body = JSON.stringify(body);

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, config);

        if (!response.ok) {
          // Throw explicit errors on non-2xx responses
          let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
          try {
            const data = await response.json();
            if (data.message) errorMsg = data.message;
          } catch (err) {
            // response was not JSON
          }
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
  },
  
  sendSystemNotification(targetUserId, title, message) {
    const allNotifs = JSON.parse(localStorage.getItem("system_notifications")) || [];
    allNotifs.unshift({
      id: Date.now(),
      targetUserId: String(targetUserId),
      title,
      message,
      date: new Date().toISOString(),
      read: false
    });
    localStorage.setItem("system_notifications", JSON.stringify(allNotifs));
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
};
