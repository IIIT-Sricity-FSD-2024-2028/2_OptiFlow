let state;
let activeEvidenceId = null;

document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("evidence");
  state = window.Helpers.getState();
  if (!state.evidence) state.evidence = [];

  document.querySelectorAll(".queue-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".queue-tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      renderQueue(this.dataset.tab);
    });
  });

  renderQueue("pending"); // Default to pending/urgent tab
});

function updateTabCounts() {
  const allCount = state.evidence.length;
  const pendingCount = state.evidence.filter(
    (e) => e.status === "pending" || e.status === "under_review",
  ).length;
  const reviewedCount = state.evidence.filter(
    (e) => e.status === "approved" || e.status === "rejected",
  ).length;

  // Update Top Badge
  const pendingBadge = document.querySelector(".queue-pending-count");
  if (pendingBadge) pendingBadge.textContent = `${pendingCount} pending`;

  // Update Tab Text dynamically
  const tabs = document.querySelectorAll(".queue-tab");
  if (tabs.length >= 3) {
    tabs[0].textContent = `All (${allCount})`;
    tabs[1].textContent = `Pending (${pendingCount})`; // Previously Urgent
    tabs[2].textContent = `Reviewed (${reviewedCount})`;
  }
}

function renderQueue(filter) {
  updateTabCounts();
  const list = document.getElementById("queueList");
  if (!list) return;

  // Filter real data
  let filteredData = state.evidence.filter((item) => {
    if (filter === "all") return true;
    if (filter === "urgent" || filter === "pending")
      return item.status === "pending" || item.status === "under_review";
    if (filter === "reviewed")
      return item.status === "approved" || item.status === "rejected";
    return true;
  });

  list.innerHTML =
    filteredData
      .map(
        (item) => `
    <li class="queue-item" id="qi-${item.id}" onclick="selectEvidence('${item.id}')">
      <div class="queue-item-header">
        <span class="queue-item-title">${item.title}</span>
        <span class="queue-item-date">${item.submittedOn || "Just now"}</span>
      </div>
      <div class="queue-item-meta">Task: ${item.taskName || "General"}</div>
      <div class="queue-item-badges">
        <span class="badge ${item.status === "approved" ? "green" : item.status === "rejected" ? "red" : "pending"}">${item.statusLabel || item.status}</span>
        <span class="badge policy">${item.type || "General"}</span>
      </div>
    </li>
  `,
      )
      .join("") ||
    '<li style="padding:20px; text-align:center; color:#64748b;">No evidence found.</li>';

  if (filteredData.length > 0) {
    selectEvidence(filteredData[0].id);
  } else {
    showEmptyDetail();
  }
}

