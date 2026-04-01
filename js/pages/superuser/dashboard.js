// js/pages/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  updateSystemMetrics();
  renderHealthMonitor();
  renderCriticalFeed();
  updateTabCounts();
  refreshProcessTable();

  const searchInput = document.getElementById("searchInput");
  const deptFilter = document.getElementById("deptFilter");
  const statusTabs = document.getElementById("statusTabs");

  if (searchInput) searchInput.addEventListener("input", refreshProcessTable);
  if (deptFilter) deptFilter.addEventListener("change", refreshProcessTable);

  if (statusTabs) {
    statusTabs.addEventListener("click", (e) => {
      if (e.target.classList.contains("pill-tab")) {
        // Remove active from all
        statusTabs
          .querySelectorAll(".pill-tab")
          .forEach((tab) => tab.classList.remove("active"));
        // Add active to clicked
        e.target.classList.add("active");
        refreshProcessTable();
      }
    });
  }
});

function updateSystemMetrics() {
  const healthData = {
    auth: "Healthy",
    hr: "Healthy",
    pm: "Healthy",
    process: "Healthy"
  };

  // 1. User Database (from db.js)
  try {
    if (typeof getUsers === "function") {
      const users = getUsers();
      const userEl = document.getElementById("userCount");
      if (userEl) userEl.textContent = users.length || 0;
      
      const authStatusEl = document.getElementById("userStatus");
      if (authStatusEl) applyStatusClass(authStatusEl, healthData.auth);
    }
  } catch (e) {
    console.error("Error updating User metrics:", e);
    healthData.auth = "Warning";
  }

  // 2. HR Workforce (from hr-data-store.js)
  try {
    if (typeof HRStore !== "undefined") {
      const hrStats = HRStore.getStats();
      const allEmployees = HRStore.getAll();
      const hrEl = document.getElementById("employeeCount");
      if (hrEl) hrEl.textContent = hrStats.activeNow || 0;
      
      const pending = (allEmployees || []).filter(e => e.status && e.status.toLowerCase() === "pending").length;
      if (pending > 5) healthData.hr = "Warning";
      
      const hrStatusEl = document.getElementById("hrStatus");
      if (hrStatusEl) applyStatusClass(hrStatusEl, healthData.hr);
    }
  } catch (e) {
    console.error("Error updating HR metrics:", e);
    healthData.hr = "Warning";
  }

  // 3. PM Projects (from pm-data-store.js)
  try {
    if (typeof Helpers !== "undefined" && typeof Helpers.getState === "function") {
      const state = Helpers.getState();
      const pmEl = document.getElementById("projectCount");
      if (pmEl && state && state.projects) {
        pmEl.textContent = state.projects.filter(p => p.status === "Active").length;
      } else if (pmEl) {
        pmEl.textContent = "0";
      }
      
      const violations = (state && (state.complianceViolations || state.activeViolations) || []).filter(v => v.status === "Open" || v.status === "Violation").length;
      if (violations > 0) healthData.pm = "Critical";
      
      const pmStatusEl = document.getElementById("pmStatus");
      if (pmStatusEl) applyStatusClass(pmStatusEl, healthData.pm);
    }
  } catch (e) {
    console.error("Error updating PM metrics:", e);
    healthData.pm = "Warning";
  }

  // 4. Processes (from workflows.js)
  try {
    if (typeof getWorkflows === "function") {
      const flows = getWorkflows() || [];
      const flowEl = document.getElementById("processCount");
      if (flowEl) flowEl.textContent = flows.length;
      
      const active = flows.filter(f => f.status === "Active").length;
      if (flows.length > 0 && active < flows.length / 2) healthData.process = "Warning";
      
      const processStatusEl = document.getElementById("processStatus");
      if (processStatusEl) applyStatusClass(processStatusEl, healthData.process);
    }
  } catch (e) {
    console.error("Error updating Process metrics:", e);
    healthData.process = "Warning";
  }
  
  window._systemHealth = healthData;
}

function applyStatusClass(el, status) {
  el.textContent = status;
  el.className = "status-badge " + status.toLowerCase();
}

