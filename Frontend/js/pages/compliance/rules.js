/**
 * rules.js
 * Compliance Rules Page — Full Feature Implementation
 * Features: Rule Versioning, Workflow Injection, Escalation Config, Conflict Detection
 */

// =====================================================================
// STATE
// =====================================================================
let state;
let selectedRuleId = null;
let currentConflicts = [];
let activeTab = "all";

function showRulesStatus(message) {
  const banner = document.getElementById("rules-status");
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

function hideRulesStatus() {
  const banner = document.getElementById("rules-status");
  if (!banner) return;
  banner.hidden = true;
  banner.textContent = "";
}

document.addEventListener("DOMContentLoaded", function () {
  if (window.Sidebar) window.Sidebar.render("rules");
  if (window.Toast) window.Toast.init();
  try {
    state = window.Helpers.getState();
    hideRulesStatus();
  } catch (_error) {
    showRulesStatus(
      "Compliance rules could not be loaded. Refresh and try again.",
    );
    return;
  }

  // Seed default rules with extended schema if missing/stale
  if (!state.complianceRules || state.complianceRules.length === 0) {
    state.complianceRules = _defaultRules();
    window.Helpers.saveState(state);
  } else {
    // Migrate existing rules to new schema non-destructively
    state.complianceRules = state.complianceRules.map((r) => _migrateRule(r));
    window.Helpers.saveState(state);
  }

  detectConflicts();
  renderRules();
});

function _defaultRules() {
  return [
    {
      id: "sox404",
      name: "SOX Section 404",
      policy: "SOX",
      dept: "Finance Dept",
      evidence: "Yes",
      status: "Active",
      severity: "Critical",
      deadline: 5,
      escalationThreshold: 7,
      autoEscalate: true,
      escalationConfig: null,
      desc: "Internal financial controls requiring annual sign-offs on all variance reports above $50k.",
      versions: [
        {
          v: 1,
          savedAt: "Dec 10, 2024",
          name: "SOX Section 404",
          desc: "Internal financial controls requiring annual sign-offs on all variance reports above $50k.",
          active: true,
        },
      ],
      injections: [
        {
          workflowId: "wf-1",
          workflowName: "Finance Q4 Reporting",
          stepName: "Review",
          enforcementType: "BLOCK",
        },
      ],
      conflicts: [],
    },
    {
      id: "gdpr",
      name: "GDPR Client Verification",
      policy: "GDPR",
      dept: "All dept",
      evidence: "Yes",
      status: "Active",
      severity: "High",
      deadline: 3,
      escalationThreshold: 5,
      autoEscalate: true,
      escalationConfig: null,
      desc: "Requires multi-factor verification of data subject identity before processing any data export requests.",
      versions: [
        {
          v: 1,
          savedAt: "Dec 5, 2024",
          name: "GDPR Client Verification",
          desc: "Requires multi-factor verification of data subject identity before processing any data export requests.",
          active: true,
        },
      ],
      injections: [
        {
          workflowId: "wf-4",
          workflowName: "GDPR Client Verification",
          stepName: "Identity Check",
          enforcementType: "WARN",
        },
        {
          workflowId: "wf-1",
          workflowName: "Finance Q4 Reporting",
          stepName: "Review",
          enforcementType: "WARN",
        },
      ],
      conflicts: [],
    },
    {
      id: "iso27001",
      name: "ISO 27001 Controls",
      policy: "ISO 27001",
      dept: "IT Dept",
      evidence: "Yes",
      status: "Active",
      severity: "High",
      deadline: 7,
      escalationThreshold: 10,
      autoEscalate: false,
      escalationConfig: {
        disabled: true,
        justification:
          "Manual escalation process agreed with IT Director for this quarter.",
      },
      desc: "Enforces mandatory monthly access log reviews and server hardening audits across all production infrastructure.",
      versions: [
        {
          v: 1,
          savedAt: "Nov 20, 2024",
          name: "ISO 27001 Controls",
          desc: "Enforces mandatory monthly access log reviews and server hardening audits across all production infrastructure.",
          active: true,
        },
      ],
      injections: [
        {
          workflowId: "wf-3",
          workflowName: "IT Security Audit Protocol",
          stepName: "Verify",
          enforcementType: "REQUIRE_APPROVAL",
        },
      ],
      conflicts: [],
    },
  ];
}

function _migrateRule(r) {
  return {
    severity: "High",
    deadline: 5,
    escalationThreshold: 7,
    autoEscalate: true,
    escalationConfig: null,
    versions: [
      {
        v: 1,
        savedAt: "Before migration",
        name: r.name,
        desc: r.desc || "",
        active: true,
      },
    ],
    injections: [],
    conflicts: [],
    ...r,
  };
}

// =====================================================================
// RENDERING
// =====================================================================

// Policy badge colour map
const POLICY_COLORS = {
  SOX: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  GDPR: { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  "ISO 27001": { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  HR: { bg: "#fdf2f8", color: "#86198f", border: "#f0abfc" },
  Finance: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  Security: { bg: "#ede9fe", color: "#6d28d9", border: "#c4b5fd" },
  Internal: { bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" },
};

const SEVERITY_COLORS = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#f59e0b",
  Low: "#16a34a",
};

const ENF_CONFIG = {
  BLOCK: {
    icon: "ri-forbid-line",
    bg: "#fee2e2",
    color: "#dc2626",
    label: "BLOCK",
  },
  WARN: {
    icon: "ri-alert-line",
    bg: "#fef3c7",
    color: "#b45309",
    label: "WARN",
  },
  REQUIRE_APPROVAL: {
    icon: "ri-checkbox-circle-line",
    bg: "#dbeafe",
    color: "#1d4ed8",
    label: "APPROVAL",
  },
  AUTO_FLAG: {
    icon: "ri-flag-line",
    bg: "#ede9fe",
    color: "#7c3aed",
    label: "AUTO-FLAG",
  },
};

function _policyBadge(policy) {
  const c = POLICY_COLORS[policy] || {
    bg: "#f1f5f9",
    color: "#475569",
    border: "#e2e8f0",
  };
  return `<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.3px;background:${c.bg};color:${c.color};border:1px solid ${c.border};">${policy}</span>`;
}

function _severityBarColor(severity) {
  return SEVERITY_COLORS[severity] || "#94a3b8";
}

function _enfPill(type) {
  const c = ENF_CONFIG[type] || ENF_CONFIG.AUTO_FLAG;
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:${c.bg};color:${c.color};"><i class="${c.icon}"></i>${c.label}</span>`;
}

function renderRules(filterFn) {
  const tbody = document.getElementById("rulesTableBody");
  if (!tbody) return;

  // Switch table to "card-list" mode — hide thead, use single colspan rows
  const thead = document.querySelector("#rulesTable thead");
  if (thead) thead.style.display = "none";

  let rules = state.complianceRules;
  if (filterFn) rules = rules.filter(filterFn);

  const searchTerm = (
    document.getElementById("rulesSearchInput")?.value || ""
  ).toLowerCase();
  if (searchTerm) {
    rules = rules.filter(
      (r) =>
        r.name.toLowerCase().includes(searchTerm) ||
        r.policy.toLowerCase().includes(searchTerm) ||
        r.dept.toLowerCase().includes(searchTerm),
    );
  }

  if (rules.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="rules-empty-state">
          <i class="ri-search-line" style="font-size:36px;color:#cbd5e1;"></i>
          <div style="font-weight:600;color:var(--text-main);margin-top:12px;">No rules found</div>
          <div style="color:var(--text-muted);font-size:13px;margin-top:4px;">Try adjusting your search.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rules
    .map((rule) => {
      const hasConflict = currentConflicts.some(
        (c) => c.ruleAId === rule.id || c.ruleBId === rule.id,
      );
      const activeVer = rule.versions?.find((v) => v.active);
      const verLabel = activeVer ? `v${activeVer.v}` : "v1";
      const injections = rule.injections || [];
      const sevColor = _severityBarColor(rule.severity || "High");

      // Build enforcement pills from injections (unique types)
      const enfTypes = [...new Set(injections.map((i) => i.enforcementType))];
      const enfPills = enfTypes.map(_enfPill).join("");

      // Injection workflow chips
      const wfChips =
        injections
          .slice(0, 2)
          .map(
            (inj) =>
              `<span class="rc-wf-chip"><i class="ri-flow-chart"></i>${inj.workflowName} <span class="rc-wf-step">› ${inj.stepName}</span></span>`,
          )
          .join("") +
        (injections.length > 2
          ? `<span class="rc-wf-chip gray">+${injections.length - 2} more</span>`
          : "");

      return `
    <tr><td colspan="6" style="padding:0;">
      <div class="rule-card ${hasConflict ? "rule-card--conflict" : ""}" style="border-left-color:${sevColor};">

        <!-- LEFT: severity bar rendered via border-left (set above) -->

        <!-- MAIN CONTENT -->
        <div class="rc-body">

          <!-- Row 1: name + badges -->
          <div class="rc-row rc-row--top">
            <div class="rc-name">
              ${hasConflict ? `<span class="rc-conflict-icon" title="Has unresolved conflict"><i class="ri-error-warning-fill"></i></span>` : ""}
              ${rule.name}
            </div>
            <div class="rc-badges">
              ${_policyBadge(rule.policy)}
              <span class="rc-sev-badge" style="background:${sevColor}15;color:${sevColor};border:1px solid ${sevColor}40;">${rule.severity || "High"}</span>
              <span class="badge ${rule.status === "Active" ? "green" : "gray"}" style="font-size:11px;">${rule.status}</span>
            </div>
          </div>

          <!-- Row 2: description -->
          <div class="rc-desc">${(rule.desc || "").substring(0, 90)}${(rule.desc || "").length > 90 ? "…" : ""}</div>

          <!-- Row 3: meta row -->
          <div class="rc-row rc-row--meta">
            <div class="rc-meta-pills">
              <span class="rc-meta-pill"><i class="ri-git-branch-line"></i>${verLabel}</span>
              <span class="rc-meta-pill"><i class="ri-building-line"></i>${rule.dept}</span>
              <span class="rc-meta-pill"><i class="ri-file-text-line"></i>Evidence: ${rule.evidence}</span>
              ${
                rule.autoEscalate
                  ? `<span class="rc-meta-pill orange"><i class="ri-alarm-line"></i>Escalate ${rule.escalationThreshold}d</span>`
                  : `<span class="rc-meta-pill gray"><i class="ri-alarm-line"></i>No auto-escalate</span>`
              }
            </div>
          </div>

          <!-- Row 4: enforcement pills + workflow chips -->
          ${
            enfTypes.length > 0 || injections.length > 0
              ? `
          <div class="rc-row rc-row--enf">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              ${enfPills}
              ${wfChips}
            </div>
          </div>`
              : ""
          }

        </div>

        <!-- RIGHT: actions -->
        <div class="rc-actions">
          <button class="rc-btn rc-btn--view"    onclick="viewRule('${rule.id}')"                  title="View"><i class="ri-eye-line"></i></button>
          <button class="rc-btn rc-btn--edit"    onclick="editRule('${rule.id}')"                  title="Edit"><i class="ri-edit-line"></i></button>
          <button class="rc-btn rc-btn--history" onclick="openVersionHistoryModal('${rule.id}')"   title="Version History"><i class="ri-history-line"></i></button>
          <button class="rc-btn rc-btn--wf"      onclick="openAttachWorkflowModal('${rule.id}')"   title="Attach to Workflow"><i class="ri-flow-chart"></i></button>
          <button class="rc-btn rc-btn--esc"     onclick="openEscalationConfigModal('${rule.id}')" title="Escalation Config"><i class="ri-alarm-warning-line"></i></button>
        </div>

      </div>
    </td></tr>`;
    })
    .join("");
}

// =====================================================================
// SEARCH & TABS
// =====================================================================

function onRulesSearch() {
  if (activeTab === "conflicts") {
    renderConflictsTab();
  } else {
    renderRules();
  }
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll(".rules-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });
  if (tab === "conflicts") {
    renderConflictsTab();
  } else {
    renderRules();
  }
}

// =====================================================================
// NEW RULE
// =====================================================================

function openNewRuleModal() {
  document.getElementById("ruleName").value = "";
  document.getElementById("ruleDesc").value = "";
  document.getElementById("rulePolicy").value = "GDPR";
  document.getElementById("ruleSeverity").value = "Critical";
  document.getElementById("ruleDept").value = "All Departments";
  document.getElementById("ruleProcess").value = "All Processes";
  document.getElementById("ruleDeadline").value = "5";
  document.getElementById("ruleEscalation").value = "7";
  document.getElementById("toggleEvidence").checked = false;
  document.getElementById("toggleBlock").checked = true;
  document.getElementById("toggleNotify").checked = true;
  document.getElementById("toggleAutoFlag").checked = true;
  document.getElementById("newRuleModal").classList.add("active");
}

function closeNewRuleModal() {
  document.getElementById("newRuleModal").classList.remove("active");
}

function saveNewRule() {
  const nameEl = document.getElementById("ruleName");
  if (!nameEl.value.trim()) {
    if (window.Toast) window.Toast.show("Rule name is required", "error");
    return;
  }
  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const newRule = {
    id: "rule_" + Date.now(),
    name: nameEl.value.trim(),
    policy: document.getElementById("rulePolicy").value || "General",
    dept: document.getElementById("ruleDept").value || "All Departments",
    evidence: document.getElementById("toggleEvidence").checked ? "Yes" : "No",
    status: "Active",
    severity: document.getElementById("ruleSeverity").value || "High",
    deadline: parseInt(document.getElementById("ruleDeadline").value) || 5,
    escalationThreshold:
      parseInt(document.getElementById("ruleEscalation").value) || 7,
    autoEscalate: true,
    escalationConfig: null,
    desc:
      document.getElementById("ruleDesc").value.trim() ||
      "No description provided.",
    versions: [
      {
        v: 1,
        savedAt: now,
        name: nameEl.value.trim(),
        desc:
          document.getElementById("ruleDesc").value.trim() ||
          "No description provided.",
        active: true,
      },
    ],
    injections: [],
    conflicts: [],
  };
  state.complianceRules.push(newRule);
  window.Helpers.saveState(state);
  if (window.Toast)
    window.Toast.show("New rule created successfully", "success");
  closeNewRuleModal();
  detectConflicts();
  renderRules();
}

// =====================================================================
// VIEW / EDIT (existing — preserved)
// =====================================================================

function viewRule(id) {
  const rule = state.complianceRules.find((r) => String(r.id) === String(id));
  if (!rule) return;
  const old = document.getElementById("dynamic-rule-modal");
  if (old) old.remove();

  const activeVer = rule.versions.find((v) => v.active);
  const verLabel = activeVer ? `v${activeVer.v}` : "v1";

  const html = `
  <div class="modal-overlay active" id="dynamic-rule-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">View Compliance Rule</h3>
        <span class="modal-close" onclick="document.getElementById('dynamic-rule-modal').remove()">&times;</span>
      </div>
      <div class="modal-body" style="padding:24px;line-height:1.6;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Rule Name</span><br><strong style="font-size:15px">${rule.name}</strong></div>
          <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Policy</span><br><strong style="font-size:15px">${rule.policy}</strong></div>
          <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Applies To</span><br><strong style="font-size:15px">${rule.dept}</strong></div>
          <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Status / Version</span><br><span class="badge ${rule.status === "Active" ? "green" : "gray"}" style="margin-top:4px">${rule.status}</span> <span class="rule-meta-chip">${verLabel}</span></div>
        </div>
        <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Description</span><br><span style="color:#334155">${rule.desc}</span></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('dynamic-rule-modal').remove()">Close</button>
        <button class="btn btn-primary" onclick="document.getElementById('dynamic-rule-modal').remove();editRule('${id}')">Edit Rule</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function editRule(id) {
  const rule = state.complianceRules.find((r) => String(r.id) === String(id));
  if (!rule) return;
  const old = document.getElementById("dynamic-rule-modal");
  if (old) old.remove();

  const html = `
  <div class="modal-overlay active" id="dynamic-rule-modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Edit Compliance Rule</h3>
        <span class="modal-close" onclick="document.getElementById('dynamic-rule-modal').remove()">&times;</span>
      </div>
      <div class="modal-body" style="padding:24px;">
        <div class="form-group">
          <label class="form-label">Rule Name</label>
          <input type="text" id="editRuleName" class="form-control" value="${rule.name}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">Policy</label>
            <input type="text" id="editRulePolicy" class="form-control" value="${rule.policy}">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Applies To</label>
            <input type="text" id="editRuleDept" class="form-control" value="${rule.dept}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="editRuleDesc" class="form-control" rows="4">${rule.desc}</textarea>
        </div>
        <div class="form-group" style="margin-bottom:0;background:#f8fafc;padding:12px;border-radius:8px;border:1px dashed #e2e8f0;font-size:12px;color:#64748b;">
          💡 Saving will auto-create a new version snapshot in the rule's history.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('dynamic-rule-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveEdit('${id}')">Save Changes</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function saveEdit(id) {
  const idx = state.complianceRules.findIndex(
    (r) => String(r.id) === String(id),
  );
  if (idx === -1) return;

  const rule = state.complianceRules[idx];
  const newName = document.getElementById("editRuleName").value.trim();
  const newDesc = document.getElementById("editRuleDesc").value.trim();
  const newPolicy = document.getElementById("editRulePolicy").value.trim();
  const newDept = document.getElementById("editRuleDept").value.trim();

  // Check if content actually changed
  const lastVer = rule.versions[rule.versions.length - 1];
  const unchanged = lastVer.name === newName && lastVer.desc === newDesc;
  if (unchanged) {
    if (window.Toast)
      window.Toast.show(
        "No changes since last version — snapshot not created",
        "warning",
      );
  } else {
    // Create new version snapshot
    const now = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    rule.versions.forEach((v) => (v.active = false));
    rule.versions.push({
      v: rule.versions.length + 1,
      savedAt: now,
      name: newName,
      desc: newDesc,
      active: true,
    });
  }

  rule.name = newName;
  rule.policy = newPolicy;
  rule.dept = newDept;
  rule.desc = newDesc;

  window.Helpers.saveState(state);
  if (window.Toast && !unchanged)
    window.Toast.show(
      "Rule updated — v" + rule.versions.length + " created",
      "success",
    );
  document.getElementById("dynamic-rule-modal").remove();
  detectConflicts();
  renderRules();
}

// =====================================================================
// FEATURE 1: RULE VERSIONING
// =====================================================================

function openVersionHistoryModal(ruleId) {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(ruleId),
  );
  if (!rule) return;
  selectedRuleId = ruleId;

  const activeVer = rule.versions.find((v) => v.active);
  document.getElementById("vhRuleName").textContent = rule.name;
  document.getElementById("vhActiveBannerText").textContent =
    "Active: " +
    (activeVer ? `v${activeVer.v} — saved ${activeVer.savedAt}` : "v1");
  renderVersionList(rule);
  document.getElementById("versionHistoryModal").classList.add("active");
}

function closeVersionHistoryModal() {
  document.getElementById("versionHistoryModal").classList.remove("active");
  selectedRuleId = null;
}

function renderVersionList(rule) {
  const container = document.getElementById("vhVersionList");
  if (!rule.versions || rule.versions.length === 0) {
    container.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);">No versions yet.</div>`;
    return;
  }
  // Show newest first
  const sorted = [...rule.versions].reverse();
  container.innerHTML = sorted
    .map(
      (ver) => `
    <div class="vh-version-item ${ver.active ? "vh-version-active" : ""}">
      <div class="vh-version-header">
        <div>
          <span class="vh-version-label">v${ver.v}</span>
          ${ver.active ? `<span class="badge green" style="margin-left:8px;font-size:10px;">ACTIVE</span>` : ""}
        </div>
        <div class="vh-version-meta">${ver.savedAt}</div>
      </div>
      <div class="vh-version-name">${ver.name}</div>
      <div class="vh-version-desc">${(ver.desc || "").substring(0, 120)}${(ver.desc || "").length > 120 ? "…" : ""}</div>
      ${
        !ver.active
          ? `<button class="btn btn-secondary" style="margin-top:10px;font-size:12px;padding:5px 12px;" onclick="activateVersion('${rule.id}', ${ver.v})">Activate this version</button>`
          : ""
      }
    </div>`,
    )
    .join("");
}

function createNewVersion() {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(selectedRuleId),
  );
  if (!rule) return;

  const lastVer = rule.versions[rule.versions.length - 1];
  // Duplicate guard
  if (lastVer.name === rule.name && lastVer.desc === rule.desc) {
    if (window.Toast)
      window.Toast.show(
        "No changes since last version — edit the rule first",
        "warning",
      );
    return;
  }
  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  rule.versions.forEach((v) => (v.active = false));
  rule.versions.push({
    v: rule.versions.length + 1,
    savedAt: now,
    name: rule.name,
    desc: rule.desc,
    active: true,
  });
  window.Helpers.saveState(state);
  if (window.Toast)
    window.Toast.show(`v${rule.versions.length} saved`, "success");
  document.getElementById("vhActiveBannerText").textContent =
    `Active: v${rule.versions.length} — saved ${now}`;
  renderVersionList(rule);
  renderRules();
}

function activateVersion(ruleId, versionNum) {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(ruleId),
  );
  if (!rule) return;
  rule.versions.forEach((v) => (v.active = false));
  const target = rule.versions.find((v) => v.v === versionNum);
  if (!target) return;
  target.active = true;
  // Restore rule content to that version
  rule.name = target.name;
  rule.desc = target.desc;
  window.Helpers.saveState(state);
  if (window.Toast)
    window.Toast.show(`v${versionNum} is now the active version`, "success");
  document.getElementById("vhActiveBannerText").textContent =
    `Active: v${versionNum} — saved ${target.savedAt}`;
  document.getElementById("vhRuleName").textContent = rule.name;
  renderVersionList(rule);
  renderRules();
}

// =====================================================================
// FEATURE 2: ATTACH TO WORKFLOW
// =====================================================================

function openAttachWorkflowModal(ruleId) {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(ruleId),
  );
  if (!rule) return;
  selectedRuleId = ruleId;
  const wfEmptyState = document.getElementById("awWorkflowEmptyState");

  // Reset form
  document.getElementById("awWorkflowError").style.display = "none";
  document.getElementById("awStepError").style.display = "none";
  document.getElementById("awStepGroup").style.display = "none";
  if (wfEmptyState) wfEmptyState.hidden = true;

  // Populate workflow dropdown
  const wfSelect = document.getElementById("awWorkflowSelect");
  const workflows = typeof getWorkflows === "function" ? getWorkflows() : [];
  wfSelect.innerHTML =
    `<option value="">— Select a workflow —</option>` +
    workflows
      .map(
        (wf) =>
          `<option value="${wf.id}" data-stages='${JSON.stringify(wf.stages)}'>${wf.name}</option>`,
      )
      .join("");
  wfSelect.disabled = workflows.length === 0;
  if (wfEmptyState) wfEmptyState.hidden = workflows.length !== 0;

  // Default enforcement = BLOCK
  document.querySelectorAll(".et-card").forEach((c) => {
    c.classList.toggle("selected", c.dataset.type === "BLOCK");
    c.setAttribute(
      "aria-checked",
      c.dataset.type === "BLOCK" ? "true" : "false",
    );
  });

  // Show existing injections
  renderExistingInjections(rule);

  document.getElementById("awRuleName").textContent = rule.name;
  document.getElementById("attachWorkflowModal").classList.add("active");
}

