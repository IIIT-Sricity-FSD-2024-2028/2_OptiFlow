// js/pages/superuser/audit.js
// Renders the global unified audit log from backend API state.

let state;

document.addEventListener("DOMContentLoaded", async () => {
  if (window.Sidebar) window.Sidebar.render("audit");
  
  state = await window.Helpers.getState();

  refreshAuditTable();
  document
    .getElementById("searchInput")
    .addEventListener("input", refreshAuditTable);
  document
    .getElementById("eventFilter")
    .addEventListener("change", refreshAuditTable);

  // Wire up Export CSV button
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToCSV);
  }
});

function exportToCSV() {
  const auditLogsData = state ? state.auditLogs : [];
  if (!auditLogsData || auditLogsData.length === 0) return;

  // Define headers
  const headers = [
    "Timestamp",
    "Event Type",
    "User",
    "IP Address",
    "Details",
    "Outcome",
  ];

  // Map data to CSV rows
  const rows = auditLogsData.map((log) => {
    const ts = new Date(log.performedAt).toLocaleString();
    const type = log.entityType;
    const user = log.performedBy ? log.performedBy : "System"; // Ideally mapped to user name
    const ip = log.ipAddress || "localhost";
    const desc = `${log.action} on ${log.entityType} #${log.entityId}`;
    const outcome = log.action;
    
    // Enclose strings in quotes to handle commas
    return `"${ts}","${type}","${user}","${ip}","${desc.replace(/"/g, '""')}","${outcome}"`;
  });

  // Combine Headers and Rows
  const csvContent =
    "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");

  // Trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "audit_logs_export.csv");
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link);
}

function refreshAuditTable() {
  let logs = state ? state.auditLogs : [];
  const search = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("eventFilter").value;

  if (search) {
    logs = logs.filter(
      (l) =>
        l.entityType.toLowerCase().includes(search) ||
        l.action.toLowerCase().includes(search) ||
        String(l.performedBy).toLowerCase().includes(search),
    );
  }
  if (type) {
    logs = logs.filter((l) => l.action === type);
  }

  renderAuditTable(logs);
}

function processSeverityTag(action) {
  if (action === "DELETE" || action === "STATUS_CHANGE")
    return `<span class="badge" style="background:#FEE2E2; color:#DC2626;">High</span>`;
  if (action === "UPDATE")
    return `<span class="badge" style="background:#FEF3C7; color:#D97706;">Medium</span>`;
  return `<span class="badge gray">Info</span>`;
}

function renderAuditTable(data) {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No audit logs found</td></tr>';
    return;
  }

  // Find user details helper
  const allUsers = state.users || [];
  const getUserName = (id) => {
    const u = allUsers.find(u => String(u.id) === String(id));
    return u ? u.fullName : "System";
  };

  data.forEach((l) => {
    const ts = window.Helpers.formatDate(l.performedAt) + " " + new Date(l.performedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const userName = getUserName(l.performedBy);
    const desc = `${l.action} on ${l.entityType} #${l.entityId}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td style="color: var(--text-muted); font-size:13px;">${ts}</td>
            <td><span class="badge" style="background:#F1F5F9; color:#475569;">${l.entityType}</span></td>
            <td><div class="td-title">${userName}</div></td>
            <td style="color: var(--text-muted); font-size:13px; font-family: monospace;">${l.ipAddress || "localhost"}</td>
            <td>${desc}</td>
            <td>${processSeverityTag(l.action)}</td>
        `;
    tbody.appendChild(tr);
  });
}
