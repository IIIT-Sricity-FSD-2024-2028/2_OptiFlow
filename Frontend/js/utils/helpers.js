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
  const bell = document.querySelector('button[aria-label="Notifications"]');
  if (!bell) return;

  const dropdown = document.createElement("div");
  dropdown.id = "globalNotificationPanel";
  dropdown.style.cssText = `
        position: absolute; width: 380px; background: var(--card-bg); border: 1px solid var(--border-color);
        border-radius: 8px; box-shadow: 0 12px 30px rgba(0,0,0,0.1); z-index: 9999; display: none;
        flex-direction: column; overflow: hidden; cursor: default;
    `;

  dropdown.innerHTML = `
        <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-color);">
            <span style="font-weight: 600; font-size: 14px; color: var(--text-main);">Notifications</span>
            <span id="markAllReadBtn" style="font-size: 12px; color: var(--primary-color); cursor: pointer; font-weight: 500;">Mark all as read</span>
        </div>
        <div id="notifyList" style="max-height: 400px; overflow-y: auto;">
            <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; gap: 14px; align-items: flex-start; cursor: pointer;">
                <div style="width: 8px; height: 8px; background: #EF4444; border-radius: 50%; margin-top: 6px; flex-shrink: 0;"></div>
                <div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Finance Q4 Report Overdue</div>
                    <div style="font-size: 12px; color: var(--text-muted); line-height: 1.4;">Stage 3 is delayed by 2 days.</div>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">2 hours ago</div>
                </div>
            </div>
        </div>
        <div id="viewAllAlertsBtn" style="padding: 12px; text-align: center; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--primary-color); cursor: pointer; font-weight: 600; background: var(--card-bg);">
            View All Internal Alerts
        </div>
    `;

  document.body.appendChild(dropdown);

  document.getElementById("markAllReadBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const dots = document.querySelectorAll(
      "#notifyList > div > div:first-child",
    );
    dots.forEach((d) => (d.style.background = "transparent"));
    const bellDot = bell.querySelector("span");
    if (bellDot) bellDot.style.display = "none";
    const items = document.querySelectorAll("#notifyList > div");
    items.forEach((i) => (i.style.opacity = "0.6"));
  });

  document.getElementById("viewAllAlertsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "audit.html";
  });

  bell.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dropdown.style.display === "flex") {
      dropdown.style.display = "none";
    } else {
      const rect = bell.getBoundingClientRect();
      dropdown.style.top = rect.bottom + 12 + "px";
      dropdown.style.right = window.innerWidth - rect.right + "px";
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

    // Safety Fallbacks included so test users don't crash the UI!
    const formattedUsers = masterUsers.map((u) => ({
      id: u.id,
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
    }));

    return {
      users: formattedUsers,
      departments: [
        { id: 1, name: "Operations" },
        { id: 2, name: "IT Infrastructure" },
      ],
      projects: JSON.parse(localStorage.getItem("pm_projects")) || [],
      tasks: JSON.parse(localStorage.getItem("pm_tasks")) || [],
      subtasks: [],
      escalations: JSON.parse(localStorage.getItem("pm_escalations")) || [],
      complianceItems:
        JSON.parse(localStorage.getItem("pm_complianceItems")) || [],
      activeViolations:
        JSON.parse(localStorage.getItem("pm_complianceViolations")) || [],
      complianceViolations:
        JSON.parse(localStorage.getItem("pm_complianceViolations")) || [],
      auditLogs: JSON.parse(localStorage.getItem("pm_audit_logs")) || [],
    };
  },

  saveState(state) {
    localStorage.setItem("pm_projects", JSON.stringify(state.projects));
    localStorage.setItem("pm_tasks", JSON.stringify(state.tasks));
    localStorage.setItem("pm_escalations", JSON.stringify(state.escalations));
  },

  // ✅ RESTORED: Prevents Tasks page from crashing!
  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  // ✅ RESTORED: Prevents Projects page from crashing!
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
