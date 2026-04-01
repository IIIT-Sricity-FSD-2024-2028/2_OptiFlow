/* =============================================================
   evidence.js  —  Compliance Evidence Page
   Features:
     • Dynamic queue with search + filter
     • Review Workflow Stepper
     • Chain-of-Custody Timeline
     • Reviewer Notes (persisted in state)
     • Request-More-Info modal (with type + message + deadline)
     • Reject modal (with reason dropdown + notes)
     • Evidence export report
     • All original behaviours preserved
   ============================================================= */

// ─── STATE ────────────────────────────────────────────────────
let state;
let activeEvidenceId = null;

// Internal mock data (fallback when state.evidence is empty)
const MOCK_EVIDENCE = [
  {
    id: "gdpr",
    title: "GDPR Evidence Package",
    status: "pending",
    statusLabel: "Pending",
    urgency: "urgent",
    type: "GDPR",
    submittedOn: "Today",
    taskName: "Project Atlas",
    userId: "u3",
    submitterName: "Kiran Rao (TL)",
    complianceRule: "GDPR Verification",
    deadline: "Today EOD",
    stage: "Stage 2 of 3",
    notes:
      "Evidence package includes data audit results, GDPR verification checklist, and client consent records. Note: client cross-verification step (subtask 3) is still blocked due to access issue — IT escalation is in progress.",
    reviewerNotes: "",
    file: "GDPR_Evidence_Package.pdf",
    checklist: [
      { label: "Data audit report submitted", done: true, blocked: false },
      { label: "Client consent records attached", done: false, blocked: false },
      {
        label: "GDPR verification checklist completed",
        done: true,
        blocked: false,
      },
      {
        label: "Client cross-verification (blocked — access pending)",
        done: false,
        blocked: true,
      },
    ],
    timeline: [
      {
        icon: "submit",
        label: "Evidence submitted by Kiran Rao",
        meta: "Today, 10:22 AM",
      },
      {
        icon: "review",
        label: "Picked up for review by Compliance Officer",
        meta: "Today, 10:45 AM",
      },
    ],
  },
  {
    id: "sox",
    title: "SOX Variance Report",
    status: "pending",
    statusLabel: "Due Soon",
    urgency: "due-soon",
    type: "SOX",
    submittedOn: "Yesterday",
    taskName: "Finance Q4",
    userId: "u5",
    submitterName: "Priya Sharma (TL)",
    complianceRule: "SOX Section 404",
    deadline: "Tomorrow, EOD",
    stage: "Stage 1 of 2",
    notes:
      "Variance report covers all Finance Q4 transactions above $50k threshold. Supporting sign-offs from four department heads are attached.",
    reviewerNotes: "",
    file: "SOX_Variance_Report.pdf",
    checklist: [
      { label: "Variance report attached", done: true, blocked: false },
      {
        label: "Department head sign-offs included",
        done: true,
        blocked: false,
      },
      {
        label: "Internal auditor review complete",
        done: false,
        blocked: false,
      },
    ],
    timeline: [
      {
        icon: "submit",
        label: "Evidence submitted by Priya Sharma",
        meta: "Yesterday, 3:10 PM",
      },
    ],
  },
  {
    id: "iso",
    title: "ISO 27001 Control Check",
    status: "pending",
    statusLabel: "Pending",
    urgency: "pending",
    type: "ISO 27001",
    submittedOn: "Dec 15",
    taskName: "IT Security",
    userId: "u6",
    submitterName: "Sunita Rao (TL)",
    complianceRule: "ISO 27001 Controls",
    deadline: "Dec 20",
    stage: "Stage 1 of 3",
    notes:
      "Monthly access log reviews and server hardening audits submitted. Penetration test report pending external vendor delivery.",
    reviewerNotes: "",
    file: "ISO27001_Control_Check.pdf",
    checklist: [
      { label: "Access log review attached", done: true, blocked: false },
      { label: "Server hardening audit submitted", done: true, blocked: false },
      {
        label: "Penetration test report (pending vendor)",
        done: false,
        blocked: true,
      },
    ],
    timeline: [
      {
        icon: "submit",
        label: "Evidence submitted by Sunita Rao",
        meta: "Dec 15, 9:00 AM",
      },
    ],
  },
  {
    id: "hr",
    title: "HR Policy Checklist",
    status: "approved",
    statusLabel: "Approved",
    urgency: "pending",
    type: "HR Policy",
    submittedOn: "Dec 14",
    taskName: "Onboarding Overhaul",
    userId: "u3",
    submitterName: "Kiran Rao (TL)",
    complianceRule: "HR Onboarding Policy",
    deadline: "Completed",
    stage: "Stage 3 of 3",
    notes:
      "All HR onboarding checklist items verified and signed off. New hire policy acknowledgement forms attached.",
    reviewerNotes:
      "All items verified. No issues found. Approved without further action.",
    file: "HR_Policy_Checklist.pdf",
    checklist: [
      {
        label: "Policy acknowledgement forms received",
        done: true,
        blocked: false,
      },
      {
        label: "Background check clearance attached",
        done: true,
        blocked: false,
      },
      { label: "Signed NDA attached", done: true, blocked: false },
    ],
    timeline: [
      {
        icon: "submit",
        label: "Evidence submitted by Kiran Rao",
        meta: "Dec 14, 11:00 AM",
      },
      { icon: "review", label: "Assigned for review", meta: "Dec 14, 2:00 PM" },
      {
        icon: "approve",
        label: "Evidence approved by Compliance Officer",
        meta: "Dec 14, 4:30 PM",
      },
    ],
  },
  {
    id: "proc",
    title: "Procurement Audit Trail",
    status: "rejected",
    statusLabel: "Rejected",
    urgency: "pending",
    type: "Internal",
    submittedOn: "Dec 13",
    taskName: "Procurement Review",
    userId: "u5",
    submitterName: "Priya Sharma (TL)",
    complianceRule: "Internal Procurement Policy",
    deadline: "Re-submit by Dec 18",
    stage: "Rejected — Awaiting Re-submission",
    notes:
      "Procurement audit trail submitted for Q4 review cycle. Includes vendor comparison matrix and PO approvals.",
    reviewerNotes:
      "Missing senior management sign-off on POs above $100k threshold. Returned for revision.",
    file: "Procurement_Audit_Trail.pdf",
    checklist: [
      {
        label: "Vendor comparison matrix attached",
        done: true,
        blocked: false,
      },
      { label: "PO approvals included", done: true, blocked: false },
      {
        label: "Senior management sign-off (>$100k)",
        done: false,
        blocked: false,
      },
    ],
    timeline: [
      {
        icon: "submit",
        label: "Evidence submitted by Priya Sharma",
        meta: "Dec 13, 8:15 AM",
      },
      {
        icon: "review",
        label: "Review started by Compliance Officer",
        meta: "Dec 13, 10:00 AM",
      },
      {
        icon: "info",
        label: "Additional information requested",
        meta: "Dec 13, 11:30 AM",
      },
      {
        icon: "reject",
        label: "Evidence rejected — missing sign-off",
        meta: "Dec 13, 3:00 PM",
      },
    ],
  },
];

