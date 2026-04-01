/**
 * dashboard-conflicts.js
 * Feature #12 — Conflicting Rule Resolution Dashboard Integration
 *
 * Scope: compliance_dashboard.html ONLY
 * Purpose:
 *   1. Load rule state from Helpers.getState()
 *   2. Run a lightweight conflict-detection pass (same algorithm as rules.js)
 *   3. Update the "Rule Conflicts" metric card (#card-rule-conflicts)
 *   4. Render the Conflicts summary panel (#conflicts-summary-list)
 *
 * Non-destructive: does NOT modify any variable or DOM managed by dashboard.js
 * Integration: reads window.Helpers.getState() — same source of truth as rules.js
 */

// =====================================================================
// STATE
// =====================================================================

/** @type {Array<ConflictRecord>} */
let _dashboardConflicts = [];

// =====================================================================
// ENFORCEMENT DISPLAY CONFIG  (mirrors rules.js ENF_CONFIG, no shared dep)
// =====================================================================

const _ENF = {
  BLOCK:            { label: "BLOCK",        bg: "#fee2e2", color: "#dc2626" },
  WARN:             { label: "WARN",         bg: "#fef3c7", color: "#b45309" },
  REQUIRE_APPROVAL: { label: "APPROVAL",     bg: "#dbeafe", color: "#1d4ed8" },
  AUTO_FLAG:        { label: "AUTO-FLAG",    bg: "#ede9fe", color: "#7c3aed" },
};

// =====================================================================
// CONFLICT DETECTION  (stateless — runs fresh each page load)
// =====================================================================

/**
 * Detects unresolved conflicts from the current compliance rules state.
 * A conflict is: two rules injected into the same workflow step with
 * DIFFERENT enforcement types.
 *
 * @param {Array} rules - complianceRules array from state
 * @returns {Array<ConflictRecord>}
 */
function _detectConflicts(rules) {
  const conflicts = [];

  // Build index: "workflowId::stepName" → [ {ruleId, ruleName, workflowName, stepName, enforcementType} ]
  const stepIndex = {};
  rules.forEach((rule) => {
    (rule.injections || []).forEach((inj) => {
      const key = `${inj.workflowId}::${inj.stepName}`;
      if (!stepIndex[key]) stepIndex[key] = [];
      stepIndex[key].push({
        ruleId:          rule.id,
        ruleName:        rule.name,
        workflowName:    inj.workflowName,
        stepName:        inj.stepName,
        enforcementType: inj.enforcementType,
      });
    });
  });

  // Find pairs with different enforcement types on the same step
  Object.entries(stepIndex).forEach(([, entries]) => {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i].enforcementType !== entries[j].enforcementType) {
          conflicts.push({
            id:           `dc_${Date.now()}_${conflicts.length}`,
            workflowName: entries[i].workflowName,
            stepName:     entries[i].stepName,
            ruleAId:      entries[i].ruleId,
            ruleAName:    entries[i].ruleName,
            ruleAType:    entries[i].enforcementType,
            ruleBId:      entries[j].ruleId,
            ruleBName:    entries[j].ruleName,
            ruleBType:    entries[j].enforcementType,
            resolved:     false,
          });
        }
      }
    }
  });

  return conflicts;
}

// =====================================================================
// METRIC CARD UPDATE
// =====================================================================

/**
 * Update the "Rule Conflicts" metric card (#card-rule-conflicts)
 * @param {number} count - number of unresolved conflicts
 */
function _updateConflictsMetricCard(count) {
  const card  = document.getElementById("card-rule-conflicts");
  const value = document.getElementById("conflicts-metric-value");
  const tag   = document.getElementById("conflicts-metric-tag");

  if (!card || !value || !tag) return;

  value.textContent = count;

  if (count > 0) {
    // Orange accent — action required
    card.classList.add("has-conflicts");
    tag.textContent = count === 1 ? "Needs resolution" : "Need resolution";
    tag.className   = "metric-tag orange";
  } else {
    // Green — all clear
    card.classList.remove("has-conflicts");
    tag.textContent = "All clear";
    tag.className   = "metric-tag green";
  }

  // Clicking the card navigates to the Conflicts tab on rules page
  card.style.cursor = "pointer";
  card.addEventListener("click", () => {
    window.location.href = "compliance_rules.html";
  });
}

// =====================================================================
// CONFLICTS PANEL — BADGE
// =====================================================================

function _updateConflictsBadge(count) {
  const badge = document.getElementById("conflicts-panel-badge");
  if (!badge) return;
  if (count > 0) {
    badge.textContent    = count;
    badge.style.display  = "inline-flex";
  } else {
    badge.style.display  = "none";
  }
}

