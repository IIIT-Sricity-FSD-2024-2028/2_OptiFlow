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
  // 1) Total Processes (Workflows)
  const workflows = typeof getWorkflows === "function" ? getWorkflows() : [];
  const totalProcesses = Array.isArray(workflows) ? workflows.length : 0;

  // 2) Active users — getUsers() is now async
  const users = typeof getUsers === "function" ? await getUsers() : [];
  const activeUsers = Array.isArray(users)
    ? users.filter((u) => String(u.status || "").toLowerCase() === "active").length
    : 0;
  const deptCount = Array.isArray(users)
    ? new Set(
        users
          .map((u) => String(u.department || "").trim())
          .filter(Boolean),
      ).size
    : 0;

  // 3) Avg completion rate (PM projects progress)
  let pmProjects = [];
  try {
    pmProjects = JSON.parse(localStorage.getItem("pm_projects")) || [];
  } catch {
    pmProjects = [];
  }
  const avgProgress =
    pmProjects.length > 0
      ? Math.round(
          pmProjects.reduce((sum, p) => sum + (parseFloat(p.progress) || 0), 0) /
            pmProjects.length,
        )
      : 0;

  // 4) Pending review (HR pending employees)
  let pendingHR = 0;
  if (typeof HRStore !== "undefined" && HRStore.getAll) {
    try {
      const emps = await HRStore.getAll();
      pendingHR = Array.isArray(emps)
        ? emps.filter((e) => String(e.status || "").toLowerCase() === "pending").length
        : 0;
    } catch (e) {}
  }

  // Paint metrics (if elements exist)
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };

  setText("metricTotalProcesses", totalProcesses);
  setText(
    "metricTotalProcessesTag",
    `Across ${deptCount || "—"} departments`,
  );

  setText("metricActiveUsage", activeUsers);
  setText("metricActiveUsageTag", "Currently active users");

  setText("metricAvgCompletion", `${avgProgress}%`);
  setText("metricAvgCompletionTag", "Across PM projects");

  setText("metricPendingReview", pendingHR);
  setText("metricPendingReviewTag", "HR pending provisions");
}

async function updateTabCounts() {
  const state = await window.Helpers.getState();
  const all = state.workflowTemplates || [];
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

async function refreshProcessTable() {
  const state = await window.Helpers.getState();
  let workflows = state.workflowTemplates || [];

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
                <a href="workflow-builder.html?id=${wf.id}" class="action-btn view" style="text-decoration:none; display:inline-block; line-height:1; padding:8px 16px;">View</a>
            </td>
        `;

    tbody.appendChild(tr);
  });
}

function viewProcess(id) {
  const target = 'workflow-builder.html?id=' + encodeURIComponent(id);
  window.location.href = target;
}

function editProcess(id) {
  window.location.href = `workflow-builder.html?id=${id}`;
}