// ─── INITIALISATION ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("evidence");
  state = window.Helpers.getState();

  // Seed mock evidence if state has none
  if (!state.evidence || state.evidence.length === 0) {
    state.evidence = MOCK_EVIDENCE;
    window.Helpers.saveState(state);
  }

  // Tab switching
  document.querySelectorAll(".queue-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".queue-tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      applyFilters();
    });
  });

  // Live search
  const searchInput = document.getElementById("evSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  // Policy + urgency dropdowns
  const policyFilter = document.getElementById("evPolicyFilter");
  if (policyFilter) policyFilter.addEventListener("change", applyFilters);

  const urgencyFilter = document.getElementById("evUrgencyFilter");
  if (urgencyFilter) urgencyFilter.addEventListener("change", applyFilters);

  // Default deadline for request-info modal (tomorrow)
  const deadlineInput = document.getElementById("reqInfoDeadline");
  if (deadlineInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    deadlineInput.value = tomorrow.toISOString().split("T")[0];
  }

  // Close modals on overlay click
  ["requestInfoModal", "rejectModal", "downloadSuccessModal"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", function (e) {
        if (e.target === this) this.classList.remove("active");
      });
    }
  });

  applyFilters();
});

// ─── TAB COUNT UPDATE ──────────────────────────────────────────
function updateTabCounts() {
  const evidence = state.evidence || [];
  const allCount = evidence.length;
  const pendingCount = evidence.filter(
    (e) => e.status === "pending" || e.status === "under_review",
  ).length;
  const reviewedCount = evidence.filter(
    (e) => e.status === "approved" || e.status === "rejected",
  ).length;

  const pendingBadge = document.getElementById("queuePendingCount");
  if (pendingBadge) pendingBadge.textContent = `${pendingCount} pending`;

  const tabs = document.querySelectorAll(".queue-tab");
  if (tabs.length >= 3) {
    tabs[0].textContent = `All (${allCount})`;
    tabs[1].textContent = `Pending (${pendingCount})`;
    tabs[2].textContent = `Reviewed (${reviewedCount})`;
  }
}

