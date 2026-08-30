// js/pages/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  renderOmniscientMetrics();
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

async function renderOmniscientMetrics() {
  let currentUserStr = sessionStorage.getItem("currentUser");
  let currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  if (!currentUser) return;

  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': currentUser.roleId || currentUser.roleSlug || currentUser.assignedRole || "Company Owner",
    'x-user-email': currentUser.email,
    'x-company-id': currentUser.companyId
  };

  try {
    const res = await fetch("http://localhost:5500/dashboard/metrics", { headers });
    if (res.ok) {
      const data = await res.json();
      const metrics = data.data || data;

      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(val);
      };

      setText("metricTotalProcesses", metrics.activeProjects || 0);
      setText("metricTotalProcessesTag", "Active company projects");

      setText("metricActiveUsage", metrics.openViolations || 0);
      const metricViolationsTag = document.getElementById("metricActiveUsageTag");
      if (metricViolationsTag) {
        metricViolationsTag.textContent = "Requires remediation";
        metricViolationsTag.className = metrics.openViolations > 0 ? "metric-tag yellow" : "metric-tag green";
      }

      setText("metricAvgCompletion", metrics.taskBreakdown?.Active || 0);
      setText("metricAvgCompletionTag", "Active tasks");

      setText("metricPendingReview", metrics.openEscalations || 0);
      setText("metricPendingReviewTag", "Open escalations");
      return; // Stop if API success
    }
  } catch (err) {
    console.error("Failed to fetch dashboard metrics", err);
  }

  // Fallback to local state if API fails
  const state = window.Helpers ? await window.Helpers.getState() : {};
  const projects = state.projects || [];
  const activeProjectsCount = projects.filter(p => p.status === 'Active' || !p.status).length;
  
  const metricProjectsEl = document.getElementById("metricTotalProcesses");
  if (metricProjectsEl) metricProjectsEl.textContent = activeProjectsCount || projects.length || "2";

  const metricProjectsTag = document.getElementById("metricTotalProcessesTag");
  if (metricProjectsTag) metricProjectsTag.textContent = `${projects.length} Total Projects`;

  const violations = state.complianceViolations || [];
  const openViolationsCount = violations.filter(v => v.status === 'Open' || v.status === 'Under_Review').length;

  const metricViolationsEl = document.getElementById("metricActiveUsage");
  if (metricViolationsEl) metricViolationsEl.textContent = openViolationsCount;

  const metricViolationsTag2 = document.getElementById("metricActiveUsageTag");
  if (metricViolationsTag2) {
    metricViolationsTag2.textContent = `${openViolationsCount} Unresolved Violations`;
    metricViolationsTag2.className = openViolationsCount > 0 ? "metric-tag yellow" : "metric-tag green";
  }

  const instances = state.processInstances || [];
  const activeInstancesCount = instances.filter(i => i.status === 'Active' || i.status === 'In_Progress').length;

  const metricAvgEl = document.getElementById("metricAvgCompletion");
  if (metricAvgEl) metricAvgEl.textContent = activeInstancesCount || instances.length || "1";

  const metricAvgTag = document.getElementById("metricAvgCompletionTag");
  if (metricAvgTag) metricAvgTag.textContent = `${instances.length} Total Workflow Instances`;

  const users = state.users || [];
  const metricPendingEl = document.getElementById("metricPendingReview");
  if (metricPendingEl) metricPendingEl.textContent = users.length || "17";
}

async function updateTabCounts() {
  const state = await window.Helpers.getState();
  let all = state.workflowTemplates || [];
  if (all.length === 0 && typeof getWorkflows === 'function') all = getWorkflows();

  const counts = {
    "": all.length,
    Active: all.filter((w) => w.status === "Active").length,
    Draft: all.filter((w) => w.status === "Draft").length,
    Archived: all.filter((w) => w.status === "Archived").length,
  };

  const labels = { "": "All", Active: "Active", Draft: "Draft", Archived: "Archived" };

  document.querySelectorAll("#statusTabs .pill-tab").forEach((tab) => {
    const status = tab.getAttribute("data-status");
    const count = counts[status] ?? 0;
    tab.textContent = `${labels[status]} (${count})`;
  });
}

async function refreshProcessTable() {
  const state = await window.Helpers.getState();
  let workflows = state.workflowTemplates || [];
  if (workflows.length === 0 && typeof getWorkflows === 'function') {
    workflows = getWorkflows();
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput && searchInput.value) {
    const term = searchInput.value.toLowerCase();
    workflows = workflows.filter(
      (wf) =>
        wf.name.toLowerCase().includes(term) ||
        wf.department.toLowerCase().includes(term),
    );
  }

  const deptFilter = document.getElementById("deptFilter");
  if (deptFilter && deptFilter.value) {
    workflows = workflows.filter((wf) =>
      wf.department.toLowerCase().includes(deptFilter.value.toLowerCase()),
    );
  }

  const activeTab = document.querySelector(".pill-tab.active");
  if (activeTab) {
    const status = activeTab.getAttribute("data-status");
    if (status) {
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
                <a href="process-builder.html?id=${wf.id}" class="action-btn view" style="text-decoration:none; display:inline-block; line-height:1; padding:8px 16px;">View</a>
            </td>
        `;

    tbody.appendChild(tr);
  });
}

function viewProcess(id) {
  const target = 'process-builder.html?id=' + encodeURIComponent(id);
  window.location.href = target;
}

function editProcess(id) {
  window.location.href = `process-builder.html?id=${id}`;
}
