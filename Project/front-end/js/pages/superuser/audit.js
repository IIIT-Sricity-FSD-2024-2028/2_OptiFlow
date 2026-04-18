// js/pages/superuser/audit.js
// Renders the global unified audit log from AuditStore (localStorage-backed).

document.addEventListener("DOMContentLoaded", () => {
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
  const auditLogsData = window.AuditStore ? window.AuditStore.list() : [];
  if (!auditLogsData || auditLogsData.length === 0) return;

  // Define headers
  const headers = [
    "Timestamp",
    "Event Type",
    "User",
    "IP Address",
    "Details",
    "Severity",
  ];

  // Map data to CSV rows
  const rows = auditLogsData.map((log) => {
    // Enclose strings in quotes to handle commas
    return `"${log.timestamp}","${log.type}","${log.user}","${log.ip}","${log.desc.replace(/"/g, '""')}","${log.severity}"`;
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
  let logs = window.AuditStore ? window.AuditStore.list() : [];
  const search = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("eventFilter").value;

  if (search) {
    logs = logs.filter(
      (l) =>
        l.desc.toLowerCase().includes(search) ||
        l.user.toLowerCase().includes(search),
    );
  }
  if (type) {
    logs = logs.filter((l) => l.type === type);
  }

  renderAuditTable(logs);
}

function processSeverityTag(sev) {
  if (sev === "High")
    return `<span class="badge" style="background:#FEE2E2; color:#DC2626;">High</span>`;
  if (sev === "Medium")
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

  data.forEach((l) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td style="color: var(--text-muted); font-size:13px;">${l.timestamp}</td>
            <td><span class="badge" style="background:#F1F5F9; color:#475569;">${l.type}</span></td>
            <td><div class="td-title">${l.user}</div></td>
            <td style="color: var(--text-muted); font-size:13px; font-family: monospace;">${l.ip}</td>
            <td>${l.desc}</td>
            <td>${processSeverityTag(l.severity)}</td>
        `;
    tbody.appendChild(tr);
  });
}
