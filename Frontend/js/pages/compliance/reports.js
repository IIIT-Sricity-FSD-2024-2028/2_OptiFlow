let state;

const reportPageState = {
  selectedType: "compliance-summary",
  workflowCatalog: [],
  ruleCatalog: [],
  duplicateRuleVersions: new Set(),
  pendingConfig: null,
};

document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("reports");

  state = window.Helpers ? window.Helpers.getState() : {};
  _initializeReportsData();
  _initializeScopeCatalogs();
  _bindReportEventHandlers();
  _renderWorkflowOptions();
  _renderRuleVersionOptions();
  _updateRuleWarnings();
  window.renderReports();
});

function _esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function _saveState() {
  if (window.Helpers) window.Helpers.saveState(state);
}

function _initializeReportsData() {
  if (
    Array.isArray(state.complianceReports) &&
    state.complianceReports.length > 0
  ) {
    return;
  }

  state.complianceReports = [
    {
      id: "rep1",
      title: "Compliance Summary — Q4 2024",
      meta: "All Projects · All Policies · Generated Dec 15 · PDF · 2.1 MB",
      iconClass: "rtic-blue",
      format: "pdf",
      tags: [
        { cls: "filetype", txt: "PDF" },
        { cls: "gray", txt: "All Projects" },
      ],
    },
    {
      id: "rep2",
      title: "Violations Report — Finance Q4",
      meta: "Finance Q4 · SOX · Generated Dec 16 · PDF · 890 KB",
      iconClass: "rtic-red",
      format: "pdf",
      tags: [
        { cls: "filetype", txt: "PDF" },
        { cls: "sox", txt: "SOX" },
      ],
    },
    {
      id: "rep3",
      title: "Audit Trail — Project Atlas",
      meta: "Project Atlas · GDPR · Generated Dec 12 · XLSX · 1.4 MB",
      iconClass: "rtic-green",
      format: "xlsx",
      tags: [
        { cls: "filetype", txt: "XLSX" },
        { cls: "gdpr", txt: "GDPR" },
      ],
    },
    {
      id: "rep4",
      title: "Evidence Log — IT Security Audit",
      meta: "IT Security · ISO 27001 · Generated Dec 10 · PDF · 3.2 MB",
      iconClass: "rtic-yellow",
      format: "pdf",
      tags: [
        { cls: "filetype", txt: "PDF" },
        { cls: "iso", txt: "ISO 27001" },
      ],
    },
  ];

  _saveState();
}