function closeAttachWorkflowModal() {
  document.getElementById("attachWorkflowModal").classList.remove("active");
  document.getElementById("awWorkflowSelect").disabled = false;
  selectedRuleId = null;
}

function onWorkflowSelect() {
  const wfSelect = document.getElementById("awWorkflowSelect");
  const selected = wfSelect.options[wfSelect.selectedIndex];
  document.getElementById("awWorkflowError").style.display = "none";

  if (!selected.value) {
    document.getElementById("awStepGroup").style.display = "none";
    return;
  }

  let stages = [];
  try {
    stages = JSON.parse(selected.getAttribute("data-stages") || "[]");
  } catch (_) {}

  const stepSelect = document.getElementById("awStepSelect");
  stepSelect.innerHTML =
    `<option value="">— Select a step —</option>` +
    stages.map((s) => `<option value="${s}">${s}</option>`).join("");

  document.getElementById("awStepGroup").style.display = "block";
}

function selectEnforcement(el) {
  document.querySelectorAll(".et-card").forEach((c) => {
    c.classList.remove("selected");
    c.setAttribute("aria-checked", "false");
  });
  el.classList.add("selected");
  el.setAttribute("aria-checked", "true");
}

function saveWorkflowInjection() {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(selectedRuleId),
  );
  if (!rule) return;

  const wfSelect = document.getElementById("awWorkflowSelect");
  const stepSelect = document.getElementById("awStepSelect");
  const selectedET = document.querySelector(".et-card.selected");

  let valid = true;
  if (!wfSelect.value) {
    document.getElementById("awWorkflowError").style.display = "block";
    valid = false;
  }
  if (!stepSelect.value) {
    document.getElementById("awStepError").style.display = "block";
    valid = false;
  }
  if (!valid) return;

  const enforcementType = selectedET ? selectedET.dataset.type : "BLOCK";
  const wfName = wfSelect.options[wfSelect.selectedIndex].text;

  const injection = {
    workflowId: wfSelect.value,
    workflowName: wfName,
    stepName: stepSelect.value,
    enforcementType,
  };

  if (!rule.injections) rule.injections = [];
  rule.injections.push(injection);
  window.Helpers.saveState(state);

  if (window.Toast)
    window.Toast.show(
      `Rule attached to "${wfName} → ${stepSelect.value}" as ${enforcementType}`,
      "success",
    );

  // Re-detect conflicts after new injection
  detectConflicts();
  renderExistingInjections(rule);
  renderRules();
}