// ─── FILTER ENGINE ─────────────────────────────────────────────
function applyFilters() {
  updateTabCounts();

  const activeTab =
    (document.querySelector(".queue-tab.active") || {}).dataset?.tab || "all";
  const searchTerm = (document.getElementById("evSearchInput")?.value || "")
    .toLowerCase()
    .trim();
  const policyVal = document.getElementById("evPolicyFilter")?.value || "all";
  const urgencyVal = document.getElementById("evUrgencyFilter")?.value || "all";

  const evidence = state.evidence || [];

  let filtered = evidence.filter((item) => {
    // Tab filter
    if (
      activeTab === "pending" &&
      item.status !== "pending" &&
      item.status !== "under_review"
    )
      return false;
    if (
      activeTab === "reviewed" &&
      item.status !== "approved" &&
      item.status !== "rejected"
    )
      return false;

    // Search
    if (
      searchTerm &&
      !item.title.toLowerCase().includes(searchTerm) &&
      !(item.taskName || "").toLowerCase().includes(searchTerm) &&
      !(item.submitterName || "").toLowerCase().includes(searchTerm)
    )
      return false;

    // Policy
    if (
      policyVal !== "all" &&
      (item.type || "").toLowerCase() !== policyVal.toLowerCase()
    )
      return false;

    // Urgency
    if (urgencyVal !== "all" && (item.urgency || "pending") !== urgencyVal)
      return false;

    return true;
  });

  renderQueue(filtered);
}

// ─── RENDER QUEUE ──────────────────────────────────────────────
function renderQueue(filteredData) {
  const list = document.getElementById("queueList");
  if (!list) return;

  if (!filteredData || filteredData.length === 0) {
    list.innerHTML = `<li class="ev-no-results">No evidence matches your filters.</li>`;
    showEmptyDetail();
    return;
  }

  list.innerHTML = filteredData
    .map((item) => {
      const urgencyBadge =
        item.urgency === "urgent"
          ? `<span class="badge urgent">Urgent</span>`
          : item.urgency === "due-soon"
            ? `<span class="badge due-soon">Due soon</span>`
            : `<span class="badge pending">${item.statusLabel || "Pending"}</span>`;

      const reviewedBadge =
        item.status === "approved"
          ? `<span class="badge approved">Approved</span>`
          : item.status === "rejected"
            ? `<span class="badge rejected-status">Rejected</span>`
            : null;

      return `
      <li class="queue-item" id="qi-${item.id}"
          onclick="selectEvidence('${item.id}')"
          role="button" tabindex="0"
          onkeydown="if(event.key==='Enter')selectEvidence('${item.id}')">
        <div class="queue-item-header">
          <span class="queue-item-title">${item.title}</span>
          <span class="queue-item-date">${item.submittedOn || "Recently"}</span>
        </div>
        <div class="queue-item-meta">${item.taskName || "General"} · ${item.submitterName || "System"}</div>
        <div class="queue-item-badges">
          ${reviewedBadge || urgencyBadge}
          <span class="badge policy">${item.type || "General"}</span>
        </div>
      </li>`;
    })
    .join("");

  // Auto-select first item
  selectEvidence(filteredData[0].id);
}

