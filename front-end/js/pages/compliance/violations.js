// js/pages/compliance/violations.js
// Compliance Violations — Queue & Resolution view with human-readable entity names

let state;
let allUsers = [];
let allRules = [];
let activeViolationId = null;

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("violations");

  // Force hide all inert modals on initial render
  document.querySelectorAll('.modal-overlay, .modal-backdrop').forEach(m => {
    m.classList.remove('active');
    m.classList.add('hidden');
    m.style.display = 'none';
  });

  state = await window.Helpers.getState();
  if (!state.complianceViolations) state.complianceViolations = [];
  allUsers = state.users || [];
  allRules = state.complianceRules || [];

  let _eventsBound = false;
  if (!_eventsBound) {
    _eventsBound = true;
    document.querySelectorAll(".pill-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".pill-tab").forEach((t) => t.classList.remove("active"));
        this.classList.add("active");
        renderQueue(this.dataset.tab);
      });
    });
  }

  renderQueue("open");
});

// ── Human-Readable Entity Name Resolver ───────────────────────────────────────
function userName(userId) {
  if (!userId) return "System";
  if (typeof userId === "object") return userId.fullName || userId.name || "System";
  const cleanId = String(userId);
  const u = allUsers.find((u) => String(u.id) === cleanId || String(u.userId) === cleanId);
  return u ? (u.fullName || u.name) : `User (${cleanId.substring(0, 8)})`;
}

function getEntityLabel(entityType, entityId) {
  if (!entityId) return entityType || "General";
  const cleanId = String(entityId);

  if (entityType === "User") {
    const u = allUsers.find((u) => String(u.id) === cleanId || String(u.userId) === cleanId);
    if (u) return `${u.fullName || u.name} (User)`;
    return `User (${cleanId.substring(0, 8)})`;
  }
  if (entityType === "Task") {
    const t = (state.tasks || []).find((t) => String(t.id) === cleanId || String(t.taskId) === cleanId);
    if (t) return `Task "${t.title}"`;
    return `Task #${cleanId.substring(0, 8)}`;
  }
  if (entityType === "Project") {
    const p = (state.projects || []).find((p) => String(p.id) === cleanId || String(p.projectId) === cleanId);
    if (p) return `Project "${p.name}"`;
    return `Project #${cleanId.substring(0, 8)}`;
  }
  if (entityType === "Team") {
    const tm = (state.teams || []).find((tm) => String(tm.id) === cleanId);
    if (tm) return `Team "${tm.name}"`;
    return `Team #${cleanId.substring(0, 8)}`;
  }
  return `${entityType || "Entity"} (${cleanId.substring(0, 8)})`;
}

