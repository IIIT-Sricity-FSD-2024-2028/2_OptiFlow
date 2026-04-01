/* =============================================================
   violations.js  — Compliance Violations Page
   Features:
     ✦ Search + Severity filter (queue)
     ✦ Status workflow stepper
     ✦ Linked rule chip
     ✦ Evidence links panel
     ✦ Assign Investigator modal
     ✦ Structured Escalation modal + preview
     ✦ Save Notes (persistent)
     ✦ Export Violation report
   All existing functionality (tabs, markResolved, etc.) preserved.
   ============================================================= */

/* ─── STATE ─────────────────────────────────────────────────── */
let state;
let activeViolationId = null;
let currentTabFilter = "open";

/* ─── MOCK DATA ──────────────────────────────────────────────── */
const DEFAULT_VIOLATIONS = [
  {
    id: "sox404",
    title: "SOX 404 — Variance Sign-off Missing",
    projectName: "Finance Q4 Reporting",
    policy: "SOX Section 404",
    severity: "critical",
    status: "Open",
    statusLabel: "Open",
    pm: "Arjun Mehta",
    teamLead: "Priya Sharma",
    since: "Dec 15 (3 days)",
    risk: "Regulatory Risk",
    linkedRule: "SOX Section 404",
    investigator: null,
    escalationLevel: null,
    detail:
      "The SOX Section 404 variance report for Finance Q4 requires sign-off by the Finance Head before submission. The sign-off has not been completed as of the deadline (Dec 15). The Finance Head was unavailable due to an escalation through the PM, which has been opened. Until resolved, this constitutes a compliance violation under SOX internal controls requirements.",
    resolutionNotes:
      "Monitoring closely. Finance Head has acknowledged the request per PM escalation. Sign-off expected by Dec 19. If not resolved, will escalate to regulatory team and flag for external audit preparation.",
    timeline: [
      { dot: "red", text: "Violation flagged — SOX 404 deadline missed", date: "Dec 15, 11:59 PM" },
      { dot: "yellow", text: "Escalation raised — PM Arjun notified Finance Head directly", date: "Dec 16, 9:00 AM" },
      { dot: "blue", text: "Finance Head response pending — sign-off expected by Dec 19", date: "Dec 17 (today)" },
    ],
    evidence: [
      { name: "sox_variance_report_Q4.pdf", date: "Dec 15" },
      { name: "escalation_email_thread.eml", date: "Dec 16" },
    ],
  },
  {
    id: "gdpr",
    title: "GDPR — Evidence Upload Pending",
    projectName: "Project Atlas",
    policy: "GDPR Article 17",
    severity: "warning",
    status: "Under_Review",
    statusLabel: "Under Review",
    pm: "Arjun Mehta",
    teamLead: "Rajan Pillai",
    since: "Dec 14 (4 days)",
    risk: "Data Privacy Risk",
    linkedRule: "GDPR Client Verification",
    investigator: null,
    escalationLevel: null,
    detail:
      "Project Atlas data export request for client XYZ has not had the required evidence uploaded within the mandated 48-hour window. The responsible team member has been notified twice. Evidence upload is now 4 days overdue.",
    resolutionNotes: "",
    timeline: [
      { dot: "red", text: "Violation flagged — evidence upload window expired", date: "Dec 14, 6:00 PM" },
      { dot: "yellow", text: "Under review — Team lead Rajan notified", date: "Dec 15, 10:00 AM" },
    ],
    evidence: [],
  },
  {
    id: "iso27001",
    title: "ISO 27001 — Access Log Incomplete",
    projectName: "IT Security",
    policy: "ISO 27001 Controls",
    severity: "info",
    status: "Resolved",
    statusLabel: "Resolved",
    pm: "Meena Iyer",
    teamLead: "Rahul Saxena",
    since: "Dec 12 (resolved)",
    risk: "Low — Access control",
    linkedRule: "ISO 27001 Controls",
    investigator: "Dev Kapoor",
    escalationLevel: null,
    detail:
      "The monthly access log review for the production environment was not completed by the mandated date. The logs have since been reviewed and signed off.",
    resolutionNotes: "Resolved — access logs reviewed and signed off by Rahul Saxena on Dec 12.",
    timeline: [
      { dot: "red", text: "Violation flagged — access log review overdue", date: "Dec 10" },
      { dot: "green", text: "Log review completed and signed off", date: "Dec 12" },
    ],
    evidence: [{ name: "access_log_nov_review.pdf", date: "Dec 12" }],
  },
];