// ─── EMPTY DETAIL STATE ────────────────────────────────────────
function showEmptyDetail() {
  const detailContent = document.querySelector(".detail-content");
  const detailFooter = document.querySelector(".detail-footer");
  if (detailContent) detailContent.style.display = "none";
  if (detailFooter) detailFooter.style.display = "none";

  let emptyState = document.getElementById("evidenceEmptyState");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.id = "evidenceEmptyState";
    emptyState.style.cssText =
      "display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%; color:#94a3b8; background:#f8fafc;";
    emptyState.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;opacity:0.4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <p style="font-size:16px; font-weight:500; color:#64748b">No evidence to review</p>
      <p style="font-size:13px; color:#94a3b8; margin-top:6px;">Try adjusting your filters or search term.</p>`;
    const detailSection = document.getElementById("evidenceDetail");
    if (detailSection) detailSection.appendChild(emptyState);
  }
  emptyState.style.display = "flex";
}

// ─── SELECT & RENDER EVIDENCE DETAIL ───────────────────────────
window.selectEvidence = function (id) {
  // Restore layout
  const detailContent = document.querySelector(".detail-content");
  const detailFooter = document.querySelector(".detail-footer");
  if (detailContent) detailContent.style.display = "block";
  if (detailFooter) detailFooter.style.display = "flex";

  const emptyState = document.getElementById("evidenceEmptyState");
  if (emptyState) emptyState.style.display = "none";

  // Highlight queue item
  document
    .querySelectorAll(".queue-item")
    .forEach((el) => el.classList.remove("active"));
  const itemEl = document.getElementById("qi-" + id);
  if (itemEl) itemEl.classList.add("active");

  activeEvidenceId = id;
  const d = (state.evidence || []).find((e) => String(e.id) === String(id));
  if (!d) return;

  // ── Header
  document.getElementById("detailTitle").textContent = d.title;

  const linkedRuleText = document.getElementById("evLinkedRuleText");
  if (linkedRuleText)
    linkedRuleText.textContent = d.complianceRule || d.type || "General Policy";

  // ── Detail Badge
  const detailBadge = document.getElementById("detailBadge");
  if (detailBadge) {
    if (d.status === "approved") {
      detailBadge.className = "badge approved";
      detailBadge.textContent = "Approved";
    } else if (d.status === "rejected") {
      detailBadge.className = "badge rejected-status";
      detailBadge.textContent = "Rejected";
    } else if (d.urgency === "urgent") {
      detailBadge.className = "badge urgent";
      detailBadge.textContent = "Urgent";
    } else if (d.urgency === "due-soon") {
      detailBadge.className = "badge due-soon";
      detailBadge.textContent = "Due Soon";
    } else {
      detailBadge.className = "badge pending";
      detailBadge.textContent = "Pending";
    }
  }

  // ── Stepper
  renderStepper(d.status);

  // ── Meta grid
  const metaSubmitter = document.getElementById("metaSubmitter");
  const metaProject = document.getElementById("metaProject");
  const metaRule = document.getElementById("metaRule");
  const metaSubmittedOn = document.getElementById("metaSubmittedOn");
  const metaDeadline = document.getElementById("metaDeadline");
  const metaStage = document.getElementById("metaStage");

  if (metaSubmitter) metaSubmitter.textContent = d.submitterName || "Unknown";
  if (metaProject) metaProject.textContent = d.taskName || "N/A";
  if (metaRule)
    metaRule.textContent = d.complianceRule || d.type || "General Policy";
  if (metaSubmittedOn)
    metaSubmittedOn.textContent = d.submittedOn || "Recently";
  if (metaDeadline) metaDeadline.textContent = d.deadline || "N/A";
  if (metaStage) metaStage.textContent = d.stage || "Stage 1";

  // ── Submitter Notes
  const submitterNotes = document.getElementById("submitterNotes");
  if (submitterNotes)
    submitterNotes.textContent = d.notes || "No submitter notes provided.";

  // ── Attached Files
  const attachedFiles = document.getElementById("attachedFiles");
  if (attachedFiles) {
    attachedFiles.innerHTML = `
      <div class="attached-file-item">
        <svg class="file-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div class="file-info">
          <div class="file-name">${d.file || "attached_document.pdf"}</div>
          <div class="file-size">Compliance Evidence</div>
        </div>
        <button class="file-download-btn" onclick="downloadEvidence()" aria-label="Download ${d.file || "file"}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>`;
  }

  // ── Compliance Checklist
  renderChecklist(d.checklist || []);

  // ── Reviewer Notes
  const reviewerNotes = document.getElementById("reviewerNotes");
  if (reviewerNotes) reviewerNotes.value = d.reviewerNotes || "";

  // ── Chain-of-Custody Timeline
  renderTimeline(d.timeline || []);

  // ── Footer visibility (hide for resolved/approved/rejected)
  const isDecided = d.status === "approved" || d.status === "rejected";
  if (detailFooter) detailFooter.style.display = isDecided ? "none" : "flex";
};

