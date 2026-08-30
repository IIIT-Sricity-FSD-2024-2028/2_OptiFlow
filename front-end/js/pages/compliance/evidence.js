// js/pages/compliance/evidence.js
// Compliance Officer — Evidence Review
// All native confirm/alert replaced with window.Modal.create()
// Notifications via window.Helpers.pushNotification()
// Audit log entries written to state.auditLogs and persisted

let state;
let activeEvidenceId = null;
let _eventsBound = false;

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("evidence");

  // Force hide all inert modals on initial render
  document.querySelectorAll('.modal-overlay, .modal-backdrop').forEach(m => {
    m.classList.remove('active');
    m.classList.add('hidden');
    m.style.display = 'none';
  });
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

  if (!_eventsBound) {
    _eventsBound = true;
    document.querySelectorAll(".queue-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".queue-tab").forEach(t => t.classList.remove("active"));
        this.classList.add("active");
        renderQueue(this.dataset.tab);
      });
    });
  }

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

  list.innerHTML = filteredData.map(item => {
    const eId = item.id || item.evidenceId;
    return `
    <li class="queue-item" id="qi-${eId}" onclick="selectEvidence('${eId}')">
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
  `}).join("") || '<li style="padding:20px; text-align:center; color:#64748b;">No evidence found.</li>';

  if (filteredData.length > 0) {
    const firstId = filteredData[0].id || filteredData[0].evidenceId;
    selectEvidence(firstId);
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
  const detailContent = document.querySelector('.detail-content');
  const detailFooter  = document.querySelector('.detail-footer');
  if (detailContent) detailContent.style.display = 'block';
  if (detailFooter)  detailFooter.style.display  = 'flex';

  const emptyState = document.getElementById('evidenceEmptyState');
  if (emptyState) emptyState.style.display = 'none';

  document.querySelectorAll('.queue-item').forEach(el => el.classList.remove('active'));
  const itemEl = document.getElementById('qi-' + id);
  if (itemEl) itemEl.classList.add('active');

  activeEvidenceId = id;
  const d = state.evidence.find(e =>
    e.evidenceId === id ||
    String(e.evidenceId) === String(id) ||
    String(e.id) === String(id)
  );
  if (!d) return;

  document.getElementById('detailTitle').textContent      = d.title;
  document.getElementById('metaSubmitter').textContent    = d.submitterName || 'Unknown';
  document.getElementById('metaProject').textContent      = d.taskName || 'N/A';
  document.getElementById('metaRule').textContent         = d.type || 'General Policy';
  document.getElementById('metaSubmittedOn').textContent  = d.submittedOn || 'Recently';
  document.getElementById('submitterNotes').textContent   = d.notes || 'No submitter notes provided.';

  // Render the actual fileUrl from Prisma; fall back to a safe placeholder
  const fileUrl  = d.fileUrl || d.file_url || '';
  const fileName = fileUrl ? fileUrl.split('/').pop() : 'No file attached';
  const backendBase = 'http://localhost:3000';

  document.getElementById('attachedFiles').innerHTML = fileUrl ? `
    <div class="attached-file-item">
      <svg class="file-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <div class="file-info">
        <div class="file-name">${fileName}</div>
        <div class="file-size" style="font-size:11px;color:#94a3b8">Stored on server</div>
      </div>
      <a
        href="${fileUrl.startsWith('/') ? backendBase + fileUrl : fileUrl}"
        target="_blank"
        rel="noopener"
        class="file-download-btn"
        style="text-decoration:none"
        aria-label="Download ${fileName}"
      >Download</a>
    </div>` :
    '<div style="color:#94a3b8;font-size:13px;padding:8px 0;">No file attached yet.</div>';

  // Reset upload widget for this evidence record
  const fileInput = document.getElementById('evidenceFileInput');
  if (fileInput) fileInput.value = '';
  const uploadResult = document.getElementById('uploadResult');
  if (uploadResult) { uploadResult.style.display = 'none'; uploadResult.textContent = ''; }
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

  const ev       = state.evidence[idx];
  const targetId = String(ev.id || ev.evidenceId || activeEvidenceId);

  // 1. Optimistic local update
  ev.status      = status;
  ev.statusLabel = label;

  // 2. PATCH backend with strict String UUID
  try {
    await window.Helpers.api.request(`/evidence/${targetId}`, "PATCH", { status });
  } catch (e) {
    console.warn("Could not persist evidence update to backend:", e);
  }

  // 3. Persistent notification → original submitter
  const submitterId = ev.userId || ev.user_id;
  if (submitterId) {
    window.Helpers.pushNotification(submitterId, {
      title:   `Evidence ${label}`,
      message: `Your evidence "${ev.title}" was ${label}.${reason ? " Reason: " + reason : ""}`,
      type:    status === "Approved" ? "success" : "error",
    });
  }

  // 4. Write to audit log via backend API
  await _recordAuditEntry(ev, status, targetId, reason);

  // 5. Toast
  if (window.Toast) window.Toast.show(status === "Approved" ? "success" : "error", `Evidence ${label}`, `Status updated to ${label}.`);

  renderQueue(document.querySelector(".queue-tab.active")?.dataset?.tab || "pending");
};

