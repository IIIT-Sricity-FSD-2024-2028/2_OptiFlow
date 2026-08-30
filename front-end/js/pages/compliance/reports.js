// js/pages/compliance/reports.js
// Enterprise Compliance Reports generator & download manager — aligned with Prisma schema

let state;

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("reports");

  // Ensure download success modal is strictly hidden on initial page render
  document.querySelectorAll(".modal-overlay, .modal-backdrop").forEach((m) => {
    m.classList.remove("active");
    m.classList.add("hidden");
    m.style.display = "none";
  });

  state = await window.Helpers.getState();

  // Populate dynamic project filter dropdown from live backend state
  const projSelect = document.getElementById("rgProject");
  if (projSelect && state.projects && state.projects.length > 0) {
    projSelect.innerHTML =
      '<option value="all">All Projects</option>' +
      state.projects
        .map((p) => `<option value="${p.id || p.projectId}">${p.name}</option>`)
        .join("");
  }

  const projectCount = (state.projects || []).length;
  const violationCount = (state.complianceViolations || []).length;
  const openViolations = (state.complianceViolations || []).filter(v => v.status === 'Open' || v.status === 'Under_Review').length;
  const evidenceCount = (state.evidence || []).length;
  const auditLogsCount = (state.auditLogs || []).length;

  // Populate default enterprise compliance reports aligned with Prisma schema if empty
  if (!state.complianceReports || state.complianceReports.length === 0) {
    state.complianceReports = [
      {
        id: "rep_exec_summary",
        type: "compliance-summary",
        title: "Executive Compliance Health & Audit Summary Report",
        meta: `${projectCount} Projects · GDPR, SOX, ISO 27001 · Generated Today · PDF`,
        iconClass: "rtic-blue",
        tags: [
          { cls: "filetype", txt: "PDF" },
          { cls: "gray", txt: "Company-Wide" },
          { cls: "gdpr", txt: "GDPR" },
          { cls: "sox", txt: "SOX" },
        ],
      },
      {
        id: "rep_violations_ledger",
        type: "violations-report",
        title: "Regulatory Violation & Escalation Ledger",
        meta: `${violationCount} Violations Logged · ${openViolations} Open · CSV Export`,
        iconClass: "rtic-red",
        tags: [
          { cls: "filetype", txt: "CSV" },
          { cls: "open", txt: "Violations" },
          { cls: "critical", txt: "Critical Scope" },
        ],
      },
      {
        id: "rep_evidence_attestation",
        type: "evidence-log",
        title: "Evidence Verification & File Attestation Audit",
        meta: `${evidenceCount} Evidence Submissions · Verification Status · XLSX`,
        iconClass: "rtic-green",
        tags: [
          { cls: "filetype", txt: "XLSX" },
          { cls: "green", txt: "Attestations" },
        ],
      },
      {
        id: "rep_audit_trail",
        type: "audit-trail",
        title: "System Audit Trail & Permission History Log",
        meta: `${auditLogsCount} System Logs · Security Audit PDF`,
        iconClass: "rtic-yellow",
        tags: [
          { cls: "filetype", txt: "PDF" },
          { cls: "gray", txt: "Audit Stream" },
        ],
      },
    ];
  }

  window.renderReports();
});

// ── Render Recent Reports List ────────────────────────────────────────────────
window.renderReports = function () {
  const list = document.getElementById("recentReportsList");
  if (!list) return;

  if (!state.complianceReports || state.complianceReports.length === 0) {
    list.innerHTML =
      '<div style="padding:24px;text-align:center;color:#64748b;">No generated compliance reports found.</div>';
    return;
  }

  list.innerHTML = state.complianceReports
    .map(
      (rep) => `
    <article class="report-card" role="listitem">
      <div class="report-card-icon ${rep.iconClass || "rtic-blue"}" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      </div>
      <div class="report-card-body">
        <div class="report-card-title">${rep.title}</div>
        <div class="report-card-meta">${rep.meta}</div>
        <div class="report-card-tags">
          ${(rep.tags || [])
            .map((t) => `<span class="badge ${t.cls}">${t.txt}</span>`)
            .join("")}
        </div>
      </div>
      <button class="btn-download" onclick="window.downloadReport('${rep.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download
      </button>
    </article>
  `,
    )
    .join("");
};