function renderExistingInjections(rule) {
  const section = document.getElementById("awExistingInjectionsSection");
  const list = document.getElementById("awExistingInjectionsList");
  if (!rule.injections || rule.injections.length === 0) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  list.innerHTML = rule.injections
    .map(
      (inj, i) => `
    <div class="aw-injection-item">
      <div class="aw-injection-info">
        <span class="aw-injection-wf">${inj.workflowName}</span>
        <span class="aw-injection-arrow">→</span>
        <span class="aw-injection-step">${inj.stepName}</span>
      </div>
      <span class="badge ${_enforcementBadgeClass(inj.enforcementType)}">${inj.enforcementType}</span>
      <button class="aw-injection-remove" onclick="removeInjection('${rule.id}', ${i})" title="Remove injection">&times;</button>
    </div>`,
    )
    .join("");
}

function removeInjection(ruleId, index) {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(ruleId),
  );
  if (!rule || !rule.injections) return;
  rule.injections.splice(index, 1);
  window.Helpers.saveState(state);
  if (window.Toast) window.Toast.show("Injection removed", "success");
  detectConflicts();
  renderExistingInjections(rule);
  renderRules();
}

function _enforcementBadgeClass(type) {
  return (
    {
      BLOCK: "red",
      WARN: "yellow",
      REQUIRE_APPROVAL: "blue",
      AUTO_FLAG: "gray",
    }[type] || "gray"
  );
}

