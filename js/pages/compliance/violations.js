let state;
let activeViolationId = null;

document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("violations");
  state = window.Helpers.getState();
  if (!state.complianceViolations) state.complianceViolations = [];

  document.querySelectorAll(".pill-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".pill-tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      renderQueue(this.dataset.tab);
    });
  });

  renderQueue("open");
});

function updateTabCounts() {
  const allCount = state.complianceViolations.length;
  const openCount = state.complianceViolations.filter(
    (v) => v.status === "Open" || v.status === "Under_Review",
  ).length;
  const resolvedCount = state.complianceViolations.filter(
    (v) => v.status === "Resolved",
  ).length;

  // Update Top Badge
  const pendingBadge = document.querySelector(".queue-pending-count");
  if (pendingBadge) pendingBadge.textContent = `${openCount} open`;

  // Update Tab Text dynamically
  const tabs = document.querySelectorAll(".pill-tab");
  if (tabs.length >= 3) {
    tabs[0].textContent = `Open (${openCount})`;
    tabs[1].textContent = `Resolved (${resolvedCount})`;
    tabs[2].textContent = `All (${allCount})`;
  }
}

function renderQueue(filter) {
  updateTabCounts();
  const list = document.getElementById("violationsList");
  if (!list) return;

  let filteredData = state.complianceViolations.filter((item) => {
    if (filter === "all") return true;
    if (filter === "open")
      return item.status === "Open" || item.status === "Under_Review";
    if (filter === "resolved") return item.status === "Resolved";
    return true;
  });

  list.innerHTML =
    filteredData
      .map(
        (item) => `
    <li class="vq-item" id="vqi-${item.id}" onclick="selectViolation('${item.id}')">
      <div class="vq-item-title">${item.title}</div>
      <div class="vq-item-meta">${item.projectName || "System"}</div>
      <div class="vq-item-badges">
        <span class="badge ${item.status === "Resolved" ? "resolved" : "critical"}">${item.statusLabel || item.status}</span>
      </div>
    </li>
  `,
      )
      .join("") ||
    '<li style="padding:20px; text-align:center; color:#64748b;">No violations found.</li>';

  if (filteredData.length > 0) {
    selectViolation(filteredData[0].id);
  } else {
    showEmptyDetail();
  }
}

// --- Empty State UI Generator ---
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

// --- GLOBALLY SCOPED FUNCTIONS ---
window.selectViolation = function (id) {
  // Restore the layout if it was hidden by empty state
  const vdContent = document.querySelector(".vd-content");
  const vdFooter = document.querySelector(".vd-footer");
  if (vdContent) vdContent.style.display = "block";
  if (vdFooter) vdFooter.style.display = "flex";

  const emptyState = document.getElementById("violationEmptyState");
  if (emptyState) emptyState.style.display = "none";

  document
    .querySelectorAll(".vq-item")
    .forEach((el) => el.classList.remove("active"));
  const itemEl = document.getElementById("vqi-" + id);
  if (itemEl) itemEl.classList.add("active");

  activeViolationId = id;
  const d = state.complianceViolations.find((v) => String(v.id) === String(id));
  if (!d) return;

  document.getElementById("vdTitle").textContent = d.title;
  document.getElementById("vdProject").textContent = d.projectName || "System";
  document.getElementById("vdDescription").textContent =
    d.detail || "No detailed description provided.";

  const notesArea = document.getElementById("vdNotes");
  if (notesArea) notesArea.value = d.resolutionNotes || "";

  // Hide actions footer if the violation is already resolved
  if (vdFooter) {
    vdFooter.style.display = d.status === "Resolved" ? "none" : "flex";
  }
};

window.markResolved = function () {
  if (confirm("Mark this violation as resolved?")) {
    const idx = state.complianceViolations.findIndex(
      (v) => String(v.id) === String(activeViolationId),
    );
    if (idx > -1) {
      state.complianceViolations[idx].status = "Resolved";
      state.complianceViolations[idx].statusLabel = "Resolved";

      const notesArea = document.getElementById("vdNotes");
      if (notesArea)
        state.complianceViolations[idx].resolutionNotes = notesArea.value;

      window.Helpers.saveState(state);
      if (window.Toast)
        window.Toast.show("Violation marked as resolved.", "success");
      renderQueue(document.querySelector(".pill-tab.active").dataset.tab);
    }
  }
};

window.viewProject = function () {
  if (window.Toast)
    window.Toast.show("Redirecting to Project detail view...", "info");
};

window.escalateViolation = function () {
  if (confirm("Escalate this violation to the regulatory team?")) {
    if (window.Toast)
      window.Toast.show("Violation escalated successfully.", "warning");
  }
};