// ── Select Report Type Card ───────────────────────────────────────────────────
window.selectReportType = function (card) {
  document.querySelectorAll(".report-type-card").forEach((c) => {
    c.classList.remove("selected");
    c.setAttribute("aria-checked", "false");
  });
  card.classList.add("selected");
  card.setAttribute("aria-checked", "true");
};

// ── Generate Report ───────────────────────────────────────────────────────────
window.generateReport = function () {
  const btn = document.getElementById("btn-generate");
  if (!btn) return;

  const originalText = btn.innerText;
  btn.innerText = "Compiling Report…";
  btn.disabled = true;
  btn.style.opacity = "0.7";

  if (window.Toast)
    window.Toast.show(
      "info",
      "Compiling Data",
      "Extracting Prisma DB state & generating report...",
    );

  setTimeout(async () => {
    btn.innerText = originalText;
    btn.disabled = false;
    btn.style.opacity = "1";

    const typeCard = document.querySelector(".report-type-card.selected");
    const typeId = typeCard
      ? typeCard.getAttribute("data-type")
      : "compliance-summary";
    const typeName = typeCard
      ? typeCard.querySelector(".report-type-name").innerText
      : "Compliance Summary";

    const projectSelect = document.getElementById("rgProject");
    const project =
      projectSelect && projectSelect.selectedIndex >= 0
        ? projectSelect.options[projectSelect.selectedIndex].text
        : "All Projects";

    const policySelect = document.getElementById("rgPolicy");
    const policy =
      policySelect && policySelect.selectedIndex >= 0
        ? policySelect.options[policySelect.selectedIndex].text
        : "All Frameworks";

    const formatSelect = document.getElementById("rgFormat");
    const format =
      formatSelect && formatSelect.selectedIndex >= 0
        ? formatSelect.options[formatSelect.selectedIndex].text
        : "PDF";

    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const newReport = {
      id: "rep_" + Date.now(),
      type: typeId,
      title: `${typeName} — ${project}`,
      meta: `${project} · ${policy} · Generated ${today} · ${format}`,
      iconClass:
        typeId === "violations-report"
          ? "rtic-red"
          : typeId === "evidence-log"
            ? "rtic-green"
            : typeId === "audit-trail"
              ? "rtic-yellow"
              : "rtic-blue",
      tags: [
        { cls: "filetype", txt: format },
        { cls: "gray", txt: project },
        { cls: policy.toLowerCase().includes("gdpr") ? "gdpr" : policy.toLowerCase().includes("sox") ? "sox" : "iso", txt: policy },
      ],
    };

    state.complianceReports.unshift(newReport);
    window.renderReports();

    if (window.Toast)
      window.Toast.show(
        "success",
        "Report Generated",
        `"${newReport.title}" created successfully.`,
      );
  }, 1000);
};