// =====================================================================
// FEATURE 3: ESCALATION CONFIGURATION
// =====================================================================

function openEscalationConfigModal(ruleId) {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(ruleId),
  );
  if (!rule) return;
  selectedRuleId = ruleId;

  // Clear errors
  document.getElementById("ecThresholdError").style.display = "none";
  document.getElementById("ecJustificationError").style.display = "none";

  // Set current values
  const enabled = rule.autoEscalate !== false;
  document.getElementById("ecAutoEscalateToggle").checked = enabled;
  document.getElementById("ecThresholdDays").value =
    rule.escalationThreshold || 7;
  document.getElementById("ecDisableJustification").value = "";

  // Show/hide conditional sections
  document.getElementById("ecThresholdGroup").style.display = enabled
    ? "block"
    : "none";
  document.getElementById("ecDisableJustificationGroup").style.display = enabled
    ? "none"
    : "block";

  // Show current config if exists
  renderCurrentEscalationConfig(rule);

  document.getElementById("ecRuleName").textContent = rule.name;
  document.getElementById("escalationConfigModal").classList.add("active");
}

function closeEscalationConfigModal() {
  document.getElementById("escalationConfigModal").classList.remove("active");
  selectedRuleId = null;
}

function onEscalateToggle() {
  const enabled = document.getElementById("ecAutoEscalateToggle").checked;
  document.getElementById("ecThresholdGroup").style.display = enabled
    ? "block"
    : "none";
  document.getElementById("ecDisableJustificationGroup").style.display = enabled
    ? "none"
    : "block";
  document.getElementById("ecThresholdError").style.display = "none";
  document.getElementById("ecJustificationError").style.display = "none";
}