// ─── STEPPER RENDERER ──────────────────────────────────────────
function renderStepper(status) {
  const stepSubmitted = document.getElementById("evStep-submitted");
  const stepReview = document.getElementById("evStep-review");
  const stepDecision = document.getElementById("evStep-decision");
  const line1 = document.getElementById("evLine1");
  const line2 = document.getElementById("evLine2");

  if (!stepSubmitted || !stepReview || !stepDecision) return;

  // Reset
  [stepSubmitted, stepReview, stepDecision].forEach((s) => {
    s.className = "ev-step";
  });
  [line1, line2].forEach((l) => {
    if (l) l.className = "ev-step-line";
  });

  if (status === "pending" || status === "under_review") {
    stepSubmitted.classList.add("done");
    stepReview.classList.add("active");
    stepDecision.querySelector(".ev-step-label").textContent = "Decision";
    if (line1) line1.classList.add("done");
  } else if (status === "approved") {
    stepSubmitted.classList.add("done");
    stepReview.classList.add("done");
    stepDecision.classList.add("approved");
    stepDecision.querySelector(".ev-step-label").textContent = "Approved ✓";
    if (line1) line1.classList.add("done");
    if (line2) line2.classList.add("done");
  } else if (status === "rejected") {
    stepSubmitted.classList.add("done");
    stepReview.classList.add("done");
    stepDecision.classList.add("rejected");
    stepDecision.querySelector(".ev-step-label").textContent = "Rejected";
    if (line1) line1.classList.add("done");
    if (line2) line2.classList.add("done");
  } else if (status === "info_requested") {
    stepSubmitted.classList.add("done");
    stepReview.classList.add("info-requested");
    stepDecision.querySelector(".ev-step-label").textContent = "Decision";
    if (line1) line1.classList.add("done");
  } else {
    // Default — submitted only
    stepSubmitted.classList.add("active");
  }
}

// ─── CHECKLIST RENDERER ────────────────────────────────────────
function renderChecklist(items) {
  const container = document.getElementById("complianceChecklist");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<p style="font-size:13px; color:var(--text-muted)">No checklist items defined.</p>`;
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
    <div class="checklist-item${item.blocked ? " blocked" : ""}"
         onclick="${item.blocked ? "" : "toggleCheckbox(this)"}">
      <span class="check-icon ${item.done ? "checked" : "unchecked"}" aria-label="${item.done ? "Completed" : "Incomplete"}">
        ${item.done ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ""}
      </span>
      <span>${item.label}</span>
      ${item.blocked ? `<i class="ri-lock-line" style="margin-left:auto; font-size:13px; color:var(--text-muted);" title="Blocked"></i>` : ""}
    </div>`,
    )
    .join("");
}

// ─── TIMELINE RENDERER ─────────────────────────────────────────
function renderTimeline(timeline) {
  const container = document.getElementById("evTimeline");
  if (!container) return;

  if (!timeline.length) {
    container.innerHTML = `<div class="ev-timeline-empty">No custody events recorded yet.</div>`;
    return;
  }

  const iconMap = {
    submit: { cls: "ev-icon-submit", icon: "ri-upload-2-line" },
    review: { cls: "ev-icon-review", icon: "ri-eye-line" },
    approve: { cls: "ev-icon-approve", icon: "ri-checkbox-circle-line" },
    reject: { cls: "ev-icon-reject", icon: "ri-close-circle-line" },
    info: { cls: "ev-icon-info", icon: "ri-question-line" },
    update: { cls: "ev-icon-update", icon: "ri-edit-line" },
  };

  container.innerHTML = timeline
    .map((evt) => {
      const ic = iconMap[evt.icon] || iconMap.update;
      return `
      <div class="ev-timeline-item">
        <div class="ev-timeline-icon ${ic.cls}">
          <i class="${ic.icon}"></i>
        </div>
        <div class="ev-timeline-body">
          <div class="ev-timeline-text">${evt.label}</div>
          <div class="ev-timeline-meta">${evt.meta || ""}</div>
        </div>
      </div>`;
    })
    .join("");
}

