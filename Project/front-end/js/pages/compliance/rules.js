let state;

document.addEventListener("DOMContentLoaded", async function () {
  if (window.Sidebar) window.Sidebar.render("rules");
  state = await window.Helpers.getState();

  // Normalize backend fields so renderRules always has consistent shape
  state.complianceRules = (state.complianceRules || []).map((r) => ({
    // Preserve camelCase IDs already set by helpers.js
    id: String(r.ruleId || r.id || Date.now()),
    name: r.ruleName || r.name || "Unnamed Rule",
    policy: r.severity || "General",   // severity doubles as a policy grouping until schema has dedicated policy field
    dept: "All Departments",            // not in current schema; sensible default
    evidence: "Yes",                    // all rules implicitly require evidence
    status: r.isActive !== false ? "Active" : "Inactive",
    desc: r.description || "No description provided.",
    // Keep originals for detail modals
    remediationSteps: r.remediationSteps || "",
    severity: r.severity || "Medium",
  }));

  renderRules();
});

function renderRules() {
  const tbody = document.getElementById("rulesTableBody");
  if (!tbody) return;

  if (!state.complianceRules || state.complianceRules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted)">No compliance rules found.</td></tr>';
    return;
  }

  tbody.innerHTML = state.complianceRules
    .map(
      (rule) => `
    <tr>
      <td>
        <div class="td-title">${rule.name}</div>
        <div class="td-subtitle">${rule.desc.substring(0, 50)}${rule.desc.length > 50 ? '...' : ''}</div>
      </td>
      <td>${rule.policy}</td>
      <td>${rule.dept}</td>
      <td><span class="badge green">${rule.evidence}</span></td>
      <td><span class="badge ${rule.status === "Active" ? "green" : "gray"}>${rule.status}</span></td>
      <td>
        <div class="action-btn-group">
          <button class="action-btn view" onclick="viewRule('${rule.id}')">View</button>
          <button class="action-btn edit" onclick="editRule('${rule.id}')">Edit</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

// === NEW RULE LOGIC ===
function openNewRuleModal() {
  document.getElementById("ruleName").value = "";
  document.getElementById("ruleDesc").value = "";
  document.getElementById("newRuleModal").classList.add("active");
}

function closeNewRuleModal() {
  document.getElementById("newRuleModal").classList.remove("active");
}

async function saveNewRule() {
  const result = window.Validator.validateForm({
    "ruleName": { required: true }
  });

  if (!result.valid) {
    if (window.Toast) window.Toast.show("Please fix the errors in the form.", "error");
    return;
  }

  const nameInput = document.getElementById("ruleName");

  const newRule = {
    id: "rule_" + Date.now(),
    name: nameInput.value,
    policy: document.getElementById("rulePolicy").value || "General",
    dept: document.getElementById("ruleDept").value || "All Departments",
    evidence: document.getElementById("toggleEvidence").checked ? "Yes" : "No",
    status: "Active",
    desc:
      document.getElementById("ruleDesc").value || "No description provided.",
  };

  state.complianceRules.push(newRule);
  await window.Helpers.saveState(state);

  if (window.Toast)
    window.Toast.show("New rule created successfully", "success");
  closeNewRuleModal();
  renderRules();
}

// === BULLETPROOF VIEW/EDIT MODALS ===
function viewRule(id) {
  const rule = state.complianceRules.find((r) => String(r.id) === String(id));
  if (!rule) return;

  // Clear any existing dynamic modal
  const oldModal = document.getElementById("dynamic-rule-modal");
  if (oldModal) oldModal.remove();

  // Inject HTML directly into the DOM
  const modalHtml = `
    <div class="modal-overlay active" id="dynamic-rule-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">View Compliance Rule</h3>
          <span class="modal-close" onclick="document.getElementById('dynamic-rule-modal').remove()">&times;</span>
        </div>
        <div class="modal-body" style="padding: 24px; line-height: 1.6;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div><span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600;">Rule Name</span><br><strong style="font-size:15px">${rule.name}</strong></div>
            <div><span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600;">Policy</span><br><strong style="font-size:15px">${rule.policy}</strong></div>
            <div><span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600;">Applies To</span><br><strong style="font-size:15px">${rule.dept}</strong></div>
            <div><span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600;">Status</span><br><span class="badge ${rule.status === "Active" ? "green" : "gray"}" style="margin-top:4px">${rule.status}</span></div>
          </div>
          <div><span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:600;">Description</span><br><span style="color:#334155">${rule.desc}</span></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('dynamic-rule-modal').remove()">Close</button>
          <button class="btn btn-primary" onclick="document.getElementById('dynamic-rule-modal').remove(); editRule('${id}')">Edit Rule</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

function editRule(id) {
  const rule = state.complianceRules.find((r) => String(r.id) === String(id));
  if (!rule) return;

  const oldModal = document.getElementById("dynamic-rule-modal");
  if (oldModal) oldModal.remove();

  const modalHtml = `
    <div class="modal-overlay active" id="dynamic-rule-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Edit Compliance Rule</h3>
          <span class="modal-close" onclick="document.getElementById('dynamic-rule-modal').remove()">&times;</span>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <div class="form-group">
            <label class="form-label">Rule Name</label>
            <input type="text" id="editRuleName" class="form-control" value="${rule.name}">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom: 16px;">
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
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('dynamic-rule-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveEdit('${id}')">Save Changes</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

async function saveEdit(id) {
  const idx = state.complianceRules.findIndex(
    (r) => String(r.id) === String(id),
  );
  if (idx > -1) {
    state.complianceRules[idx].name =
      document.getElementById("editRuleName").value;
    state.complianceRules[idx].policy =
      document.getElementById("editRulePolicy").value;
    state.complianceRules[idx].dept =
      document.getElementById("editRuleDept").value;
    state.complianceRules[idx].desc =
      document.getElementById("editRuleDesc").value;

    await window.Helpers.saveState(state);
    if (window.Toast) window.Toast.show("Rule updated successfully", "success");
    renderRules();
  }
  document.getElementById("dynamic-rule-modal").remove();
}
