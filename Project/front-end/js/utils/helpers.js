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

document.addEventListener("DOMContentLoaded", () => {
  initNotifications();
});

function initNotifications() {
  const bell =
    document.querySelector('button[aria-label="Notifications"]') ||
    document.querySelector(".bell-btn");
  if (!bell) return;

  // Get current user session
  const sessionRaw = sessionStorage.getItem("currentUser");
  if (!sessionRaw) return;
  const session = JSON.parse(sessionRaw);

  const dropdown = document.createElement("div");
  dropdown.id = "globalNotificationPanel";
  dropdown.style.cssText = `
        position: absolute; width: 380px; background: var(--card-bg, #fff); border: 1px solid var(--border, #e2e8f0);
        border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.1); z-index: 9999; display: none;
        flex-direction: column; overflow: hidden; cursor: default; top: 60px; right: 20px;
    `;

  document.body.appendChild(dropdown);

  function renderNotifs() {
    const allNotifs =
      JSON.parse(localStorage.getItem("system_notifications")) || [];
    // Only show notifications meant for ME
    const myNotifs = allNotifs
      .filter((n) => String(n.targetUserId) === String(session.id))
      .reverse();
    const unreadCount = myNotifs.filter((n) => !n.read).length;

    // Manage the red dot on the bell icon
    let existingDot = bell.querySelector(".bell-dot");
    if (unreadCount > 0) {
      if (!existingDot) {
        bell.innerHTML += `<span class="bell-dot" style="position:absolute; top:2px; right:4px; width:10px; height:10px; background:var(--red, #ef4444); border-radius:50%; border:2px solid #fff;"></span>`;
      }
    } else if (existingDot) {
      existingDot.remove();
    }

    // Build the list HTML
    let listHTML = "";
    if (myNotifs.length === 0) {
      listHTML = `<div style="padding: 30px; text-align: center; color: var(--text-muted, #64748b); font-size: 13px;">No new notifications</div>`;
    } else {
      listHTML = myNotifs
        .map((n) => {
          const dotColor =
            n.type === "error"
              ? "#ef4444"
              : n.type === "success"
                ? "#10b981"
                : "#3b82f6";
          const opacity = n.read ? "0.6" : "1";
          return `
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border, #e2e8f0); display: flex; gap: 14px; align-items: flex-start; opacity: ${opacity}; background: ${n.read ? "transparent" : "#f8fafc"}">
              <div style="width: 8px; height: 8px; background: ${n.read ? "transparent" : dotColor}; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></div>
              <div>
                  <div style="font-size: 13px; font-weight: 600; color: var(--text-primary, #0f172a); margin-bottom: 4px;">${n.title}</div>
                  <div style="font-size: 12px; color: var(--text-secondary, #475569); line-height: 1.4;">${n.message}</div>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">${n.date}</div>
              </div>
          </div>
        `;
        })
        .slice(0, 5)
        .join(""); // Show max 5
    }

    dropdown.innerHTML = `
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-color, #f8fafc);">
              <span style="font-weight: 600; font-size: 14px; color: var(--text-primary, #0f172a);">Notifications</span>
              ${unreadCount > 0 ? `<span id="markAllReadBtn" style="font-size: 12px; color: var(--blue, #2563eb); cursor: pointer; font-weight: 600;">Mark all as read</span>` : ""}
          </div>
          <div id="notifyList" style="max-height: 350px; overflow-y: auto;">
              ${listHTML}
          </div>
      `;

    const markReadBtn = document.getElementById("markAllReadBtn");
    if (markReadBtn) {
      markReadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Mark all as read in database
        const updatedNotifs = allNotifs.map((n) => {
          if (String(n.targetUserId) === String(session.id)) n.read = true;
          return n;
        });
        localStorage.setItem(
          "system_notifications",
          JSON.stringify(updatedNotifs),
        );
        renderNotifs(); // Re-render dropdown
      });
    }
  }

  // Initial render
  renderNotifs();

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.style.display === "flex") {
      dropdown.style.display = "none";
    } else {
      // Re-render to catch any new notifications that arrived while closed
      renderNotifs();
      const rect = bell.getBoundingClientRect();
      dropdown.style.top = rect.bottom + 12 + "px";
      // Adjust positioning based on screen size so it doesn't flow off-screen
      dropdown.style.right = "20px";
      dropdown.style.display = "flex";
    }
  });

  document.addEventListener("click", (e) => {
    if (dropdown.style.display === "flex" && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
}
// ─────────────────────────────────────────
// PART 2: PM Module Helpers
// ─────────────────────────────────────────
window.Helpers = {
  async getState() {
    let rawUsers = [], rawTasks = [], rawProjects = [], rawEscalations = [], rawEvidence = [],
        rawDepartments = [], rawRoles = [], rawSubtasks = [], rawAuditLogs = [],
        rawComplianceRules = [], rawViolations = [];
    try {
      const [uRes, tRes, pRes, escRes, evRes, dRes, rRes, stRes, alRes, crRes, cvRes] = await Promise.all([
        this.api.request('/users'),
        this.api.request('/tasks'),
        this.api.request('/projects'),
        this.api.request('/escalations'),
        this.api.request('/evidence'),
        this.api.request('/departments'),
        this.api.request('/roles'),
        this.api.request('/subtasks'),
        this.api.request('/audit-logs'),
        this.api.request('/compliance-rules'),
        this.api.request('/compliance-violations'),
      ]);
      rawUsers           = uRes   || [];
      rawTasks           = tRes   || [];
      rawProjects        = pRes   || [];
      rawEscalations     = escRes || [];
      rawEvidence        = evRes  || [];
      rawDepartments     = dRes   || [];
      rawRoles           = rRes   || [];
      rawSubtasks        = stRes  || [];
      rawAuditLogs       = alRes  || [];
      rawComplianceRules = crRes  || [];
      rawViolations      = cvRes  || [];
    } catch (e) {
      console.warn("Failed to fetch state from backend API", e);
    }

    // role slug → numeric roleId
    const roleSlugToId = {
      superuser: 1, project_manager: 2, compliance_officer: 3,
      hr_manager: 4, team_leader: 5, team_member: 6,
    };

    // ── Users ─────────────────────────────────────────────────────────────────────
    const users = rawUsers.map((u) => {
      const initials = u.full_name
        ? u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : '??';
      return {
        id: String(u.user_id),
        userId: u.user_id,
        fullName: u.full_name || 'Unknown User',
        email: u.email || '',
        role: u.role || 'team_member',
        roleId: roleSlugToId[u.role] || 6,
        departmentId: u.department_id || null,
        managerId: u.manager_id || null,
        reportsTo: u.manager_id ? String(u.manager_id) : null,
        isActive: u.is_active !== undefined ? u.is_active : true,
        status: u.is_active === false ? 'inactive' : 'active',
        avatar: initials,
        avatarColor: 'blue',
        createdAt: u.created_at || null,
      };
    });

    // ── Departments ──────────────────────────────────────────────────────────
    const departments = rawDepartments.map((d) => ({
      id: d.department_id,
      departmentId: d.department_id,
      name: d.department_name,
      departmentName: d.department_name,
      managerId: d.manager_id || null,
      createdAt: d.created_at || null,
    }));

    // ── Roles ───────────────────────────────────────────────────────────────────
    const roles = rawRoles.map((r) => ({
      id: r.role_id,
      roleId: r.role_id,
      name: r.role_name,
      roleName: r.role_name,
      description: r.description || '',
      isSystem: r.is_system || false,
      createdAt: r.created_at || null,
    }));

    // ── Projects ─────────────────────────────────────────────────────────────
    const projects = rawProjects.map((p) => ({
      ...p,
      id: p.project_id,
      projectId: p.project_id,
      name: p.project_name,
      projectName: p.project_name,
      departmentId: p.department_id,
      createdBy: p.created_by,
      startDate: p.start_date,
      endDate: p.end_date || null,
      createdAt: p.created_at || null,
    }));

    // ── Tasks ────────────────────────────────────────────────────────────────────
    const tasks = rawTasks.map((t) => ({
      ...t,
      id: t.task_id,
      taskId: t.task_id,
      projectId: t.project_id || null,
      assignedTo: t.assigned_to,
      assignedUserId: String(t.assigned_to),
      createdBy: t.created_by,
      estimatedHours: t.estimated_hours || 0,
      actualHours: t.actual_hours || 0,
      dueDate: t.due_date || null,
      completedAt: t.completed_at || null,
      createdAt: t.created_at || null,
    }));

    // ── Subtasks ─────────────────────────────────────────────────────────────
    const subtasks = rawSubtasks.map((s) => ({
      ...s,
      id: s.subtask_id,
      subtaskId: s.subtask_id,
      taskId: s.task_id,
      assignedTo: s.assigned_to,
      estimatedHours: s.estimated_hours || 0,
      dueDate: s.due_date || null,
      completedAt: s.completed_at || null,
      createdAt: s.created_at || null,
    }));

    // ── Escalations ──────────────────────────────────────────────────────────
    const escalations = rawEscalations.map((e) => ({
      ...e,
      id: e.escalation_id,
      escalationId: e.escalation_id,
      taskId: e.task_id,
      projectId: e.project_id,
      reportedBy: e.reported_by,
      targetManagerId: e.target_manager_id,
      blockerType: e.blocker_type || '',
      createdAt: e.created_at || null,
      resolvedAt: e.resolved_at || null,
    }));

    // ── Audit Logs ─────────────────────────────────────────────────────────────
    const auditLogs = rawAuditLogs.map((l) => ({
      ...l,
      id: l.log_id,
      logId: l.log_id,
      entityId: l.entity_id,
      entityType: l.entity_type,
      performedBy: l.performed_by || null,
      performedAt: l.performed_at,
      ipAddress: l.ip_address || null,
      oldValue: l.old_value || null,
      newValue: l.new_value || null,
    }));

    // ── Compliance Rules ──────────────────────────────────────────────────────
    const complianceRules = rawComplianceRules.map((r) => ({
      ...r,
      id: r.rule_id,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      remediationSteps: r.remediation_steps || '',
      isActive: r.is_active !== undefined ? r.is_active : true,
      createdAt: r.created_at || null,
    }));

    // ── Compliance Violations ───────────────────────────────────────────────
    const complianceViolations = rawViolations.map((v) => ({
      ...v,
      id: v.violation_id,
      violationId: v.violation_id,
      ruleId: v.rule_id,
      entityId: v.entity_id,
      entityType: v.entity_type,
      detectedAt: v.detected_at,
      reportedBy: v.reported_by || null,
      resolvedBy: v.resolved_by || null,
      resolvedAt: v.resolved_at || null,
      resolutionRemarks: v.resolution_remarks || null,
      dueDate: v.due_date || null,
    }));

    // ── Evidence ─────────────────────────────────────────────────────────────
    const evidence = rawEvidence.map((e) => ({
      ...e,
      id: e.evidence_id,
      evidenceId: e.evidence_id,
      userId: e.user_id,
      taskId: e.task_id || null,
      violationId: e.violation_id || null,
      evidenceType: e.evidence_type || 'Document',
      fileUrl: e.file_url,
      reviewedBy: e.reviewed_by || null,
      submittedAt: e.submitted_at,
      reviewedAt: e.reviewed_at || null,
    }));

    return {
      users,
      departments,
      roles,
      projects,
      tasks,
      subtasks,
      escalations,
      auditLogs,
      complianceRules,
      complianceViolations,
      evidence,
      // Legacy aliases for backward-compat with older dashboard pages
      complianceItems: complianceViolations,
      activeViolations: complianceViolations.filter(v => v.status === 'Open'),
      complianceReports: [],
    };
  },

  async saveState(state) {
    console.warn("saveState deprecated. Use direct async API mutations via Helpers.api.request().");
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

  statusClass(status) {
    const map = {
      Active: "status-active",
      Completed: "status-done",
      Pending: "status-not-started",
      In_Progress: "status-in-progress",
      In_Review: "status-pending",
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
      let role = 'guest';
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw);
          role = session.role || 'guest';
        } catch (e) {
          console.warn("Failed to parse currentUser from sessionStorage");
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-user-role': role 
      };

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
        
        return await response.json();
      } catch (error) {
        console.error(`API Request Failed [${method} ${endpoint}]:`, error);
        throw error;
      }
    }
  },
};