// ─── REVIEWER NOTES SAVE ───────────────────────────────────────
window.saveReviewerNotes = function () {
  const idx = (state.evidence || []).findIndex(
    (e) => String(e.id) === String(activeEvidenceId),
  );
  if (idx > -1) {
    const notesEl = document.getElementById("reviewerNotes");
    state.evidence[idx].reviewerNotes = notesEl ? notesEl.value : "";
    window.Helpers.saveState(state);
    if (window.Toast) window.Toast.show("Reviewer notes saved.", "success");
  }
};

// ─── REQUEST MORE INFO MODAL ───────────────────────────────────
window.openRequestInfoModal = function () {
  if (!activeEvidenceId) return;
  document.getElementById("reqInfoMessage").value = "";
  document.getElementById("reqInfoMessage").classList.remove("is-invalid");
  document.getElementById("requestInfoModal").classList.add("active");
};

window.closeRequestInfoModal = function () {
  document.getElementById("requestInfoModal").classList.remove("active");
};

window.sendInfoRequest = function () {
  const messageEl = document.getElementById("reqInfoMessage");
  const msg = (messageEl?.value || "").trim();

  if (!msg) {
    messageEl.classList.add("is-invalid");
    return;
  }
  messageEl.classList.remove("is-invalid");

  const typeEl = document.getElementById("reqInfoType");
  const deadlineEl = document.getElementById("reqInfoDeadline");

  const reqType = typeEl?.options[typeEl.selectedIndex]?.text || "Information";
  const deadline = deadlineEl?.value || "No deadline set";

  // Update state
  const idx = (state.evidence || []).findIndex(
    (e) => String(e.id) === String(activeEvidenceId),
  );
  if (idx > -1) {
    const ev = state.evidence[idx];
    ev.status = "info_requested";
    ev.statusLabel = "Info Requested";

    // Add timeline event
    if (!ev.timeline) ev.timeline = [];
    ev.timeline.push({
      icon: "info",
      label: `Additional information requested: ${reqType}`,
      meta: `Now · Deadline: ${deadline}`,
    });

    // Notify submitter
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({
      id: Date.now(),
      userId: ev.userId,
      type: "warning",
      title: "More Information Requested",
      message: `Compliance has requested: "${msg}" for your submission "${ev.title}". Deadline: ${deadline}.`,
      time: "Just now",
      isRead: false,
    });

    window.Helpers.saveState(state);
    renderStepper("info_requested");
    renderTimeline(ev.timeline);
  }

  closeRequestInfoModal();
  if (window.Toast)
    window.Toast.show("Information request sent to submitter.", "info");
  applyFilters();
};

// ─── REJECT MODAL ─────────────────────────────────────────────
window.openRejectModal = function () {
  if (!activeEvidenceId) return;
  document.getElementById("rejectReason").value = "";
  document.getElementById("rejectReason").classList.remove("is-invalid");
  document.getElementById("rejectNotes").value = "";
  document.getElementById("rejectModal").classList.add("active");
};

window.closeRejectModal = function () {
  document.getElementById("rejectModal").classList.remove("active");
};

window.confirmReject = function () {
  const reasonEl = document.getElementById("rejectReason");
  const reason = reasonEl?.value;

  if (!reason) {
    reasonEl.classList.add("is-invalid");
    return;
  }
  reasonEl.classList.remove("is-invalid");

  const reasonText = reasonEl.options[reasonEl.selectedIndex].text;
  const notes = document.getElementById("rejectNotes")?.value || "";

  const idx = (state.evidence || []).findIndex(
    (e) => String(e.id) === String(activeEvidenceId),
  );
  if (idx > -1) {
    const ev = state.evidence[idx];
    ev.status = "rejected";
    ev.statusLabel = "Rejected";

    // Timeline event
    if (!ev.timeline) ev.timeline = [];
    ev.timeline.push({
      icon: "reject",
      label: `Evidence rejected — ${reasonText}`,
      meta: "Now" + (notes ? ` · Note: ${notes}` : ""),
    });

    // Store reviewer notes
    if (notes) ev.reviewerNotes = notes;

    // Notify submitter
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({
      id: Date.now(),
      userId: ev.userId,
      type: "error",
      title: "Evidence Rejected",
      message: `Your submission "${ev.title}" was rejected. Reason: ${reasonText}.${notes ? " Note: " + notes : ""}`,
      time: "Just now",
      isRead: false,
    });

    window.Helpers.saveState(state);
    renderStepper("rejected");
    renderTimeline(ev.timeline);

    const reviewerNotesEl = document.getElementById("reviewerNotes");
    if (reviewerNotesEl) reviewerNotesEl.value = ev.reviewerNotes;

    // Hide footer
    const footer = document.querySelector(".detail-footer");
    if (footer) footer.style.display = "none";
  }

  closeRejectModal();
  if (window.Toast)
    window.Toast.show("Evidence rejected and submitter notified.", "error");
  applyFilters();
};