/* ─── INIT ────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("violations");
  state = window.Helpers.getState();

  // Seed default violations if empty
  if (!state.complianceViolations || state.complianceViolations.length === 0) {
    state.complianceViolations = DEFAULT_VIOLATIONS;
    window.Helpers.saveState(state);
  }

  // Tab switching
  document.querySelectorAll(".pill-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".pill-tab").forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      currentTabFilter = this.dataset.tab;
      filterQueue();
    });
  });

  // Initial render
  filterQueue();
});

/* ─── TAB COUNTS ─────────────────────────────────────────────── */
function updateTabCounts() {
  const all = state.complianceViolations;
  const openCount = all.filter((v) => v.status === "Open" || v.status === "Under_Review").length;
  const resolvedCount = all.filter((v) => v.status === "Resolved").length;

  const pendingBadge = document.querySelector(".queue-pending-count");
  if (pendingBadge) pendingBadge.textContent = `${openCount} open`;

  const tabs = document.querySelectorAll(".pill-tab");
  if (tabs.length >= 3) {
    tabs[0].textContent = `Open (${openCount})`;
    tabs[1].textContent = `Resolved (${resolvedCount})`;
    tabs[2].textContent = `All (${all.length})`;
  }
}

/* ─── FILTER QUEUE (search + severity + tab) ─────────────────── */
window.filterQueue = function () {
  const searchVal = (document.getElementById("violationSearch")?.value || "").toLowerCase().trim();
  const severityVal = document.getElementById("severityFilter")?.value || "all";

  updateTabCounts();

  let data = state.complianceViolations.filter((item) => {
    // Tab filter
    if (currentTabFilter === "open") {
      if (item.status !== "Open" && item.status !== "Under_Review") return false;
    } else if (currentTabFilter === "resolved") {
      if (item.status !== "Resolved") return false;
    }
    // Severity filter
    if (severityVal !== "all" && item.severity !== severityVal) return false;
    // Search
    if (searchVal) {
      const haystack = `${item.title} ${item.projectName} ${item.policy || ""} ${item.pm || ""}`.toLowerCase();
      if (!haystack.includes(searchVal)) return false;
    }
    return true;
  });

  renderQueue(data);
};

/* ─── RENDER QUEUE ───────────────────────────────────────────── */
function renderQueue(data) {
  const list = document.getElementById("violationsList");
  if (!list) return;

  if (data.length === 0) {
    list.innerHTML = '<li class="vq-no-results">No violations match your filters.</li>';
    showEmptyDetail();
    return;
  }

  list.innerHTML = data
    .map(
      (item) => `
    <li class="vq-item" id="vqi-${item.id}" onclick="selectViolation('${item.id}')" role="button" tabindex="0">
      <div class="vq-item-title">${item.title}</div>
      <div class="vq-item-meta">${item.projectName || "System"} · ${item.pm ? "PM: " + item.pm : ""}</div>
      <div class="vq-item-badges">
        <span class="badge ${item.severity === "critical" ? "critical" : item.severity === "warning" ? "warning" : "blue"}">
          ${item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
        </span>
        <span class="badge ${item.status === "Resolved" ? "resolved" : item.status === "Under_Review" ? "yellow" : "open"}">
          ${item.statusLabel || item.status}
        </span>
      </div>
    </li>
  `,
    )
    .join("");

  // Select the first item or re-select active
  const currentlyActive = data.find((v) => String(v.id) === String(activeViolationId));
  selectViolation(currentlyActive ? currentlyActive.id : data[0].id);
}