function ruleFor(ruleId) {
  return allRules.find((r) => String(r.id) === String(ruleId) || String(r.ruleId) === String(ruleId)) || {};
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
        const vId = item.id || item.violationId;
        const rule = ruleFor(item.ruleId) || item.rule || {};
        const severity = item.severity || rule.severity || "Medium";
        const ruleName = rule.name || rule.ruleName || "Compliance Rule";
        const entityLabel = getEntityLabel(item.entityType, item.entityId);
        const title = `${ruleName} — ${entityLabel}`;

        return `
        <li class="vq-item" id="vqi-${vId}" onclick="selectViolation('${vId}')" role="button" tabindex="0">
          <div class="vq-item-title">${title}</div>
          <div class="vq-item-meta">Detected ${fmtDate(item.detectedAt)} · Target: ${entityLabel}</div>
          <div class="vq-item-badges">
            <span class="badge ${severityBadge(severity)}">${severity}</span>
            <span class="badge ${item.status === "Resolved" ? "resolved" : "open"}">${item.status}</span>
          </div>
        </li>`;
      })
      .join("") ||
    '<li style="padding:20px; text-align:center; color:#64748b;">No violations found.</li>';

  if (filteredData.length > 0) {
    const firstId = filteredData[0].id || filteredData[0].violationId;
    selectViolation(firstId);
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
  const d = state.complianceViolations.find((v) => String(v.id) === String(id) || String(v.violationId) === String(id));
  if (!d) return;

  const rule = ruleFor(d.ruleId) || d.rule || {};
  const severity = d.severity || rule.severity || "Medium";
  const ruleName = rule.name || rule.ruleName || "Compliance Rule";
  const entityLabel = getEntityLabel(d.entityType, d.entityId);

  // Title & badge
  const titleEl = document.getElementById("vdTitle");
  const badgeEl = document.getElementById("vdBadge");
  if (titleEl) titleEl.textContent = `${ruleName} — ${entityLabel}`;
  if (badgeEl) {
    badgeEl.textContent = severity;
    badgeEl.className = `badge ${severityBadge(severity)}`;
  }

  // Info grid cells
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setText("vdPolicy", ruleName);
  setText("vdProject", entityLabel);
  setText("vdPM", userName(d.reportedById || d.reportedBy));
  setText("vdTL", d.resolvedBy ? userName(d.resolvedById || d.resolvedBy) : "Unassigned");
  setText("vdSince", fmtDate(d.detectedAt));
  setText("vdRisk", severity === "Critical" ? "Critical Compliance Breach" : severity === "High" ? "Operational Policy Risk" : "Process Non-Conformance");

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
window.markResolved = function () {
  window.Modal.create({
    id: 'resolve-modal',
    title: 'Resolve Violation',
    body: 'Mark this violation as resolved?',
    actions: [
      { text: 'Cancel', class: 'btn-secondary', close: true },
      {
        text: 'Resolve',
        class: 'btn-primary',
        onClick: async () => {
          const idx = state.complianceViolations.findIndex(
            (v) => String(v.id || v.violationId) === String(activeViolationId),
          );
          if (idx > -1) {
            const notesArea = document.getElementById("vdNotes");
            const targetId = String(state.complianceViolations[idx].id || state.complianceViolations[idx].violationId || activeViolationId);

            // Optimistic local update
            state.complianceViolations[idx].status = "Resolved";
            state.complianceViolations[idx].resolutionRemarks = notesArea ? notesArea.value : "";
            state.complianceViolations[idx].resolvedAt = new Date().toISOString();

            // PATCH to backend using string UUID
            try {
              await window.Helpers.api.request(
                `/compliance-violations/${targetId}`,
                "PATCH",
                { status: "Resolved", resolution_remarks: state.complianceViolations[idx].resolutionRemarks },
              );

              // Interlinking: If this is a Task violation, unblock the task
              const v = state.complianceViolations[idx];
              if (v.entityType === 'Task' && v.entityId) {
                try {
                  await window.Helpers.api.request(`/tasks/${v.entityId}`, "PATCH", { status: 'In_Progress' });
                  const notifyUserId = v.reportedById || v.reportedBy;
                  if (notifyUserId) {
                    window.Helpers.pushNotification(notifyUserId, {
                      title: "Task Unblocked",
                      message: `Violation for Task resolved. Task moved to In Progress.`,
                      type: "success"
                    });
                  }
                } catch (taskErr) {
                  console.warn("Could not auto-update task status:", taskErr);
                }
              }
            } catch (e) {
              console.warn("Could not persist violation update to backend:", e);
            }

            if (window.Toast) window.Toast.show("success", "Violation Resolved", "Violation marked as resolved.");
            renderQueue(document.querySelector(".pill-tab.active")?.dataset.tab || "open");
          }
          window.Modal.close('resolve-modal');
        }
      }
    ]
  });
};

window.viewProject = function () {
  if (window.Toast) window.Toast.show("info", "Navigation", "Redirecting to Project detail view...");
};

window.escalateViolation = function () {
  window.Modal.create({
    id: 'escalate-modal',
    title: 'Escalate Violation',
    body: 'Escalate this violation to the regulatory team?',
    actions: [
      { text: 'Cancel', class: 'btn-secondary', close: true },
      {
        text: 'Escalate',
        class: 'btn-danger',
        onClick: () => {
          if (window.Toast) window.Toast.show("warning", "Violation Escalated", "Violation escalated successfully.");
          window.Modal.close('escalate-modal');
        }
      }
    ]
  });
};
