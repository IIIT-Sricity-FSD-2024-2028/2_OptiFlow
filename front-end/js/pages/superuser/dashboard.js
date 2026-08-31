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

  const newBtn = document.getElementById("btnHeaderNewProcess");
  if (newBtn) {
    newBtn.addEventListener("click", () => {
      sessionStorage.removeItem("edit_process_id");
      sessionStorage.removeItem("selected_process_id");
      sessionStorage.removeItem("view_process_id");
      sessionStorage.removeItem("newProcessDraft");
    });
  }
});

async function renderOmniscientMetrics() {
  const state = window.Helpers ? await window.Helpers.getState() : {};

  // 1. Process Templates (Process Admin core domain)
  let templates = [];
  if (typeof getProcesses === 'function') {
    templates = await getProcesses();
  }
  if (!templates.length && state.processTemplates) {
    templates = state.processTemplates;
  }
  const activeTemplatesCount = templates.filter(t => t.status === 'Active' || t.isActive !== false).length;

  const metricTemplatesEl = document.getElementById("metricTotalProcesses");
  if (metricTemplatesEl) metricTemplatesEl.textContent = String(templates.length);

  const metricTemplatesTag = document.getElementById("metricTotalProcessesTag");
  if (metricTemplatesTag) metricTemplatesTag.textContent = `${activeTemplatesCount} Active in Library`;

  // 2. Open Compliance Violations
  const violations = state.complianceViolations || [];
  const openViolationsCount = violations.filter(v => v.status === 'Open' || v.status === 'Under_Review').length;

  const metricViolationsEl = document.getElementById("metricActiveUsage");
  if (metricViolationsEl) metricViolationsEl.textContent = String(openViolationsCount);

  const metricViolationsTag2 = document.getElementById("metricActiveUsageTag");
  if (metricViolationsTag2) {
    metricViolationsTag2.textContent = `${openViolationsCount} Unresolved Violations`;
    metricViolationsTag2.className = openViolationsCount > 0 ? "metric-tag yellow" : "metric-tag green";
  }

  // 3. Process Instances (accurately queried directly from API or state)
  let instances = state.processInstances || [];
  try {
    if (window.Helpers && window.Helpers.api) {
      const rawInst = await window.Helpers.api.request('/process-instances', 'GET');
      if (Array.isArray(rawInst)) instances = rawInst;
      else if (rawInst && Array.isArray(rawInst.data)) instances = rawInst.data;
    }
  } catch (_) {}

  const activeInstancesCount = instances.filter(i => i.status === 'Active' || i.status === 'In_Progress').length;

  const metricAvgEl = document.getElementById("metricAvgCompletion");
  if (metricAvgEl) metricAvgEl.textContent = String(activeInstancesCount);

  const metricAvgTag = document.getElementById("metricAvgCompletionTag");
  if (metricAvgTag) {
    metricAvgTag.textContent = `${instances.length} Total Workflow Instances`;
    metricAvgTag.className = activeInstancesCount > 0 ? "metric-tag green" : "metric-tag gray";
  }

  // 4. Company Employees
  const users = state.users || [];
  const metricPendingEl = document.getElementById("metricPendingReview");
  if (metricPendingEl) metricPendingEl.textContent = String(users.length);

  const metricPendingTag = document.getElementById("metricPendingReviewTag");
  if (metricPendingTag) metricPendingTag.textContent = `${users.length} Active Users`;
}

async function updateTabCounts() {
  let all = [];
  if (typeof getProcesses === 'function') {
    all = await getProcesses();
  }
  if (!all.length && window.Helpers) {
    const state = await window.Helpers.getState();
    all = state.processTemplates || state.workflowTemplates || [];
  }

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
  let workflows = [];
  if (typeof getProcesses === 'function') {
    workflows = await getProcesses();
  }
  if (!workflows.length && window.Helpers) {
    const state = await window.Helpers.getState();
    workflows = state.processTemplates || state.workflowTemplates || [];
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

  const isHttp = window.location.protocol.startsWith('http');

  data.forEach((wf) => {
    const tr = document.createElement("tr");

    const viewUrl = isHttp ? `processes?id=${encodeURIComponent(wf.id)}` : `processes.html?id=${encodeURIComponent(wf.id)}`;
    const editUrl = isHttp ? `process-builder?id=${encodeURIComponent(wf.id)}` : `process-builder.html?id=${encodeURIComponent(wf.id)}`;

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
                <div style="display: flex; gap: 8px; align-items: center;">
                    <a href="${viewUrl}" onclick="sessionStorage.setItem('view_process_id', '${wf.id}'); sessionStorage.removeItem('selected_process_id');" class="action-btn view" style="text-decoration:none; display:inline-block; line-height:1; padding:6px 12px; background:#f1f5f9; color:#1e293b; border-radius:6px; font-size:12px; font-weight:600;">View</a>
                    <a href="${editUrl}" onclick="sessionStorage.setItem('edit_process_id', '${wf.id}'); sessionStorage.removeItem('selected_process_id');" class="action-btn edit" style="text-decoration:none; display:inline-block; line-height:1; padding:6px 12px; background:#2563eb; color:white; border-radius:6px; font-size:12px; font-weight:600;">Edit in Builder</a>
                </div>
            </td>
        `;

    tbody.appendChild(tr);
  });
}

function viewProcess(id) {
  sessionStorage.setItem('view_process_id', id);
  sessionStorage.removeItem('selected_process_id');
  const isHttp = window.location.protocol.startsWith('http');
  window.location.href = (isHttp ? 'processes?id=' : 'processes.html?id=') + encodeURIComponent(id);
}

function editProcess(id) {
  sessionStorage.setItem('edit_process_id', id);
  sessionStorage.removeItem('selected_process_id');
  const isHttp = window.location.protocol.startsWith('http');
  window.location.href = (isHttp ? 'process-builder?id=' : 'process-builder.html?id=') + encodeURIComponent(id);
}