/* ─── EMPTY STATE ────────────────────────────────────────────── */
function showEmptyDetail() {
  const vdContent = document.querySelector(".vd-content");
  const vdFooter = document.querySelector(".vd-footer");
  if (vdContent) vdContent.style.display = "none";
  if (vdFooter) vdFooter.style.display = "none";

  let emptyState = document.getElementById("violationEmptyState");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.id = "violationEmptyState";
    emptyState.style.cssText =
      "display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%; color:#94a3b8; background: #f8fafc;";
    emptyState.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;opacity:0.4">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p style="font-size:16px; font-weight:500; color:#64748b">No violations to review</p>
    `;
    const detailSection = document.getElementById("violationDetail");
    if (detailSection) detailSection.appendChild(emptyState);
  }
  emptyState.style.display = "flex";
}

/* ─── SELECT VIOLATION (populate detail panel) ───────────────── */
window.selectViolation = function (id) {
  // Restore layout if hidden
  const vdContent = document.querySelector(".vd-content");
  const vdFooter = document.querySelector(".vd-footer");
  if (vdContent) vdContent.style.display = "block";

  const emptyState = document.getElementById("violationEmptyState");
  if (emptyState) emptyState.style.display = "none";

  // Highlight active queue item
  document.querySelectorAll(".vq-item").forEach((el) => el.classList.remove("active"));
  const itemEl = document.getElementById("vqi-" + id);
  if (itemEl) itemEl.classList.add("active");

  activeViolationId = id;
  const d = state.complianceViolations.find((v) => String(v.id) === String(id));
  if (!d) return;

  /* ——— Header ——— */
  document.getElementById("vdTitle").textContent = d.title;

  // Linked rule chip
  const ruleText = document.getElementById("vdLinkedRuleText");
  if (ruleText) ruleText.textContent = d.linkedRule || d.policy || "—";

  // Badge
  const badge = document.getElementById("vdBadge");
  if (badge) {
    badge.textContent = d.severity ? d.severity.charAt(0).toUpperCase() + d.severity.slice(1) : d.statusLabel;
    badge.className = `badge ${d.severity === "critical" ? "critical" : d.severity === "warning" ? "warning" : "blue"}`;
  }

  /* ——— Stepper ——— */
  renderStepper(d.status);

  /* ——— Info grid ——— */
  setField("vdPolicy", d.policy || "—");
  setField("vdProject", d.projectName || "System");
  setField("vdPM", d.pm || "—");
  setField("vdTL", d.teamLead || "—");
  const sinceEl = document.getElementById("vdSince");
  if (sinceEl) {
    sinceEl.textContent = d.since || "—";
    sinceEl.className = d.status !== "Resolved" ? "vd-info-value danger" : "vd-info-value";
  }
  setField("vdRisk", d.risk || "—");
  setField("vdInvestigator", d.investigator || "— Unassigned —");
  setField("vdEscLevel", d.escalationLevel || "—");

  /* ——— Description ——— */
  setField("vdDescription", d.detail || "No detailed description provided.");

  /* ——— Timeline ——— */
  renderTimeline(d.timeline || []);

  /* ——— Evidence links ——— */
  renderEvidence(d.evidence || []);

  /* ——— Notes ——— */
  const notesArea = document.getElementById("vdNotes");
  if (notesArea) notesArea.value = d.resolutionNotes || "";

  /* ——— Footer visibility ——— */
  if (vdFooter) {
    vdFooter.style.display = d.status === "Resolved" ? "none" : "flex";
  }
};

/* helper */
function setField(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ─── STEPPER RENDERER ───────────────────────────────────────── */
const STEP_ORDER = ["Open", "Under_Review", "Escalated", "Resolved"];

function renderStepper(currentStatus) {
  const stepper = document.getElementById("vdStepper");
  if (!stepper) return;

  const currentIdx = STEP_ORDER.indexOf(currentStatus);
  const steps = stepper.querySelectorAll(".vd-step");
  const lines = stepper.querySelectorAll(".vd-step-line");

  steps.forEach((step, i) => {
    const stepName = step.dataset.step;
    const stepIdx = STEP_ORDER.indexOf(stepName);
    step.className = "vd-step"; // reset

    if (stepIdx < currentIdx) {
      step.classList.add("done");
    } else if (stepIdx === currentIdx) {
      if (currentStatus === "Escalated") step.classList.add("escalated");
      else if (currentStatus === "Resolved") step.classList.add("resolved");
      else step.classList.add("active");
    }
  });

  lines.forEach((line, i) => {
    line.className = "vd-step-line";
    if (i < currentIdx) line.classList.add("done");
  });
}

/* ─── TIMELINE RENDERER ──────────────────────────────────────── */
const DOT_COLORS = { red: "vd-dot-red", yellow: "vd-dot-yellow", blue: "vd-dot-blue", green: "vd-dot-green" };

function renderTimeline(items) {
  const container = document.getElementById("vdTimeline");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;">No timeline entries yet.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (t) => `
    <div class="vd-timeline-item">
      <span class="vd-timeline-dot ${DOT_COLORS[t.dot] || "vd-dot-blue"}" aria-label="${t.dot}"></span>
      <div class="vd-timeline-body">
        <div class="vd-timeline-text">${t.text}</div>
        <div class="vd-timeline-date">${t.date}</div>
      </div>
    </div>
  `,
    )
    .join("");
}

/* ─── EVIDENCE RENDERER ──────────────────────────────────────── */
const ICON_BY_EXT = {
  pdf: "ri-file-pdf-line",
  eml: "ri-mail-line",
  docx: "ri-file-word-line",
  xlsx: "ri-file-excel-line",
  png: "ri-image-line",
  jpg: "ri-image-line",
};

function renderEvidence(items) {
  const list = document.getElementById("vdEvidenceList");
  if (!list) return;

  if (!items.length) {
    list.innerHTML = '<li class="vd-evidence-empty">No evidence linked yet.</li>';
    return;
  }

  list.innerHTML = items
    .map((ev) => {
      const ext = ev.name.split(".").pop().toLowerCase();
      const icon = ICON_BY_EXT[ext] || "ri-file-line";
      return `
      <li class="vd-evidence-item">
        <i class="${icon}"></i>
        <span>${ev.name}</span>
        <span class="vd-evidence-date">${ev.date || ""}</span>
      </li>`;
    })
    .join("");
}

/* ─── SAVE NOTES ─────────────────────────────────────────────── */
window.saveNotes = function () {
  const notesArea = document.getElementById("vdNotes");
  if (!notesArea) return;

  const idx = state.complianceViolations.findIndex((v) => String(v.id) === String(activeViolationId));
  if (idx > -1) {
    state.complianceViolations[idx].resolutionNotes = notesArea.value;
    window.Helpers.saveState(state);
    if (window.Toast) window.Toast.show("Notes saved successfully.", "success");
  }
};

/* ─── MARK RESOLVED ──────────────────────────────────────────── */
window.markResolved = function () {
  if (confirm("Mark this violation as resolved?")) {
    const idx = state.complianceViolations.findIndex((v) => String(v.id) === String(activeViolationId));
    if (idx > -1) {
      state.complianceViolations[idx].status = "Resolved";
      state.complianceViolations[idx].statusLabel = "Resolved";

      const notesArea = document.getElementById("vdNotes");
      if (notesArea) state.complianceViolations[idx].resolutionNotes = notesArea.value;

      // Add timeline entry
      const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      (state.complianceViolations[idx].timeline = state.complianceViolations[idx].timeline || []).push({
        dot: "green",
        text: "Violation marked as resolved by Compliance Officer",
        date: now,
      });

      window.Helpers.saveState(state);
      if (window.Toast) window.Toast.show("Violation marked as resolved.", "success");
      filterQueue();
    }
  }
};

/* ─── VIEW PROJECT ───────────────────────────────────────────── */
window.viewProject = function () {
  if (window.Toast) window.Toast.show("Redirecting to Project detail view…", "info");
};

/* ─── ASSIGN INVESTIGATOR MODAL ──────────────────────────────── */
window.openAssignModal = function () {
  const sel = document.getElementById("investigatorSelect");
  if (sel) {
    // Pre-select current investigator if set
    const d = state.complianceViolations.find((v) => String(v.id) === String(activeViolationId));
    if (d && d.investigator) sel.value = d.investigator;
    else sel.value = "";
  }
  const note = document.getElementById("assignNote");
  if (note) note.value = "";
  setError("investigatorError", false);
  openModal("assignModal");
};

window.closeAssignModal = function () {
  closeModal("assignModal");
};

window.saveAssignment = function () {
  const sel = document.getElementById("investigatorSelect");
  if (!sel || !sel.value) {
    setError("investigatorError", true);
    return;
  }
  setError("investigatorError", false);

  const investigator = sel.value;
  const idx = state.complianceViolations.findIndex((v) => String(v.id) === String(activeViolationId));
  if (idx > -1) {
    state.complianceViolations[idx].investigator = investigator;
    // Update status to Under_Review if still Open
    if (state.complianceViolations[idx].status === "Open") {
      state.complianceViolations[idx].status = "Under_Review";
      state.complianceViolations[idx].statusLabel = "Under Review";
    }
    // Add timeline entry
    const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    (state.complianceViolations[idx].timeline = state.complianceViolations[idx].timeline || []).push({
      dot: "blue",
      text: `Investigator assigned: ${investigator}`,
      date: now,
    });

    window.Helpers.saveState(state);
    if (window.Toast) window.Toast.show(`Assigned to ${investigator}.`, "success");
    closeModal("assignModal");
    // Re-render detail
    selectViolation(activeViolationId);
    filterQueue();
  }
};

/* ─── ESCALATION MODAL ───────────────────────────────────────── */
window.openEscalateModal = function () {
  document.getElementById("escalationLevel").value = "";
  document.getElementById("escalationReason").value = "";
  document.getElementById("escalationNotify").value = "";
  document.getElementById("escalationPreview").style.display = "none";
  setError("escalationLevelError", false);
  setError("escalationReasonError", false);
  openModal("escalateModal");
};

window.closeEscalateModal = function () {
  closeModal("escalateModal");
};

window.previewEscalation = function () {
  const level = document.getElementById("escalationLevel").value;
  const reason = document.getElementById("escalationReason").value.trim();
  let valid = true;

  if (!level) { setError("escalationLevelError", true); valid = false; }
  else setError("escalationLevelError", false);

  if (!reason) { setError("escalationReasonError", true); valid = false; }
  else setError("escalationReasonError", false);

  if (!valid) return;

  const d = state.complianceViolations.find((v) => String(v.id) === String(activeViolationId));
  const title = d ? d.title : "Selected violation";
  const notify = document.getElementById("escalationNotify").value.trim();

  const preview = document.getElementById("escalationPreview");
  const previewText = document.getElementById("escalationPreviewText");
  previewText.textContent = `"${title}" will be escalated to ${level}. ${notify ? "Notifications will be sent to: " + notify + "." : "No additional notifications."}`;
  preview.style.display = "flex";
};

window.confirmEscalation = function () {
  const level = document.getElementById("escalationLevel").value;
  const reason = document.getElementById("escalationReason").value.trim();
  let valid = true;

  if (!level) { setError("escalationLevelError", true); valid = false; }
  else setError("escalationLevelError", false);

  if (!reason) { setError("escalationReasonError", true); valid = false; }
  else setError("escalationReasonError", false);

  if (!valid) return;

  const idx = state.complianceViolations.findIndex((v) => String(v.id) === String(activeViolationId));
  if (idx > -1) {
    state.complianceViolations[idx].status = "Escalated";
    state.complianceViolations[idx].statusLabel = "Escalated";
    state.complianceViolations[idx].escalationLevel = level;

    const now = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    (state.complianceViolations[idx].timeline = state.complianceViolations[idx].timeline || []).push({
      dot: "red",
      text: `Escalated to ${level} — ${reason.substring(0, 80)}${reason.length > 80 ? "…" : ""}`,
      date: now,
    });

    window.Helpers.saveState(state);
    if (window.Toast) window.Toast.show(`Violation escalated to ${level}.`, "warning");
    closeModal("escalateModal");
    selectViolation(activeViolationId);
    filterQueue();
  }
};

/* ─── EXPORT VIOLATION ───────────────────────────────────────── */
window.exportViolation = function () {
  const d = state.complianceViolations.find((v) => String(v.id) === String(activeViolationId));
  if (!d) return;

  const lines = [
    "COMPLIANCE VIOLATION REPORT",
    "=".repeat(50),
    `Title         : ${d.title}`,
    `Policy        : ${d.policy || "—"}`,
    `Project       : ${d.projectName || "—"}`,
    `Status        : ${d.statusLabel || d.status}`,
    `Severity      : ${d.severity || "—"}`,
    `PM            : ${d.pm || "—"}`,
    `Team Leader   : ${d.teamLead || "—"}`,
    `Investigator  : ${d.investigator || "Unassigned"}`,
    `Esc. Level    : ${d.escalationLevel || "None"}`,
    `Violation Since: ${d.since || "—"}`,
    `Risk          : ${d.risk || "—"}`,
    "",
    "DESCRIPTION",
    "-".repeat(40),
    d.detail || "No description.",
    "",
    "RESOLUTION NOTES",
    "-".repeat(40),
    d.resolutionNotes || "None.",
    "",
    "TIMELINE",
    "-".repeat(40),
    ...(d.timeline || []).map((t) => `[${t.date}] ${t.text}`),
    "",
    "LINKED EVIDENCE",
    "-".repeat(40),
    ...((d.evidence || []).length ? (d.evidence || []).map((e) => `• ${e.name} (${e.date})`) : ["No evidence linked."]),
    "",
    `Exported: ${new Date().toLocaleString()}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `violation_${d.id}_report.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (window.Toast) window.Toast.show("Violation report exported.", "success");
};

/* ─── MODAL HELPERS ──────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("active");
}

function setError(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = show ? "block" : "none";
  const input = el.previousElementSibling;
  if (input) {
    if (show) input.classList.add("is-invalid");
    else input.classList.remove("is-invalid");
  }
}

/* ─── KEPT FOR EXTERNAL BACKWARD-COMPAT ──────────────────────── */
// The old escalateViolation was a direct confirm(). It is now replaced by
// openEscalateModal(), but we keep the name as an alias just in case.
window.escalateViolation = window.openEscalateModal;
