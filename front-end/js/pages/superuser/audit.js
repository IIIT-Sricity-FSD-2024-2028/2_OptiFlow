// js/pages/superuser/audit.js
// Renders the global unified audit log from backend API state with real timestamps and actors.

let state = null;
let auditLogs = [];

document.addEventListener("DOMContentLoaded", async () => {
  const sessionRaw = sessionStorage.getItem("currentUser");
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      const nameEl = document.getElementById("sidebar-user-name");
      const roleEl = document.getElementById("sidebar-user-role");
      const avatarEl = document.getElementById("sidebar-user-avatar");
      if (nameEl) nameEl.textContent = session.fullName || session.name || "Arjun Mehta";
      if (roleEl) roleEl.textContent = "Process Admin";
      if (avatarEl) {
        const name = session.fullName || session.name || "AM";
        avatarEl.textContent = name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
      }
    } catch(e) {}
  }

  // Load state and latest audit logs directly from backend
  try {
    if (window.Helpers) {
      state = await window.Helpers.getState();
      const rawLogs = await window.Helpers.api.request('/audit-logs', 'GET');
      auditLogs = Array.isArray(rawLogs) ? rawLogs : (rawLogs && rawLogs.data ? rawLogs.data : (state.auditLogs || []));
    }
  } catch (err) {
    console.warn("[audit.js] Direct fetch failed, falling back to state:", err);
    if (state) auditLogs = state.auditLogs || [];
  }

  refreshAuditTable();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", refreshAuditTable);

  const eventFilter = document.getElementById("eventFilter");
  if (eventFilter) eventFilter.addEventListener("change", refreshAuditTable);

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) exportBtn.addEventListener("click", exportToCSV);
});

function formatAuditTimestamp(isoString) {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relative = "";
  if (diffMinutes >= 0 && diffMinutes < 60) {
    relative = diffMinutes <= 1 ? "Just now" : `${diffMinutes}m ago`;
  } else if (diffHours >= 0 && diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays >= 0 && diffDays < 7) {
    relative = `${diffDays}d ago`;
  }

  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return {
    full: `${formattedDate}, ${formattedTime}`,
    relative: relative ? ` (${relative})` : ""
  };
}

function resolveActorName(log) {
  const users = (state && state.users) ? state.users : [];
  const actorId = log.performedById || log.performedBy;
  if (!actorId) return "System";

  const match = users.find(u => String(u.id) === String(actorId) || String(u.userId) === String(actorId));
  if (match) return match.fullName || match.name || `User #${actorId}`;

  // Check if oldValue or newValue carries a name
  if (log.newValue && log.newValue.userName) return log.newValue.userName;
  return `User #${actorId}`;
}

function resolveLogDetails(log) {
  if (log.newValue && log.newValue.message) {
    return log.newValue.message;
  }
  if (log.newValue && log.newValue.name) {
    return `${log.action} ${log.entityType}: "${log.newValue.name}"`;
  }
  return `${log.action} action performed on ${log.entityType} (ID: ${log.entityId})`;
}

function exportToCSV() {
  if (!auditLogs || auditLogs.length === 0) return;

  const headers = [
    "Timestamp",
    "Action",
    "Entity Type",
    "Entity ID",
    "User",
    "IP Address",
    "Details"
  ];

  const rows = auditLogs.map((log) => {
    const ts = new Date(log.performedAt || log.createdAt).toLocaleString();
    const action = log.action || "ACTION";
    const entityType = log.entityType || "System";
    const entityId = log.entityId || "";
    const user = resolveActorName(log);
    const ip = log.ipAddress || "127.0.0.1";
    const details = resolveLogDetails(log);

    return `"${ts}","${action}","${entityType}","${entityId}","${user}","${ip}","${details.replace(/"/g, '""')}"`;
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function refreshAuditTable() {
  let filtered = [...auditLogs];

  const searchInput = document.getElementById("searchInput");
  const search = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const eventFilter = document.getElementById("eventFilter");
  const type = eventFilter ? eventFilter.value.trim() : "";

  if (search) {
    filtered = filtered.filter((l) => {
      const userStr = resolveActorName(l).toLowerCase();
      const entityStr = (l.entityType || "").toLowerCase();
      const actionStr = (l.action || "").toLowerCase();
      const descStr = resolveLogDetails(l).toLowerCase();
      return (
        userStr.includes(search) ||
        entityStr.includes(search) ||
        actionStr.includes(search) ||
        descStr.includes(search)
      );
    });
  }

  if (type) {
    filtered = filtered.filter((l) => (l.action || "").toUpperCase() === type.toUpperCase());
  }

  renderAuditTable(filtered);
}

function processSeverityTag(action) {
  const a = (action || "").toUpperCase();
  if (a === "DELETE" || a === "STATUS_CHANGE" || a === "PERMISSION_CHANGE") {
    return `<span class="badge" style="background:#FEE2E2; color:#DC2626; font-weight:600;">High</span>`;
  }
  if (a === "UPDATE" || a === "CREATE") {
    return `<span class="badge" style="background:#FEF3C7; color:#D97706; font-weight:600;">Medium</span>`;
  }
  return `<span class="badge" style="background:#F1F5F9; color:#475569; font-weight:600;">Info</span>`;
}

function renderAuditTable(data) {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">No audit events found.</td></tr>';
    return;
  }

  data.forEach((l) => {
    const timeInfo = formatAuditTimestamp(l.performedAt || l.createdAt);
    const userName = resolveActorName(l);
    const details = resolveLogDetails(l);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="color: var(--text-muted); font-size:13px; white-space: nowrap;">
        <strong>${timeInfo.full}</strong>
        <span style="color:#64748b; font-size:12px;">${timeInfo.relative}</span>
      </td>
      <td>
        <span class="badge" style="background:#EFF6FF; color:#1D4ED8; font-weight:600;">${l.action || 'ACTION'}</span>
        <span class="badge" style="background:#F1F5F9; color:#475569; margin-left: 4px;">${l.entityType || 'System'}</span>
      </td>
      <td><div class="td-title" style="font-weight: 600;">${userName}</div></td>
      <td style="color: var(--text-muted); font-size:12px; font-family: monospace;">${l.ipAddress || "127.0.0.1"}</td>
      <td style="font-size: 13px; color: #334155; max-width: 320px;">${details}</td>
      <td>${processSeverityTag(l.action)}</td>
    `;
    tbody.appendChild(tr);
  });
}