function saveEscalationConfig() {
  const rule = state.complianceRules.find(
    (r) => String(r.id) === String(selectedRuleId),
  );
  if (!rule) return;

  const enabled = document.getElementById("ecAutoEscalateToggle").checked;
  let valid = true;

  if (enabled) {
    const days = parseInt(document.getElementById("ecThresholdDays").value);
    if (!days || days < 1 || days > 90) {
      document.getElementById("ecThresholdError").style.display = "block";
      valid = false;
    }
    if (!valid) return;
    rule.autoEscalate = true;
    rule.escalationThreshold = days;
    rule.escalationConfig = {
      enabled: true,
      threshold: days,
      savedAt: _nowDate(),
    };
  } else {
    const justification = document
      .getElementById("ecDisableJustification")
      .value.trim();
    if (!justification) {
      document.getElementById("ecJustificationError").style.display = "block";
      valid = false;
    }
    if (!valid) return;
    rule.autoEscalate = false;
    rule.escalationConfig = {
      enabled: false,
      justification,
      savedAt: _nowDate(),
    };
  }

  window.Helpers.saveState(state);
  if (window.Toast)
    window.Toast.show("Escalation configuration saved", "success");
  closeEscalationConfigModal();
  renderRules();
}

function renderCurrentEscalationConfig(rule) {
  const box = document.getElementById("ecCurrentConfig");
  const content = document.getElementById("ecCurrentConfigContent");
  if (!rule.escalationConfig) {
    box.style.display = "none";
    return;
  }
  const cfg = rule.escalationConfig;
  box.style.display = "block";
  if (cfg.enabled) {
    content.innerHTML = `<div style="font-size:13px;color:var(--text-main);">✅ Auto-escalation <strong>enabled</strong> — threshold: <strong>${cfg.threshold} days</strong><br><span style="color:var(--text-muted);font-size:12px;">Saved ${cfg.savedAt}</span></div>`;
  } else {
    content.innerHTML = `<div style="font-size:13px;color:var(--text-main);">⛔ Auto-escalation <strong>disabled</strong><br><span style="color:#92400e;">Justification: ${cfg.justification}</span><br><span style="color:var(--text-muted);font-size:12px;">Saved ${cfg.savedAt}</span></div>`;
  }
}

