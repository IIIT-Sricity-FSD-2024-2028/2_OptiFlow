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
  getState() {
    const masterUsers = JSON.parse(localStorage.getItem("users")) || [];

    // ✅ ROBUST MAPPING: Ensure IDs remain as strict strings for absolute compatibility
    const formattedUsers = masterUsers.map((u) => ({
      id: String(u.id),
      fullName: u.name || "Unknown User",
      email: u.email || "",
      departmentId: u.department === "IT" ? 2 : 1,
      roleId:
        u.role === "superuser"
          ? 1
          : u.role === "project_manager"
            ? 2
            : u.role === "team_leader"
              ? 4
              : 5,
      status: u.status ? u.status.toLowerCase() : "active",
      avatar: u.name ? u.name.substring(0, 2).toUpperCase() : "??",
      avatarColor: "blue",
      projectId: u.projectId ? parseInt(u.projectId, 10) : null, // Projects use numeric IDs
      reportsTo: u.reportsTo ? String(u.reportsTo) : null,
    }));

    // Ensure all task assignments are strictly strings to match the user IDs
    const rawTasks = JSON.parse(localStorage.getItem("pm_tasks")) || [];
    const sanitizedTasks = rawTasks.map((t) => ({
      ...t,
      assignedUserId: String(t.assignedUserId),
      createdBy: String(t.createdBy || "u2"),
    }));

    return {
      users: formattedUsers,
      departments: [
        { id: 1, name: "Operations" },
        { id: 2, name: "IT Infrastructure" },
      ],
      projects: JSON.parse(localStorage.getItem("pm_projects")) || [],
      tasks: sanitizedTasks,
      subtasks: JSON.parse(localStorage.getItem("pm_subtasks")) || [],
      escalations: JSON.parse(localStorage.getItem("pm_escalations")) || [],
      complianceItems:
        JSON.parse(localStorage.getItem("pm_complianceItems")) || [],
      activeViolations:
        JSON.parse(localStorage.getItem("pm_complianceViolations")) || [],
      complianceViolations:
        JSON.parse(localStorage.getItem("pm_complianceViolations")) || [],
      complianceRules: JSON.parse(localStorage.getItem("pm_complianceRules")) || [],
      complianceReports: JSON.parse(localStorage.getItem("pm_complianceReports")) || [],
      auditLogs: JSON.parse(localStorage.getItem("pm_audit_logs")) || [],
      evidence: JSON.parse(localStorage.getItem("pm_evidence")) || [],
    };
  },

  saveState(state) {
    localStorage.setItem("pm_projects", JSON.stringify(state.projects));
    localStorage.setItem("pm_tasks", JSON.stringify(state.tasks));
    localStorage.setItem("pm_subtasks", JSON.stringify(state.subtasks || []));
    localStorage.setItem("pm_escalations", JSON.stringify(state.escalations));

    // ✅ ADDED THESE THREE LINES: Now it actually saves Evidence and Compliance data!
    localStorage.setItem("pm_evidence", JSON.stringify(state.evidence || []));
    localStorage.setItem(
      "pm_complianceItems",
      JSON.stringify(state.complianceItems || []),
    );
    localStorage.setItem(
      "pm_complianceViolations",
      JSON.stringify(state.complianceViolations || []),
    );
    localStorage.setItem(
      "pm_complianceRules",
      JSON.stringify(state.complianceRules || []),
    );
    localStorage.setItem(
      "pm_complianceReports",
      JSON.stringify(state.complianceReports || []),
    );
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
};