// ── Audit Log Writer ──────────────────────────────────────────────────────────
async function _recordAuditEntry(ev, newStatus, targetId, reason) {
  try {
    if (window.Helpers && typeof window.Helpers.log === "function") {
      await window.Helpers.log(
        "STATUS_CHANGE",
        "Evidence",
        targetId,
        { status: ev.status },
        { status: newStatus, rejectionReason: reason || null }
      );
    }
  } catch (e) {
    console.warn("Audit log creation failed:", e);
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

// ── Real File Upload — POST /evidence/:id/upload ──────────────────────────────
window.uploadEvidenceFile = async function () {
  if (!activeEvidenceId) {
    if (window.Toast) window.Toast.show('warning', 'No Evidence Selected', 'Please select an evidence record first.');
    return;
  }

  const fileInput = document.getElementById('evidenceFileInput');
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    if (window.Toast) window.Toast.show('warning', 'No File', 'Please select a file before uploading.');
    return;
  }

  const file = fileInput.files[0];
  const MAX_MB = 20;
  if (file.size > MAX_MB * 1024 * 1024) {
    if (window.Toast) window.Toast.show('error', 'File Too Large', `File must be under ${MAX_MB} MB.`);
    return;
  }

  const progressEl = document.getElementById('uploadProgress');
  const resultEl   = document.getElementById('uploadResult');
  const uploadBtn  = document.getElementById('btn-upload-evidence');

  if (progressEl) progressEl.style.display = 'block';
  if (resultEl)   { resultEl.style.display = 'none'; resultEl.textContent = ''; }
  if (uploadBtn)  { uploadBtn.disabled = true; uploadBtn.textContent = 'Uploading…'; }

  try {
    // Read session for auth headers
    const session   = window.Auth ? window.Auth.getSession() : null;
    const userRole  = session ? (session.role || 'compliance_officer') : 'compliance_officer';
    const companyId = session ? (session.companyId || 'b7744408-190c-4b83-82c5-ab0049afb6b2') : 'b7744408-190c-4b83-82c5-ab0049afb6b2';
    const userId    = session ? (session.id || session.userId || '') : '';

    const formData = new FormData();
    formData.append('file', file);

    const headers = {
      'x-user-role':  userRole,
      'x-company-id': companyId,
    };
    if (userId) {
      headers['x-user-id'] = String(userId);
    }

    const response = await fetch(
      `http://localhost:3000/evidence/${activeEvidenceId}/upload`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    const raw = await response.json();
    const result = raw.data || raw;  // Unwrap NestJS TransformInterceptor envelope

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    // Update local state so the file panel refreshes instantly
    const idx = state.evidence.findIndex(e =>
      String(e.id || e.evidenceId) === String(activeEvidenceId)
    );
    if (idx > -1) {
      state.evidence[idx].fileUrl = result.fileUrl;
      // Re-render the detail panel
      selectEvidence(activeEvidenceId);
    }

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.style.color = '#16a34a';
      resultEl.textContent = `✓ Uploaded: ${result.originalname}`;
    }
    if (window.Toast) window.Toast.show('success', 'File Uploaded', `"${result.originalname}" saved successfully.`);
    fileInput.value = '';

  } catch (err) {
    console.error('[Upload] Error:', err);
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.style.color = '#dc2626';
      resultEl.textContent = `✗ Upload failed: ${err.message}`;
    }
    if (window.Toast) window.Toast.show('error', 'Upload Failed', err.message || 'Could not upload file.');
  } finally {
    if (progressEl) progressEl.style.display = 'none';
    if (uploadBtn)  { uploadBtn.disabled = false; uploadBtn.textContent = 'Upload'; }
  }
};

// ── Download ──────────────────────────────────────────────────────────────────
window.downloadEvidence = function () {
  window.Modal.open('downloadSuccessModal');
};

window.closeDownloadModal = function () {
  window.Modal.close('downloadSuccessModal');
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