// =====================================================================
// FEATURE 4: CONFLICT DETECTION & RESOLUTION
// =====================================================================

function detectConflicts() {
  currentConflicts = [];
  const rules = state.complianceRules;

  // Build index: key = "workflowId::stepName" → [{ruleId, enforcementType}]
  const stepIndex = {};
  rules.forEach((rule) => {
    (rule.injections || []).forEach((inj) => {
      const key = `${inj.workflowId}::${inj.stepName}`;
      if (!stepIndex[key]) stepIndex[key] = [];
      stepIndex[key].push({
        ruleId: rule.id,
        ruleName: rule.name,
        workflowName: inj.workflowName,
        stepName: inj.stepName,
        enforcementType: inj.enforcementType,
      });
    });
  });

  // Find pairs with different enforcement types on the same step
  Object.entries(stepIndex).forEach(([_key, entries]) => {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        if (entries[i].enforcementType !== entries[j].enforcementType) {
          currentConflicts.push({
            id: `conflict_${Date.now()}_${currentConflicts.length}`,
            workflowName: entries[i].workflowName,
            stepName: entries[i].stepName,
            ruleAId: entries[i].ruleId,
            ruleAName: entries[i].ruleName,
            ruleAType: entries[i].enforcementType,
            ruleBId: entries[j].ruleId,
            ruleBName: entries[j].ruleName,
            ruleBType: entries[j].enforcementType,
            resolved: false,
          });
        }
      }
    }
  });

  // Update badge counts
  const count = currentConflicts.filter((c) => !c.resolved).length;
  const chip = document.getElementById("conflictsChipCount");
  if (chip) chip.textContent = count;
  const tabBadge = document.getElementById("conflictsTabBadge");
  if (tabBadge) {
    tabBadge.textContent = count;
    tabBadge.style.display = count > 0 ? "inline-flex" : "none";
  }
  const conflictsChip = document.getElementById("conflictsChip");
  if (conflictsChip) {
    conflictsChip.style.display = count > 0 ? "flex" : "none";
  }
}

