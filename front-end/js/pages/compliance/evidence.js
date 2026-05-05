// js/pages/compliance/evidence.js
// Compliance Officer — Evidence Review
// All native confirm/alert replaced with window.Modal.create()
// Notifications via window.Helpers.pushNotification()
// Audit log entries written to state.auditLogs and persisted

let state;
let activeEvidenceId = null;

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("evidence");
  state = await window.Helpers.getState();
  if (!state.evidence) state.evidence = [];

  // Normalize backend fields to display-ready aliases
  state.evidence = state.evidence.map((e) => {
    const task      = (state.tasks || []).find(t => t.taskId === e.taskId || String(t.id) === String(e.taskId));
    const submitter = (state.users || []).find(u => u.userId === e.userId || String(u.id) === String(e.userId));
    return {
      ...e,
      type:          e.evidenceType || "Document",
      taskName:      task ? task.title : `Task #${e.taskId || "—"}`,
      submittedOn:   e.submittedAt
        ? new Date(e.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "—",
      file:          e.fileUrl || "evidence_document.pdf",
      statusLabel:   e.status || "Pending",
      submitterName: submitter ? (submitter.fullName || submitter.name) : "Unknown",
    };
  });

  document.querySelectorAll(".queue-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".queue-tab").forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      renderQueue(this.dataset.tab);
    });
  });

  renderQueue("all");
});

// ── Tab Counts ────────────────────────────────────────────────────────────────
function updateTabCounts() {
  const allCount     = state.evidence.length;
  const pendingCount = state.evidence.filter(e => e.status === "Pending" || e.status === "Under_Review").length;
  const reviewedCount = state.evidence.filter(e => e.status === "Approved" || e.status === "Rejected").length;

  const pendingBadge = document.querySelector(".queue-pending-count");
  if (pendingBadge) pendingBadge.textContent = `${pendingCount} pending`;

  const tabs = document.querySelectorAll(".queue-tab");
  if (tabs.length >= 3) {
    tabs[0].textContent = `All (${allCount})`;
    tabs[1].textContent = `Pending (${pendingCount})`;
    tabs[2].textContent = `Reviewed (${reviewedCount})`;
  }
}