function _initializeScopeCatalogs() {
  const workflowsFromState = Array.isArray(state.workflows)
    ? state.workflows
    : [];

  reportPageState.workflowCatalog = workflowsFromState.length
    ? workflowsFromState.map((wf) => ({
        id: wf.id || wf.workflowId || `wf-${Date.now()}`,
        name: wf.name || wf.title || "Unnamed Workflow",
      }))
    : [
        { id: "wf-security-audit", name: "Security Compliance Workflow" },
        { id: "wf-finance-quarterly", name: "Finance Quarterly Close" },
        { id: "wf-client-onboarding", name: "Client Onboarding" },
      ];

  const rulesFromState = Array.isArray(state.complianceRules)
    ? state.complianceRules
    : [];

  reportPageState.ruleCatalog = rulesFromState.map((rule, index) => ({
    id: rule.id || rule.ruleId || `rule-${index + 1}`,
    name: rule.name || rule.title || "Compliance Rule",
    version: rule.version || rule.activeVersion || "v1",
  }));

  const counts = new Map();
  reportPageState.ruleCatalog.forEach((rule) => {
    const key = `${rule.id}|${rule.version}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  reportPageState.duplicateRuleVersions = new Set();
  counts.forEach((count, key) => {
    if (count > 1) reportPageState.duplicateRuleVersions.add(key);
  });
}

function _bindReportEventHandlers() {
  document.querySelectorAll(".report-type-card").forEach((card) => {
    card.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      window.selectReportType(card);
    });
  });

  document
    .getElementById("btnCloseReportPreview")
    ?.addEventListener("click", _closeReportPreviewModal);
  document
    .getElementById("btnCancelReportPreview")
    ?.addEventListener("click", _closeReportPreviewModal);
  document
    .getElementById("btnConfirmGenerateReport")
    ?.addEventListener("click", function () {
      if (!reportPageState.pendingConfig) return;
      window.generateReport(reportPageState.pendingConfig);
    });

  document
    .getElementById("reportPreviewModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) _closeReportPreviewModal();
    });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    window.closeDownloadModal();
    _closeReportPreviewModal();
  });
}

function _renderWorkflowOptions() {
  const select = document.getElementById("rgWorkflow");
  if (!select) return;

  const options = ['<option value="">All Workflows</option>'];
  reportPageState.workflowCatalog.forEach((wf) => {
    options.push(`<option value="${_esc(wf.id)}">${_esc(wf.name)}</option>`);
  });
  select.innerHTML = options.join("");
}

function _renderRuleVersionOptions() {
  const select = document.getElementById("rgRuleVersion");
  if (!select) return;

  if (!reportPageState.ruleCatalog.length) {
    select.innerHTML = '<option value="">No Rule Versions Available</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;
  const options = ['<option value="">All Active Versions</option>'];
  reportPageState.ruleCatalog.forEach((rule) => {
    const value = `${rule.id}|${rule.version}`;
    options.push(
      `<option value="${_esc(value)}">${_esc(rule.name)} (${_esc(rule.version)})</option>`,
    );
  });
  select.innerHTML = options.join("");
}

function _updateRuleWarnings() {
  const warning = document.getElementById("rgRuleWarning");
  if (!warning) return;

  if (!reportPageState.ruleCatalog.length) {
    warning.style.display = "block";
    warning.textContent =
      "No rule list found. Reports will be generated without version scoping.";
    return;
  }

  if (reportPageState.duplicateRuleVersions.size > 0) {
    warning.style.display = "block";
    warning.textContent =
      "Duplicate rule versions detected in scope catalog. Report will include conflict marker.";
    return;
  }

  warning.style.display = "none";
  warning.textContent = "";
}

function _collectReportConfig() {
  const selectedTypeCard = document.querySelector(".report-type-card.selected");
  const type = selectedTypeCard?.dataset.type || "compliance-summary";
  const typeName =
    selectedTypeCard?.querySelector(".report-type-name")?.textContent?.trim() ||
    "Compliance Summary";

  const projectSelect = document.getElementById("rgProject");
  const policySelect = document.getElementById("rgPolicy");
  const workflowSelect = document.getElementById("rgWorkflow");
  const ruleVersionSelect = document.getElementById("rgRuleVersion");
  const formatSelect = document.getElementById("rgFormat");

  return {
    type,
    typeName,
    projectId: projectSelect?.value || "",
    projectName:
      projectSelect?.options[projectSelect.selectedIndex]?.text ||
      "All Projects",
    policyId: policySelect?.value || "",
    policyName:
      policySelect?.options[policySelect.selectedIndex]?.text || "All Policies",
    workflowId: workflowSelect?.value || "",
    workflowName:
      workflowSelect?.options[workflowSelect.selectedIndex]?.text ||
      "All Workflows",
    ruleVersionKey: ruleVersionSelect?.value || "",
    ruleVersionName:
      ruleVersionSelect?.options[ruleVersionSelect.selectedIndex]?.text ||
      "All Active Versions",
    dateStart: document.getElementById("rgDateStart")?.value || "",
    dateEnd: document.getElementById("rgDateEnd")?.value || "",
    format: formatSelect?.value || "pdf",
    formatLabel:
      formatSelect?.options[formatSelect.selectedIndex]?.text || "PDF",
  };
}

function _validateReportConfig(config) {
  const errors = [];
  const warnings = [];

  if (!config.dateStart || !config.dateEnd) {
    errors.push("Start and end dates are required.");
  }

  if (config.dateStart && config.dateEnd && config.dateStart > config.dateEnd) {
    errors.push("Start date must be before or equal to end date.");
  }

  if (
    (config.type === "audit-trail" || config.type === "evidence-log") &&
    !config.workflowId
  ) {
    errors.push(
      "No workflow selected. This report type requires a workflow scope.",
    );
  }

  if (!reportPageState.ruleCatalog.length) {
    warnings.push("Rule version scope unavailable because rule list is empty.");
  }

  if (
    config.ruleVersionKey &&
    reportPageState.duplicateRuleVersions.has(config.ruleVersionKey)
  ) {
    warnings.push(
      "Selected rule version has duplicates; report will include a duplicate-version marker.",
    );
  } else if (
    !config.ruleVersionKey &&
    reportPageState.duplicateRuleVersions.size > 0
  ) {
    warnings.push(
      "Duplicate rule versions exist in catalog; choose a specific version scope for clarity.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function _typeVisual(type) {
  const map = {
    "compliance-summary": { iconClass: "rtic-blue", policyBadge: "gray" },
    "violations-report": { iconClass: "rtic-red", policyBadge: "sox" },
    "audit-trail": { iconClass: "rtic-green", policyBadge: "gdpr" },
    "evidence-log": { iconClass: "rtic-yellow", policyBadge: "iso" },
  };
  return map[type] || map["compliance-summary"];
}

function _closeReportPreviewModal() {
  document.getElementById("reportPreviewModal")?.classList.remove("active");
}

window.openReportPreviewModal = function () {
  const config = _collectReportConfig();
  const validation = _validateReportConfig(config);

  if (!validation.valid) {
    if (window.Toast) window.Toast.show(validation.errors[0], "error");
    return;
  }

  reportPageState.pendingConfig = config;

  const previewRows = [
    ["Report Type", config.typeName],
    ["Project", config.projectName],
    ["Policy", config.policyName],
    ["Workflow", config.workflowName],
    ["Rule Version", config.ruleVersionName],
    ["Date Range", `${config.dateStart} -> ${config.dateEnd}`],
    ["Export Format", config.formatLabel],
  ];

  const grid = document.getElementById("reportPreviewGrid");
  if (grid) {
    grid.innerHTML = previewRows
      .map(
        ([label, value]) => `
      <div class="report-preview-cell">
        <span class="report-preview-label">${_esc(label)}</span>
        <span class="report-preview-value">${_esc(value)}</span>
      </div>`,
      )
      .join("");
  }

  const warningBox = document.getElementById("reportPreviewWarning");
  if (warningBox) {
    if (validation.warnings.length) {
      warningBox.style.display = "block";
      warningBox.textContent = validation.warnings.join(" ");
    } else {
      warningBox.style.display = "none";
      warningBox.textContent = "";
    }
  }

  document.getElementById("reportPreviewModal")?.classList.add("active");
};

window.renderReports = function () {
  const list = document.getElementById("recentReportsList");
  if (!list) return;

  const reports = Array.isArray(state.complianceReports)
    ? state.complianceReports
    : [];
  if (!reports.length) {
    list.innerHTML = `
      <article class="report-card" role="listitem">
        <div class="report-card-body">
          <div class="report-card-title">No reports generated yet</div>
          <div class="report-card-meta">Generate your first report from the left panel to populate this list.</div>
        </div>
      </article>`;
    return;
  }

  list.innerHTML = reports
    .map(
      (rep) => `
    <article class="report-card" role="listitem">
      <div class="report-card-icon ${_esc(rep.iconClass || "rtic-blue")}" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <div class="report-card-body">
        <div class="report-card-title">${_esc(rep.title)}</div>
        <div class="report-card-meta">${_esc(rep.meta)}</div>
        <div class="report-card-tags">
          ${(rep.tags || []).map((t) => `<span class="badge ${_esc(t.cls)}">${_esc(t.txt)}</span>`).join("")}
        </div>
      </div>
      <button class="btn-download" onclick="window.downloadReport('${_esc(rep.id)}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download
      </button>
    </article>
  `,
    )
    .join("");
};

window.selectReportType = function (card) {
  document.querySelectorAll(".report-type-card").forEach((c) => {
    c.classList.remove("selected");
    c.setAttribute("aria-checked", "false");
  });
  card.classList.add("selected");
  card.setAttribute("aria-checked", "true");
  reportPageState.selectedType = card.dataset.type || "compliance-summary";
};

window.generateReport = function (overrideConfig) {
  const config = overrideConfig || _collectReportConfig();
  const validation = _validateReportConfig(config);

  if (!validation.valid) {
    if (window.Toast) window.Toast.show(validation.errors[0], "error");
    return;
  }

  const btn = document.getElementById("btn-generate");
  if (!btn) return;

  const originalText = btn.innerText;
  btn.innerText = "Generating...";
  btn.style.opacity = "0.7";
  btn.disabled = true;
  btn.style.cursor = "wait";

  if (window.Toast) window.Toast.show("Compiling report data...", "info");

  setTimeout(() => {
    btn.innerText = originalText;
    btn.style.opacity = "1";
    btn.disabled = false;
    btn.style.cursor = "pointer";

    const visual = _typeVisual(config.type);
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const newReport = {
      id: "rep_" + Date.now(),
      title: `${config.typeName} — ${config.projectName}`,
      meta: `${config.projectName} · ${config.policyName} · ${config.workflowName} · Generated ${today} · ${config.formatLabel} · 1.2 MB`,
      iconClass: visual.iconClass,
      format: config.format,
      tags: [
        { cls: "filetype", txt: config.formatLabel },
        { cls: visual.policyBadge, txt: config.policyName },
        ...(config.ruleVersionKey
          ? [{ cls: "gray", txt: config.ruleVersionName }]
          : []),
      ],
      scope: {
        workflowId: config.workflowId,
        ruleVersionKey: config.ruleVersionKey,
      },
    };

    state.complianceReports.unshift(newReport);
    _saveState();
    window.renderReports();
    _closeReportPreviewModal();

    if (validation.warnings.length && window.Toast) {
      window.Toast.show(
        `Report generated with warning: ${validation.warnings[0]}`,
        "warning",
      );
    } else if (window.Toast) {
      window.Toast.show(
        "Report generated successfully! Added to Recent Reports.",
        "success",
      );
    }
  }, 1200);
};

window.downloadReport = function (id) {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) {
    modal.classList.add("active");
  } else if (window.Toast) {
    window.Toast.show("Download started. Check browser downloads.", "success");
  }

  let reportName = "compliance_report_" + id;
  let extension = "txt";
  if (state && Array.isArray(state.complianceReports)) {
    const rep = state.complianceReports.find((r) => r.id === id);
    if (rep) {
      reportName = (rep.title || reportName)
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      extension = (rep.format || "txt").toLowerCase();
    }
  }

  const fileContent =
    "Simulated OfficeSync report artifact\n" +
    "Report: " +
    reportName +
    "\nGenerated securely by OfficeSync Compliance.";

  const blob = new Blob([fileContent], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);

  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  downloadAnchor.download = `${reportName}.${extension}`;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  window.URL.revokeObjectURL(url);
};

window.closeDownloadModal = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.remove("active");
};