// ─── APPROVE ──────────────────────────────────────────────────
window.approveEvidence = function () {
  if (
    confirm(
      "Approve this evidence submission?\n\nThis action will be logged in the audit trail.",
    )
  ) {
    const idx = (state.evidence || []).findIndex(
      (e) => String(e.id) === String(activeEvidenceId),
    );
    if (idx > -1) {
      const ev = state.evidence[idx];
      ev.status = "approved";
      ev.statusLabel = "Approved";

      if (!ev.timeline) ev.timeline = [];
      ev.timeline.push({
        icon: "approve",
        label: "Evidence approved by Compliance Officer",
        meta: "Now",
      });

      if (!state.notifications) state.notifications = [];
      state.notifications.unshift({
        id: Date.now(),
        userId: ev.userId,
        type: "success",
        title: "Evidence Approved",
        message: `Your submission "${ev.title}" was approved by Compliance.`,
        time: "Just now",
        isRead: false,
      });

      window.Helpers.saveState(state);
      renderStepper("approved");
      renderTimeline(ev.timeline);

      // Hide footer
      const footer = document.querySelector(".detail-footer");
      if (footer) footer.style.display = "none";
    }

    if (window.Toast)
      window.Toast.show("Evidence approved successfully.", "success");
    applyFilters();
  }
};

// ─── DOWNLOAD ─────────────────────────────────────────────────
window.downloadEvidence = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.add("active");
};

window.closeDownloadModal = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.remove("active");
};

// ─── EXPORT REPORT ────────────────────────────────────────────
window.exportEvidenceReport = function () {
  const d = (state.evidence || []).find(
    (e) => String(e.id) === String(activeEvidenceId),
  );
  if (!d) {
    if (window.Toast)
      window.Toast.show("No evidence selected for export.", "error");
    return;
  }

  // Build a simple text report
  const lines = [
    "COMPLIANCE EVIDENCE REPORT",
    "=".repeat(45),
    `Title       : ${d.title}`,
    `Type/Policy : ${d.type || "N/A"}`,
    `Rule        : ${d.complianceRule || "N/A"}`,
    `Project     : ${d.taskName || "N/A"}`,
    `Submitter   : ${d.submitterName || "N/A"}`,
    `Submitted   : ${d.submittedOn || "N/A"}`,
    `Deadline    : ${d.deadline || "N/A"}`,
    `Status      : ${d.statusLabel || d.status}`,
    "",
    "SUBMITTER NOTES:",
    d.notes || "None",
    "",
    "REVIEWER NOTES:",
    d.reviewerNotes || "None",
    "",
    "CHAIN OF CUSTODY:",
    ...(d.timeline || []).map((t) => `  [${t.meta}] ${t.label}`),
    "",
    "CHECKLIST:",
    ...(d.checklist || []).map(
      (c) =>
        `  [${c.done ? "X" : " "}] ${c.label}${c.blocked ? " (BLOCKED)" : ""}`,
    ),
    "",
    `Report generated: ${new Date().toLocaleString()}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${d.id}_evidence_report.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (window.Toast) window.Toast.show("Evidence report exported.", "success");
};

// ─── CHECKBOX TOGGLE ──────────────────────────────────────────
window.toggleCheckbox = function (element) {
  if (element.classList.contains("blocked")) return;
  const checkIcon = element.querySelector(".check-icon");
  const isChecked = checkIcon.classList.contains("checked");

  checkIcon.classList.toggle("checked", !isChecked);
  checkIcon.classList.toggle("unchecked", isChecked);
  checkIcon.innerHTML = !isChecked
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : "";
};

// ─── BACKWARD-COMPAT STUBS ─────────────────────────────────────
// These names were called from old inline HTML — keep working.
window.requestMoreInfo = window.openRequestInfoModal;
window.rejectEvidence = window.openRejectModal;