// =====================================================================
// CONFLICTS PANEL — LIST RENDERING
// =====================================================================

/**
 * Render up to 5 conflict rows in the Conflicts summary panel.
 * @param {Array<ConflictRecord>} conflicts
 */
function _renderConflictsPanel(conflicts) {
  const list       = document.getElementById("conflicts-summary-list");
  const clearState = document.getElementById("conflicts-clear-state");

  if (!list || !clearState) return;

  const unresolved = conflicts.filter((c) => !c.resolved);

  if (unresolved.length === 0) {
    // Show empty / all-clear state
    list.innerHTML     = "";
    clearState.style.display = "flex";
    return;
  }

  clearState.style.display = "none";

  // Show up to 5 conflicts; link to rules page for full list
  const displayItems = unresolved.slice(0, 5);

  list.innerHTML = displayItems.map((conflict) => {
    const cA = _ENF[conflict.ruleAType] || _ENF.AUTO_FLAG;
    const cB = _ENF[conflict.ruleBType] || _ENF.AUTO_FLAG;

    const enfBadgeA = `<span style="
      display:inline-flex;align-items:center;padding:1px 7px;
      border-radius:8px;font-size:10px;font-weight:700;
      background:${cA.bg};color:${cA.color};">${cA.label}</span>`;
    const enfBadgeB = `<span style="
      display:inline-flex;align-items:center;padding:1px 7px;
      border-radius:8px;font-size:10px;font-weight:700;
      background:${cB.bg};color:${cB.color};">${cB.label}</span>`;

    return `
    <li class="conflict-summary-item" id="conflict-dash-${conflict.id}">
      <div class="conflict-summary-icon" aria-hidden="true">
        <i class="ri-error-warning-fill"></i>
      </div>
      <div class="conflict-summary-info">
        <div class="conflict-summary-title">
          <span>${conflict.ruleAName}</span>
          ${enfBadgeA}
          <span style="color:var(--text-muted);font-weight:400;font-size:12px;">vs</span>
          <span>${conflict.ruleBName}</span>
          ${enfBadgeB}
        </div>
        <div class="conflict-summary-subtitle">
          <i class="ri-flow-chart" style="font-size:11px;"></i>
          ${_escapeHtml(conflict.workflowName)}
          <span style="color:#d97706;font-weight:700;">›</span>
          <strong>${_escapeHtml(conflict.stepName)}</strong>
        </div>
      </div>
      <a href="compliance_rules.html"
         class="conflict-summary-action"
         title="Resolve this conflict in the Rules page"
         aria-label="Resolve conflict between ${_escapeHtml(conflict.ruleAName)} and ${_escapeHtml(conflict.ruleBName)}">
        <i class="ri-scales-3-line"></i> Resolve
      </a>
    </li>`;
  }).join("");

  // If there are more than 5, append a "show more" row
  if (unresolved.length > 5) {
    list.insertAdjacentHTML("beforeend", `
      <li style="padding:12px 24px;border-top:1px solid var(--border-color);
                 text-align:center;font-size:13px;color:var(--text-muted);">
        + ${unresolved.length - 5} more conflict${unresolved.length - 5 > 1 ? "s" : ""} —
        <a href="compliance_rules.html" style="color:var(--primary-color);font-weight:500;">
          View all in Rules →
        </a>
      </li>`);
  }
}

// =====================================================================
// UTILITY
// =====================================================================

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =====================================================================
// EDGE CASE HANDLING
// =====================================================================

/**
 * Handles the case where Helpers or state is not yet available.
 * Falls back gracefully without breaking the existing dashboard.
 */
function _safeGetRules() {
  try {
    const state = window.Helpers ? window.Helpers.getState() : {};
    const rules = state.complianceRules || [];
    if (!Array.isArray(rules)) return [];
    return rules;
  } catch (_) {
    return [];
  }
}

// =====================================================================
// INIT
// =====================================================================

document.addEventListener("DOMContentLoaded", function () {
  // Guard: only run on the dashboard page
  if (!document.getElementById("card-rule-conflicts")) return;

  const rules = _safeGetRules();

  // Run conflict detection
  _dashboardConflicts = _detectConflicts(rules);
  const unresolvedCount = _dashboardConflicts.filter((c) => !c.resolved).length;

  // Update metric card
  _updateConflictsMetricCard(unresolvedCount);

  // Update panel badge
  _updateConflictsBadge(unresolvedCount);

  // Render conflicts panel
  _renderConflictsPanel(_dashboardConflicts);
});