// --- Empty State UI Generator ---
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
      "display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%; color:#94a3b8; background: #f8fafc;";
    emptyState.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;opacity:0.4">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <p style="font-size:16px; font-weight:500; color:#64748b">No evidence to review</p>
    `;
    const detailSection = document.getElementById("evidenceDetail");
    if (detailSection) detailSection.appendChild(emptyState);
  }
  emptyState.style.display = "flex";
}

// --- GLOBALLY SCOPED FUNCTIONS ---
window.selectEvidence = function (id) {
  // Restore the layout if it was hidden by empty state
  const detailContent = document.querySelector(".detail-content");
  const detailFooter = document.querySelector(".detail-footer");
  if (detailContent) detailContent.style.display = "block";
  if (detailFooter) detailFooter.style.display = "flex";

  const emptyState = document.getElementById("evidenceEmptyState");
  if (emptyState) emptyState.style.display = "none";

  document
    .querySelectorAll(".queue-item")
    .forEach((el) => el.classList.remove("active"));
  const itemEl = document.getElementById("qi-" + id);
  if (itemEl) itemEl.classList.add("active");

  activeEvidenceId = id;
  const d = state.evidence.find((e) => String(e.id) === String(id));
  if (!d) return;

  const masterUsers = JSON.parse(localStorage.getItem("users")) || [];
  const submitter = masterUsers.find(
    (u) => String(u.id) === String(d.userId),
  ) || { name: "System User" };

  document.getElementById("detailTitle").textContent = d.title;
  document.getElementById("metaSubmitter").textContent = submitter.name;
  document.getElementById("metaProject").textContent = d.taskName || "N/A";
  document.getElementById("metaRule").textContent = d.type || "General Policy";
  document.getElementById("metaSubmittedOn").textContent =
    d.submittedOn || "Recently";
  document.getElementById("submitterNotes").textContent =
    d.notes || "No submitter notes provided.";

  // File UI
  document.getElementById("attachedFiles").innerHTML = `
    <div class="attached-file-item">
      <div class="file-info"><div class="file-name">${d.file || "attached_document.pdf"}</div></div>
      <button class="file-download-btn" onclick="downloadEvidence()">Download</button>
    </div>`;
};
window.updateEvidenceStatus = function (status, label) {
  const idx = state.evidence.findIndex(
    (e) => String(e.id) === String(activeEvidenceId),
  );
  if (idx > -1) {
    const ev = state.evidence[idx];

    // 1. Update the Evidence Status
    ev.status = status;
    ev.statusLabel = label;

    if (window.AuditStore) {
      window.AuditStore.add(
        "Compliance",
        `Evidence ${label.toLowerCase()}: "${ev.title}" (ID: ${ev.id})`,
        status === "rejected" ? "Medium" : "Info",
      );
    }

    // 2. GENERATE NOTIFICATION FOR THE SUBMITTER
    if (!state.notifications) state.notifications = [];

    state.notifications.unshift({
      id: Date.now(),
      userId: ev.userId, // This targets the exact TM/TL who submitted it (e.g., 'u4')
      type: status === "approved" ? "success" : "error",
      title: `Evidence ${label}`,
      message: `Your evidence submission "${ev.title}" was ${label.toLowerCase()} by Compliance.`,
      time: "Just now",
      isRead: false,
    });

    // 3. Save and Refresh UI
    window.Helpers.saveState(state);
    if (window.Toast)
      window.Toast.show(
        `Evidence ${label}`,
        status === "approved" ? "success" : "error",
      );
    renderQueue(document.querySelector(".queue-tab.active").dataset.tab);
  }
};

window.requestMoreInfo = function () {
  const idx = state.evidence.findIndex(
    (e) => String(e.id) === String(activeEvidenceId),
  );
  if (idx > -1) {
    const ev = state.evidence[idx];

    // GENERATE NOTIFICATION
    if (!state.notifications) state.notifications = [];
    state.notifications.unshift({
      id: Date.now(),
      userId: ev.userId,
      type: "warning",
      title: "More Info Requested",
      message: `Compliance has requested additional details for your submission: "${ev.title}".`,
      time: "Just now",
      isRead: false,
    });

    window.Helpers.saveState(state);
  }

  if (window.Toast)
    window.Toast.show("Information request sent to Submitter", "info");
};
window.rejectEvidence = function () {
  if (confirm("Are you sure you want to reject this evidence?")) {
    updateEvidenceStatus("rejected", "Rejected");
  }
};

window.approveEvidence = function () {
  if (confirm("Approve this evidence submission?")) {
    updateEvidenceStatus("approved", "Approved");
  }
};

window.downloadEvidence = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.add("active");
};

window.closeDownloadModal = function () {
  const modal = document.getElementById("downloadSuccessModal");
  if (modal) modal.classList.remove("active");
};



window.toggleCheckbox = function (element) {
  if (element.classList.contains("blocked")) return;
  const checkIcon = element.querySelector(".check-icon");
  if (checkIcon.classList.contains("checked")) {
    checkIcon.classList.remove("checked");
    checkIcon.classList.add("unchecked");
    checkIcon.innerHTML = "";
  } else {
    checkIcon.classList.remove("unchecked");
    checkIcon.classList.add("checked");
    checkIcon.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }
};