function renderConflictsTab() {
  const tbody = document.getElementById("rulesTableBody");
  if (!tbody) return;

  // Show thead hidden (card-row mode)
  const thead = document.querySelector("#rulesTable thead");
  if (thead) thead.style.display = "none";

  const unresolved = currentConflicts.filter((c) => !c.resolved);
  if (unresolved.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="rules-empty-state" style="padding:56px 24px;">
          <div style="width:56px;height:56px;border-radius:50%;background:#f0fdf4;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
            <i class="ri-shield-check-line" style="font-size:28px;color:#16a34a;"></i>
          </div>
          <div style="font-weight:700;font-size:16px;color:var(--text-main);margin-bottom:6px;">No Conflicts Detected</div>
          <div style="color:var(--text-muted);font-size:13px;max-width:320px;margin:0 auto;line-height:1.6;">All workflow step injections have consistent enforcement types. Your rules are clean.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = unresolved
    .map((conflict, idx) => {
      const cA = ENF_CONFIG[conflict.ruleAType] || ENF_CONFIG.AUTO_FLAG;
      const cB = ENF_CONFIG[conflict.ruleBType] || ENF_CONFIG.AUTO_FLAG;
      return `
    <tr><td colspan="6" style="padding:0;">
      <div class="conflict-card">

        <!-- Header bar -->
        <div class="cc-header">
          <div class="cc-header-left">
            <div class="cc-warn-icon"><i class="ri-error-warning-fill"></i></div>
            <div>
              <div class="cc-title">Rule Conflict Detected</div>
              <div class="cc-context">
                <i class="ri-flow-chart" style="font-size:12px;"></i>
                ${conflict.workflowName}
                <span class="cc-arrow">›</span>
                <strong>${conflict.stepName}</strong>
              </div>
            </div>
          </div>
          <button class="btn btn-primary cc-resolve-btn" onclick="openConflictResolveModal(${idx})">
            <i class="ri-scales-3-line"></i> Resolve Conflict
          </button>
        </div>

        <!-- Rule comparison -->
        <div class="cc-comparison">
          <!-- Rule A -->
          <div class="cc-rule-side cc-rule-side--a">
            <div class="cc-rule-label">Rule A</div>
            <div class="cc-rule-name">${conflict.ruleAName}</div>
            <div class="cc-rule-enf" style="background:${cA.bg};color:${cA.color};">
              <i class="${cA.icon}"></i> ${cA.label}
            </div>
          </div>

          <!-- VS divider -->
          <div class="cc-vs">
            <div class="cc-vs-circle">VS</div>
          </div>

          <!-- Rule B -->
          <div class="cc-rule-side cc-rule-side--b">
            <div class="cc-rule-label">Rule B</div>
            <div class="cc-rule-name">${conflict.ruleBName}</div>
            <div class="cc-rule-enf" style="background:${cB.bg};color:${cB.color};">
              <i class="${cB.icon}"></i> ${cB.label}
            </div>
          </div>
        </div>

        <!-- Footer note -->
        <div class="cc-footer">
          <i class="ri-information-line"></i>
          Both rules inject into the same workflow step with different enforcement modes. A CO must designate which rule takes authority. The suppressed rule will be logged.
        </div>

      </div>
    </td></tr>`;
    })
    .join("");
}

function openConflictResolveModal(conflictIndex) {
  const unresolved = currentConflicts.filter((c) => !c.resolved);
  const conflict = unresolved[conflictIndex];
  if (!conflict) return;

  // Store currently resolving conflict
  window._resolveConflictTarget = conflict;

  document.getElementById("crNoteError").style.display = "none";
  document.getElementById("crResolutionNote").value = "";
  document.getElementById("crConflictContext").textContent =
    `${conflict.workflowName} → ${conflict.stepName}`;

  document.getElementById("crRulesGrid").innerHTML = `
    <div class="cr-rule-card" data-ruleid="${conflict.ruleAId}" onclick="selectConflictRule(this)">
      <div class="cr-rule-card-check"><span>○</span></div>
      <div>
        <div class="cr-rule-card-name">${conflict.ruleAName}</div>
        <span class="badge ${_enforcementBadgeClass(conflict.ruleAType)}">${conflict.ruleAType}</span>
      </div>
    </div>
    <div class="cr-rule-card" data-ruleid="${conflict.ruleBId}" onclick="selectConflictRule(this)">
      <div class="cr-rule-card-check"><span>○</span></div>
      <div>
        <div class="cr-rule-card-name">${conflict.ruleBName}</div>
        <span class="badge ${_enforcementBadgeClass(conflict.ruleBType)}">${conflict.ruleBType}</span>
      </div>
    </div>`;

  document.getElementById("conflictResolveModal").classList.add("active");
}

function closeConflictResolveModal() {
  document.getElementById("conflictResolveModal").classList.remove("active");
  window._resolveConflictTarget = null;
}

function selectConflictRule(el) {
  document.querySelectorAll(".cr-rule-card").forEach((c) => {
    c.classList.remove("selected");
    c.querySelector(".cr-rule-card-check span").textContent = "○";
  });
  el.classList.add("selected");
  el.querySelector(".cr-rule-card-check span").textContent = "●";
}

function resolveConflict() {
  const conflict = window._resolveConflictTarget;
  if (!conflict) return;

  const selected = document.querySelector(".cr-rule-card.selected");
  const note = document.getElementById("crResolutionNote").value.trim();

  if (!selected) {
    if (window.Toast)
      window.Toast.show("Please select the authoritative rule", "error");
    return;
  }
  if (!note) {
    document.getElementById("crNoteError").style.display = "block";
    return;
  }

  const winnerRuleId = selected.dataset.ruleid;
  const loserRuleId =
    winnerRuleId === conflict.ruleAId ? conflict.ruleBId : conflict.ruleAId;

  // Mark conflict as resolved in state
  conflict.resolved = true;
  conflict.resolution = {
    winnerRuleId,
    loserRuleId,
    note,
    resolvedAt: _nowDate(),
  };

  // Log to audit trail in state
  if (!state.auditLog) state.auditLog = [];
  state.auditLog.push({
    id: Date.now(),
    action: "CONFLICT_RESOLVED",
    entity: `${conflict.workflowName} → ${conflict.stepName}`,
    winnerRule: winnerRuleId,
    loserRule: loserRuleId,
    note,
    actor: "Compliance Officer",
    timestamp: _nowDate(),
  });

  window.Helpers.saveState(state);
  if (window.Toast)
    window.Toast.show(
      "Conflict resolved — resolution logged to audit trail",
      "success",
    );
  closeConflictResolveModal();
  detectConflicts();
  renderConflictsTab();
}

// =====================================================================
// HELPERS
// =====================================================================
function _nowDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