function renderHealthMonitor() {
  const list = document.getElementById("healthMonitorList");
  if (!list) return;

  const health = window._systemHealth || { auth: "Healthy", hr: "Healthy", pm: "Healthy", process: "Healthy" };
  
  const services = [
    { label: "Authentication & User DB", key: "auth" },
    { label: "HR Records Store", key: "hr" },
    { label: "Project Management Store", key: "pm" },
    { label: "Process Automation Engine", key: "process" }
  ];

  list.innerHTML = services.map(s => {
    const status = health[s.key];
    const color = status === "Healthy" ? "#166534" : (status === "Warning" ? "#854d0e" : "#991b1b");
    return `
      <div class="health-item">
        <span class="health-item-label">${s.label}</span>
        <span class="health-item-status" style="color: ${color}">${status}</span>
      </div>
    `;
  }).join("");
}

function renderCriticalFeed() {
  const list = document.getElementById("criticalWarningsList");
  if (!list) return;

  if (typeof AuditStore === "undefined") return;

  const logs = AuditStore.getAll();
  const criticals = logs.filter(l => l.severity === "High" || l.severity === "Medium").slice(0, 4);

  if (criticals.length === 0) {
    list.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 12px; text-align: center;">No critical warnings detected.</div>';
    return;
  }

  list.innerHTML = criticals.map(l => `
    <div class="warning-item" style="border-left-color: ${l.severity === "High" ? "#ef4444" : "#f59e0b"}">
      <div class="warning-item-title">${l.type} - ${l.severity} Priority</div>
      <div class="warning-item-desc">${l.desc}</div>
      <div class="warning-item-time">${l.timestamp}</div>
    </div>
  `).join("");
}

function updateTabCounts() {
  const all = getWorkflows();
  const counts = {
    "": all.length,
    Active: all.filter((w) => w.status === "Active").length,
    Draft: all.filter((w) => w.status === "Draft").length,
    Archived: all.filter((w) => w.status === "Archived").length,
  };

  const labels = {
    "": "All",
    Active: "Active",
    Draft: "Draft",
    Archived: "Archived",
  };

  document.querySelectorAll("#statusTabs .pill-tab").forEach((tab) => {
    const status = tab.getAttribute("data-status");
    const count = counts[status] ?? 0;
    tab.textContent = `${labels[status]} (${count})`;
  });
}

function refreshProcessTable() {
  let workflows = getWorkflows();

  // Search Term
  const searchInput = document.getElementById("searchInput");
  if (searchInput && searchInput.value) {
    const term = searchInput.value.toLowerCase();
    workflows = workflows.filter(
      (wf) =>
        wf.name.toLowerCase().includes(term) ||
        wf.department.toLowerCase().includes(term),
    );
  }

  // Department Filter
  const deptFilter = document.getElementById("deptFilter");
  if (deptFilter && deptFilter.value) {
    workflows = workflows.filter((wf) =>
      wf.department.toLowerCase().includes(deptFilter.value.toLowerCase()),
    );
  }

  // Status Filter (Tabs)
  const activeTab = document.querySelector(".pill-tab.active");
  if (activeTab) {
    const status = activeTab.getAttribute("data-status");
    if (status) {
      // if not empty
      workflows = workflows.filter((wf) => wf.status === status);
    }
  }

  renderProcessTable(workflows);
}

function renderProcessTable(data) {
  const tbody = document.getElementById("processTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No processes found</td></tr>';
    return;
  }

  data.forEach((wf) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>
                <div class="td-title">${wf.name}</div>
                <div class="td-subtitle">${wf.department} · ${wf.totalStages} stages</div>
            </td>
            <td>${processStageTags(wf.stages)}</td>
            <td>${processComplianceTags(wf.compliance)}</td>
            <td>${renderStatusTag(wf.status)}</td>
            <td>${renderUsageBar(wf.runs)}</td>
            <td style="color: var(--text-muted);">${wf.lastModified}</td>
            <td>
                <button class="action-btn view" onclick="viewProcess('${wf.id}')">View</button>
                <button class="action-btn edit" onclick="editProcess('${wf.id}')">Edit</button>
            </td>
        `;

    tbody.appendChild(tr);
  });
}

function viewProcess(id) {
  // Redirect to the Process detail view or workflow builder
  window.location.href = `workflows.html?id=${id}`;
}

function editProcess(id) {
  window.location.href = `workflows.html?id=${id}&edit=true`;
}
