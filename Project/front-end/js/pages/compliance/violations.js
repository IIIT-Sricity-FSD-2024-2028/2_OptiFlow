let state;
let allUsers = [];
let allRules = [];
let activeViolationId = null;

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("violations");

  // ── Async load ────────────────────────────────────────────────────────────
  state = await window.Helpers.getState();
  if (!state.complianceViolations) state.complianceViolations = [];
  allUsers = state.users || [];
  allRules = state.complianceRules || [];

  document.querySelectorAll(".pill-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".pill-tab").forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      renderQueue(this.dataset.tab);
    });
  });

  renderQueue("open");
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function userName(userId) {
  const u = allUsers.find((u) => u.userId === userId || u.id === String(userId));
  return u ? u.fullName : "System";
}

function ruleFor(ruleId) {
  return allRules.find((r) => r.ruleId === ruleId) || {};
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function severityBadge(severity) {
  const map = { Critical: "critical", High: "warning", Medium: "pending", Low: "pending" };
  return map[severity] || "pending";
}

// ── Tab Counts ────────────────────────────────────────────────────────────────
function updateTabCounts() {
  const allCount = state.complianceViolations.length;
  const openCount = state.complianceViolations.filter(
    (v) => v.status === "Open" || v.status === "Under_Review",
  ).length;
  const resolvedCount = state.complianceViolations.filter((v) => v.status === "Resolved").length;

  const pendingBadge = document.querySelector(".queue-pending-count");
  if (pendingBadge) pendingBadge.textContent = `${openCount} open`;

  const tabs = document.querySelectorAll(".pill-tab");
  if (tabs.length >= 3) {
    tabs[0].textContent = `Open (${openCount})`;
    tabs[1].textContent = `Resolved (${resolvedCount})`;
    tabs[2].textContent = `All (${allCount})`;
  }
}

// ── Render Violation Queue ────────────────────────────────────────────────────
function renderQueue(filter) {
  updateTabCounts();
  const list = document.getElementById("violationsList");
  if (!list) return;

  const filteredData = state.complianceViolations.filter((item) => {
    if (filter === "all") return true;
    if (filter === "open") return item.status === "Open" || item.status === "Under_Review";
    if (filter === "resolved") return item.status === "Resolved";
    return true;
  });

  list.innerHTML =
    filteredData
      .map((item) => {
        const rule = ruleFor(item.ruleId);
        const severity = rule.severity || "Medium";
        const title = rule.ruleName ? `${rule.ruleName} — ${item.entityType} #${item.entityId}` : `Violation #${item.violationId}`;
        return `
        <li class="vq-item" id="vqi-${item.violationId}" onclick="selectViolation(${item.violationId})" role="button" tabindex="0">
          <div class="vq-item-title">${title}</div>
          <div class="vq-item-meta">Detected ${fmtDate(item.detectedAt)} · Due: ${item.dueDate || "N/A"}</div>
          <div class="vq-item-badges">
            <span class="badge ${severityBadge(severity)}">${severity}</span>
            <span class="badge ${item.status === "Resolved" ? "resolved" : "open"}">${item.status}</span>
          </div>
        </li>`;
      })
      .join("") ||
    '<li style="padding:20px; text-align:center; color:#64748b;">No violations found.</li>';

  if (filteredData.length > 0) {
    selectViolation(filteredData[0].violationId);
  } else {
    showEmptyDetail();
  }
}

// ── Empty Detail State ────────────────────────────────────────────────────────
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
      "display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%; color:#94a3b8; background:#f8fafc;";
    emptyState.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:16px;opacity:0.4">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p style="font-size:16px; font-weight:500; color:#64748b">No violations to review</p>`;
    const detailSection = document.getElementById("violationDetail");
    if (detailSection) detailSection.appendChild(emptyState);
  }
  emptyState.style.display = "flex";
}

// ── Select & Render Detail ────────────────────────────────────────────────────
window.selectViolation = function (id) {
  const vdContent = document.querySelector(".vd-content");
  const vdFooter = document.querySelector(".vd-footer");
  if (vdContent) vdContent.style.display = "block";
  if (vdFooter) vdFooter.style.display = "flex";

  const emptyState = document.getElementById("violationEmptyState");
  if (emptyState) emptyState.style.display = "none";

  document.querySelectorAll(".vq-item").forEach((el) => el.classList.remove("active"));
  const itemEl = document.getElementById("vqi-" + id);
  if (itemEl) itemEl.classList.add("active");

  activeViolationId = id;
  const d = state.complianceViolations.find((v) => v.violationId === id || String(v.violationId) === String(id));
  if (!d) return;

  const rule = ruleFor(d.ruleId);
  const severity = rule.severity || "Medium";

  // Title & badge
  const titleEl = document.getElementById("vdTitle");
  const badgeEl = document.getElementById("vdBadge");
  if (titleEl) titleEl.textContent = rule.ruleName ? `${rule.ruleName} — ${d.entityType} #${d.entityId}` : `Violation #${d.violationId}`;
  if (badgeEl) {
    badgeEl.textContent = severity;
    badgeEl.className = `badge ${severityBadge(severity)}`;
  }

  // Info grid cells
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setText("vdPolicy", rule.ruleName || "—");
  setText("vdProject", `${d.entityType} #${d.entityId}`);
  setText("vdPM", userName(d.reportedBy));
  setText("vdTL", d.resolvedBy ? userName(d.resolvedBy) : "Unassigned");
  setText("vdSince", fmtDate(d.detectedAt));
  setText("vdRisk", severity === "Critical" ? "Regulatory Risk" : severity === "High" ? "Operational Risk" : "Process Risk");

  // Description
  const descEl = document.getElementById("vdDescription");
  if (descEl) descEl.textContent = rule.description || "No detailed description provided.";

  // Resolution notes
  const notesArea = document.getElementById("vdNotes");
  if (notesArea) notesArea.value = d.resolutionRemarks || "";

  // Hide footer for already-resolved violations
  if (vdFooter) vdFooter.style.display = d.status === "Resolved" ? "none" : "flex";
};

// ── Actions ───────────────────────────────────────────────────────────────────
window.markResolved = async function () {
  if (!confirm("Mark this violation as resolved?")) return;
  const idx = state.complianceViolations.findIndex(
    (v) => String(v.violationId) === String(activeViolationId),
  );
  if (idx > -1) {
    const notesArea = document.getElementById("vdNotes");
    // Optimistic local update
    state.complianceViolations[idx].status = "Resolved";
    state.complianceViolations[idx].resolutionRemarks = notesArea ? notesArea.value : "";
    state.complianceViolations[idx].resolvedAt = new Date().toISOString();

    // PATCH to backend
    try {
      await window.Helpers.api.request(
        `/compliance-violations/${activeViolationId}`,
        "PATCH",
        { status: "Resolved", resolution_remarks: state.complianceViolations[idx].resolutionRemarks },
      );
    } catch (e) {
      console.warn("Could not persist violation update to backend:", e);
    }

    if (window.Toast) window.Toast.show("Violation marked as resolved.", "success");
    renderQueue(document.querySelector(".pill-tab.active")?.dataset.tab || "open");
  }
};

window.viewProject = function () {
  if (window.Toast) window.Toast.show("Redirecting to Project detail view...", "info");
};

window.escalateViolation = function () {
  if (confirm("Escalate this violation to the regulatory team?")) {
    if (window.Toast) window.Toast.show("Violation escalated successfully.", "warning");
  }
};