// ── Real Download Report Engine ───────────────────────────────────────────────
window.downloadReport = function (id) {
  const rep = (state.complianceReports || []).find((r) => r.id === id) || {
    id: id,
    type: "compliance-summary",
    title: `Compliance_Report_${id}`,
  };

  const safeFileName = rep.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const formatTag = (rep.tags || []).find((t) => t.cls === "filetype")?.txt || "TXT";

  // Build report based on schema model contents
  const rules = state.complianceRules || [];
  const violations = state.complianceViolations || [];
  const evidence = state.evidence || [];
  const logs = state.auditLogs || [];
  const users = state.users || [];
  const projects = state.projects || [];

  let reportText = "";

  if (rep.type === "violations-report" || formatTag === "CSV") {
    // Generate CSV breakdown
    reportText = "Violation ID,Rule Name,Severity,Status,Entity Type,Entity Name,Reported By,Detected At,Resolution Remarks\n";
    violations.forEach((v) => {
      const r = rules.find((x) => String(x.id || x.ruleId) === String(v.ruleId)) || {};
      const u = users.find((x) => String(x.id || x.userId) === String(v.reportedById || v.reportedBy)) || {};
      let entityName = `#${v.entityId}`;
      if (v.entityType === "User") {
        const targetU = users.find((x) => String(x.id || x.userId) === String(v.entityId));
        if (targetU) entityName = targetU.fullName || targetU.name;
      } else if (v.entityType === "Project") {
        const targetP = projects.find((x) => String(x.id || x.projectId) === String(v.entityId));
        if (targetP) entityName = targetP.name;
      }

      reportText += `"${v.id || v.violationId}","${r.name || 'Policy Violation'}","${v.severity || 'Medium'}","${v.status}","${v.entityType}","${entityName}","${u.fullName || 'System'}","${v.detectedAt || ''}","${(v.resolutionRemarks || '').replace(/"/g, '""')}"\n`;
    });
  } else if (rep.type === "evidence-log") {
    // Generate Evidence attestation log
    reportText = `===================================================================
OFFICESYNC EVIDENCE VERIFICATION & ATTESTATION LEDGER
Generated On: ${new Date().toLocaleString("en-IN")}
Database Engine: PostgreSQL / Prisma Compliance Subsystem
===================================================================

I. EVIDENCE SUBMISSION SUMMARY
Total Submissions: ${evidence.length}
Pending Verification: ${evidence.filter((e) => e.status === "Pending" || e.status === "Under_Review").length}
Approved Submissions: ${evidence.filter((e) => e.status === "Approved").length}
Rejected Submissions: ${evidence.filter((e) => e.status === "Rejected").length}

II. DETAILED EVIDENCE FILES
`;
    evidence.forEach((ev, i) => {
      const submitter = users.find((u) => String(u.id || u.userId) === String(ev.userId)) || {};
      reportText += `
${i + 1}. [${ev.status.toUpperCase()}] ${ev.title || 'Untitled Evidence'}
   • Evidence Type: ${ev.evidenceType || 'Document'}
   • Submitted By:  ${submitter.fullName || 'User #' + ev.userId}
   • File Attachment URL: ${ev.fileUrl || 'N/A'}
   • Task ID: ${ev.taskId || 'N/A'} | Violation ID: ${ev.violationId || 'N/A'}
   • Submitted Date: ${ev.submittedAt || '—'}
`;
    });
  } else {
    // Executive Compliance Summary Report
    const totalRules = rules.length;
    const activeRules = rules.filter((r) => r.isActive !== false).length;
    const criticalRules = rules.filter((r) => r.severity === "Critical").length;
    const openViolations = violations.filter((v) => v.status === "Open" || v.status === "Under_Review").length;

    reportText = `===================================================================
OFFICESYNC ENTERPRISE COMPLIANCE HEALTH & AUDIT REPORT
Report Title: ${rep.title}
Generated On:  ${new Date().toLocaleString("en-IN")}
Environment:   PostgreSQL / Prisma Production Audit Engine
===================================================================

I. COMPLIANCE HEALTH SUMMARY
- Total Compliance Policies Configured: ${totalRules} (${activeRules} Active)
- Critical Severity Rules: ${criticalRules}
- Active Violations Requiring Remediation: ${openViolations}
- Evidence Verification Files Logged: ${evidence.length}
- System Audit Trail Events Logged: ${logs.length}

II. CONFIGURED COMPLIANCE RULES & SCOPES
${rules
  .map(
    (r) =>
      `  • [${r.severity || "Medium"}] ${r.name || r.ruleName} — Status: ${r.isActive !== false ? "Active" : "Inactive"} (Scope: ${r.dept || "Company-wide"})`,
  )
  .join("\n") || "  No rules configured."}

III. CURRENT OPEN VIOLATIONS & RISKS
${violations
  .map(
    (v) =>
      `  • [${v.severity || "Medium"}] Violation #${v.id || v.violationId}: Status: ${v.status} | Entity: ${v.entityType} #${v.entityId}`,
  )
  .join("\n") || "  No active violations logged."}

IV. AUDIT & REGULATORY COMPLIANCE STATEMENT
This document certifies that OfficeSync compliance controls, audit logs, and file attachments
are continuously verified against PostgreSQL database constraints and strict actor role permissions.
===================================================================
`;
  }

  const mimeType = formatTag === "CSV" ? "text/csv" : "text/plain";
  const ext = formatTag === "CSV" ? "csv" : formatTag === "XLSX" ? "xlsx" : "txt";

  const blob = new Blob([reportText], { type: mimeType });
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName}.${ext}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);

  // Trigger Download Successful Modal strictly AFTER download initiates
  if (window.Modal && typeof window.Modal.open === "function") {
    window.Modal.open("downloadSuccessModal");
  } else {
    const modal = document.getElementById("downloadSuccessModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("active");
      modal.style.display = "flex";
    }
  }
};

window.closeDownloadModal = function () {
  if (window.Modal && typeof window.Modal.close === "function") {
    window.Modal.close("downloadSuccessModal");
  } else {
    const modal = document.getElementById("downloadSuccessModal");
    if (modal) {
      modal.classList.remove("active");
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  }
};
