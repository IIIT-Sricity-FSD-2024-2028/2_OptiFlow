// js/pages/audit.js
const auditLogsData = [
  {
    timestamp: "10:45 AM, Dec 15 2024",
    type: "Process",
    user: "Vikram Patel",
    ip: "192.168.1.42",
    desc: "Published updated Finance Q4 workflow",
    severity: "Info",
  },
  {
    timestamp: "09:12 AM, Dec 15 2024",
    type: "Authentication",
    user: "Arjun Mehta",
    ip: "192.168.1.18",
    desc: "Successful login",
    severity: "Info",
  },
  {
    timestamp: "08:05 AM, Dec 15 2024",
    type: "User Management",
    user: "Vikram Patel",
    ip: "192.168.1.42",
    desc: "Assigned Sunita Rao to Finance Dept",
    severity: "Info",
  },
  {
    timestamp: "11:23 PM, Dec 14 2024",
    type: "Authentication",
    user: "Unknown",
    ip: "82.16.4.102",
    desc: "Failed login attempt (3/3)",
    severity: "High",
  },
  {
    timestamp: "04:15 PM, Dec 14 2024",
    type: "Process",
    user: "Sarah Jenkins",
    ip: "192.168.1.55",
    desc: "Auto-escalation triggered on IT Audit",
    severity: "Medium",
  },
  {
    timestamp: "02:00 PM, Dec 14 2024",
    type: "User Management",
    user: "Vikram Patel",
    ip: "192.168.1.42",
    desc: "Created new Admin user profile",
    severity: "Info",
  },
  {
    timestamp: "10:00 AM, Dec 14 2024",
    type: "System",
    user: "System",
    ip: "localhost",
    desc: "Daily backup sequence completed",
    severity: "Info",
  },
];

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
  let logs = [...auditLogsData];
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