// ── Queue Renderer ────────────────────────────────────────────────────────────
function renderQueue(filter) {
  updateTabCounts();
  const list = document.getElementById("queueList");
  if (!list) return;

  const filteredData = state.evidence.filter(item => {
    if (filter === "all") return true;
    if (filter === "urgent" || filter === "pending")
      return item.status === "Pending" || item.status === "Under_Review";
    if (filter === "reviewed")
      return item.status === "Approved" || item.status === "Rejected";
    return true;
  });

  list.innerHTML = filteredData.map(item => `
    <li class="queue-item" id="qi-${item.evidenceId || item.id}" onclick="selectEvidence(${item.evidenceId || item.id})">
      <div class="queue-item-header">
        <span class="queue-item-title">${item.title}</span>
        <span class="queue-item-date">${item.submittedOn || "Just now"}</span>
      </div>
      <div class="queue-item-meta">Task: ${item.taskName || "General"}</div>
      <div class="queue-item-badges">
        <span class="badge ${item.status === "Approved" ? "green" : item.status === "Rejected" ? "red" : "pending"}">
          ${item.statusLabel || item.status}
        </span>
        <span class="badge policy">${item.type || "General"}</span>
      </div>
    </li>
  `).join("") || '<li style="padding:20px; text-align:center; color:#64748b;">No evidence found.</li>';

  if (filteredData.length > 0) {
    selectEvidence(filteredData[0].evidenceId || filteredData[0].id);
  } else {
    showEmptyDetail();
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────
function showEmptyDetail() {
  const detailContent = document.querySelector(".detail-content");
  const detailFooter  = document.querySelector(".detail-footer");
  if (detailContent) detailContent.style.display = "none";
  if (detailFooter)  detailFooter.style.display  = "none";

  let emptyState = document.getElementById("evidenceEmptyState");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.id = "evidenceEmptyState";
    emptyState.style.cssText =
      "display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;width:100%;color:#94a3b8;background:#f8fafc;";
    emptyState.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;opacity:0.4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <p style="font-size:16px;font-weight:500;color:#64748b">No evidence to review</p>
    `;
    const detailSection = document.getElementById("evidenceDetail");
    if (detailSection) detailSection.appendChild(emptyState);
  }
  emptyState.style.display = "flex";
}

// ── Select Evidence ───────────────────────────────────────────────────────────
window.selectEvidence = function (id) {
  const detailContent = document.querySelector(".detail-content");
  const detailFooter  = document.querySelector(".detail-footer");
  if (detailContent) detailContent.style.display = "block";
  if (detailFooter)  detailFooter.style.display  = "flex";

  const emptyState = document.getElementById("evidenceEmptyState");
  if (emptyState) emptyState.style.display = "none";

  document.querySelectorAll(".queue-item").forEach(el => el.classList.remove("active"));
  const itemEl = document.getElementById("qi-" + id);
  if (itemEl) itemEl.classList.add("active");

  activeEvidenceId = id;
  const d = state.evidence.find(e =>
    e.evidenceId === id ||
    String(e.evidenceId) === String(id) ||
    String(e.id) === String(id)
  );
  if (!d) return;

  document.getElementById("detailTitle").textContent      = d.title;
  document.getElementById("metaSubmitter").textContent    = d.submitterName || "Unknown";
  document.getElementById("metaProject").textContent      = d.taskName || "N/A";
  document.getElementById("metaRule").textContent         = d.type || "General Policy";
  document.getElementById("metaSubmittedOn").textContent  = d.submittedOn || "Recently";
  document.getElementById("submitterNotes").textContent   = d.notes || "No submitter notes provided.";

  document.getElementById("attachedFiles").innerHTML = `
    <div class="attached-file-item">
      <div class="file-info"><div class="file-name">${d.file || "attached_document.pdf"}</div></div>
      <button class="file-download-btn" onclick="downloadEvidence()">Download</button>
    </div>`;
};

// ── Core Status Updater ───────────────────────────────────────────────────────
// reason is optional — populated only on Rejection
window.updateEvidenceStatus = async function (status, label, reason) {
  const idx = state.evidence.findIndex(e =>
    e.evidenceId === activeEvidenceId ||
    String(e.evidenceId) === String(activeEvidenceId) ||
    String(e.id) === String(activeEvidenceId)
  );
  if (idx === -1) return;

  const ev        = state.evidence[idx];
  const numericId = ev.evidenceId || parseInt(String(activeEvidenceId).replace(/[^0-9]/g, ""), 10);

  // 1. Optimistic local update
  ev.status      = status;
  ev.statusLabel = label;

  // 2. PATCH backend
  try {
    await window.Helpers.api.request(`/evidence/${numericId}`, "PATCH", { status });
  } catch (e) {
    console.warn("Could not persist evidence update to backend:", e);
  }

  // 3. Persistent notification → original submitter
  if (ev.userId || ev.user_id) {
    window.Helpers.pushNotification(Number(ev.userId || ev.user_id), {
      title:   `Evidence ${label}`,
      message: `Your evidence "${ev.title}" was ${label}.${reason ? " Reason: " + reason : ""}`,
      type:    status === "Approved" ? "success" : "error",
    });
  }

  // 4. Write to audit log
  await _recordAuditEntry(ev, status, numericId, reason);

  // 5. Toast
  if (window.Toast) window.Toast.show(status === "Approved" ? "success" : "error", `Evidence ${label}`, `Status updated to ${label}.`);

  renderQueue(document.querySelector(".queue-tab.active")?.dataset?.tab || "pending");
};

// ── Audit Log Writer ──────────────────────────────────────────────────────────
async function _recordAuditEntry(ev, newStatus, numericId, reason) {
  try {
    const freshState = await window.Helpers.getState();
    const session    = window.Auth ? window.Auth.getSession() : null;
    if (!freshState.auditLogs) freshState.auditLogs = [];

    freshState.auditLogs.unshift({
      id:          Date.now(),
      action:      "STATUS_CHANGE",
      entityType:  "Evidence",
      entityId:    numericId,
      performedBy: session ? (session.userId || session.id) : null,
      performedAt: new Date().toISOString(),
      oldValue:    { status: ev.status },
      newValue:    { status: newStatus, rejectionReason: reason || null },
    });

    // Keep audit log bounded to last 200 entries
    if (freshState.auditLogs.length > 200) freshState.auditLogs = freshState.auditLogs.slice(0, 200);

    // Merge back into state
    state.auditLogs = freshState.auditLogs;
  } catch (err) {
    console.warn("[Audit] Could not write audit entry:", err);
  }
}

// ── Approve — Professional Modal ──────────────────────────────────────────────
window.approveEvidence = function () {
  if (!activeEvidenceId) return;
  const ev = state.evidence.find(e =>
    e.evidenceId === activeEvidenceId ||
    String(e.evidenceId) === String(activeEvidenceId) ||
    String(e.id) === String(activeEvidenceId)
  );
  if (!ev) return;

  if (window.Modal && typeof window.Modal.create === "function") {
    window.Modal.create({
      id:    "approve-evidence-modal",
      title: "Approve Evidence",
      body: `
        <div style="display:flex;align-items:flex-start;gap:16px;padding:4px 0;">
          <div style="width:40px;height:40px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:6px;">Approve this submission?</div>
            <div style="font-size:13px;color:#64748b;line-height:1.5;">
              You are about to approve <strong>"${ev.title}"</strong> submitted by <strong>${ev.submitterName || "the team member"}</strong>.
              <br>A notification will be sent to the submitter.
            </div>
          </div>
        </div>`,
      actions: [
        { text: "Cancel",           class: "btn-secondary", close: true },
        {
          text: "Approve Evidence",
          class: "btn-primary",
          onClick: async () => {
            await window.updateEvidenceStatus("Approved", "Approved", null);
            return true;
          },
        },
      ],
    });
  } else {
    // Fallback (should never happen if modal.js is loaded)
    window.updateEvidenceStatus("Approved", "Approved", null);
  }
};

// ── Reject — Professional Modal with reason textarea ─────────────────────────
window.rejectEvidence = function () {
  if (!activeEvidenceId) return;
  const ev = state.evidence.find(e =>
    e.evidenceId === activeEvidenceId ||
    String(e.evidenceId) === String(activeEvidenceId) ||
    String(e.id) === String(activeEvidenceId)
  );
  if (!ev) return;

  if (window.Modal && typeof window.Modal.create === "function") {
    window.Modal.create({
      id:    "reject-evidence-modal",
      title: "Reject Evidence",
      body: `
        <div style="display:flex;align-items:flex-start;gap:16px;padding:4px 0 16px;">
          <div style="width:40px;height:40px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <div>
            <div style="font-weight:600;font-size:15px;color:#0f172a;margin-bottom:6px;">Reject this submission?</div>
            <div style="font-size:13px;color:#64748b;line-height:1.5;">
              You are rejecting <strong>"${ev.title}"</strong> by <strong>${ev.submitterName || "the team member"}</strong>.
            </div>
          </div>
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label" for="compliance-reject-reason" style="font-size:13px;font-weight:600;">
            Reason for rejection <span style="color:#ef4444">*</span>
          </label>
          <textarea
            id="compliance-reject-reason"
            class="form-control"
            rows="4"
            placeholder="State your reason for rejection. This will be visible to the submitter."
            style="resize:vertical;font-size:13px;"
          ></textarea>
          <span class="form-error hidden" id="reject-reason-error" style="color:#dc2626;font-size:12px;margin-top:4px;display:none;">
            A rejection reason is required.
          </span>
        </div>`,
      actions: [
        { text: "Cancel",           class: "btn-secondary", close: true },
        {
          text: "Reject Evidence",
          class: "btn-danger",
          onClick: async () => {
            const reasonEl = document.getElementById("compliance-reject-reason");
            const reason   = reasonEl ? reasonEl.value.trim() : "";
            if (!reason) {
              const errEl = document.getElementById("reject-reason-error");
              if (errEl) errEl.style.display = "block";
              if (window.Toast) window.Toast.show("error", "Reason Required", "Please provide a rejection reason.");
              return false; // Keep modal open
            }
            await window.updateEvidenceStatus("Rejected", "Rejected", reason);
            return true;
          },
        },
      ],
    });
  } else {
    window.updateEvidenceStatus("Rejected", "Rejected", null);
  }
};

// ── Request More Info ─────────────────────────────────────────────────────────
window.requestMoreInfo = function () {
  if (!activeEvidenceId) return;
  const ev = state.evidence.find(e =>
    e.evidenceId === activeEvidenceId ||
    String(e.evidenceId) === String(activeEvidenceId) ||
    String(e.id) === String(activeEvidenceId)
  );

  if (window.Modal && typeof window.Modal.create === "function") {
    window.Modal.create({
      id:    "more-info-modal",
      title: "Request More Information",
      body: `
        <div class="form-group" style="margin:0;">
          <label class="form-label" for="info-request-msg">Message to Submitter</label>
          <textarea
            id="info-request-msg"
            class="form-control"
            rows="4"
            placeholder="Describe what additional information or corrections are needed..."
            style="resize:vertical;font-size:13px;"
          ></textarea>
        </div>`,
      actions: [
        { text: "Cancel",       class: "btn-secondary", close: true },
        {
          text: "Send Request",
          class: "btn-primary",
          onClick: async () => {
            const msgEl = document.getElementById("info-request-msg");
            const msg   = msgEl ? msgEl.value.trim() : "";

            if (ev && (ev.userId || ev.user_id)) {
              window.Helpers.pushNotification(Number(ev.userId || ev.user_id), {
                title:   "More Information Requested",
                message: msg
                  ? `Compliance has requested additional details for "${ev.title}": ${msg}`
                  : `Compliance has requested additional details for your submission: "${ev.title}".`,
                type:    "warning",
              });
            }
            if (window.Toast) window.Toast.show("info", "Request Sent", "Information request sent to submitter.");
            return true;
          },
        },
      ],
    });
  } else {
    if (ev && (ev.userId || ev.user_id)) {
      window.Helpers.pushNotification(Number(ev.userId || ev.user_id), {
        title:   "More Information Requested",
        message: `Compliance has requested additional details for your submission: "${ev.title}".`,
        type:    "warning",
      });
    }
    if (window.Toast) window.Toast.show("info", "Request Sent", "Information request sent to submitter.");
  }
};

// ── Download ──────────────────────────────────────────────────────────────────
window.downloadEvidence = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.add("active");
};

window.closeDownloadModal = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.remove("active");
};

// ── Checklist Toggle ──────────────────────────────────────────────────────────
window.toggleCheckbox = function (element) {
  if (element.classList.contains("blocked")) return;
  const checkIcon = element.querySelector(".check-icon");
  if (checkIcon.classList.contains("checked")) {
    checkIcon.classList.replace("checked", "unchecked");
    checkIcon.innerHTML = "";
  } else {
    checkIcon.classList.replace("unchecked", "checked");
    checkIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  }
};
