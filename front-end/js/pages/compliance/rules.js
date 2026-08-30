// js/pages/compliance/rules.js
// Compliance Rules — fully wired to NestJS /compliance-rules API.
// All IDs are String UUIDs. Scope-wise bindings (Company, Branch, Team, Project) supported.

let state;
let _eventsBound = false;

const SEVERITY_OPTS = ['Low', 'Medium', 'High', 'Critical'];

// ── Scope resolution helper ───────────────────────────────────────────────────
function formatScope(r) {
  if (r.bindings && r.bindings.length > 0) {
    return r.bindings.map(b => {
      if (b.scopeType === 'Company') return 'Company-wide';
      if (b.scopeType === 'Team') {
        const tm = (state.teams || []).find(t => String(t.id) === String(b.scopeId));
        return tm ? `Team: ${tm.name}` : 'Team Scope';
      }
      if (b.scopeType === 'Project') {
        const pr = (state.projects || []).find(p => String(p.id) === String(b.scopeId));
        return pr ? `Project: ${pr.name}` : 'Project Scope';
      }
      if (b.scopeType === 'Branch') {
        const br = (state.branches || []).find(bch => String(bch.id) === String(b.scopeId));
        return br ? `Branch: ${br.name}` : 'Branch Scope';
      }
      return `${b.scopeType}`;
    }).join(', ');
  }
  return r.category ? (r.category.name || 'Company-wide') : 'All Departments';
}

function normalise(r) {
  return {
    id:               String(r.id || r.ruleId || ''),
    name:             r.name || r.ruleName || 'Unnamed Rule',
    policy:           r.severity || 'General',
    dept:             formatScope(r),
    evidence:         'Yes',
    status:           r.isActive !== false ? 'Active' : 'Inactive',
    desc:             r.description || 'No description provided.',
    remediationSteps: r.remediationSteps || '',
    severity:         r.severity || 'Medium',
    bindings:         r.bindings || [],
    category:         r.category || null,
  };
}

document.addEventListener('DOMContentLoaded', async function () {
  if (window.Sidebar) window.Sidebar.render('rules');

  // Force hide all inert modals on initial render
  document.querySelectorAll('.modal-overlay, .modal-backdrop').forEach(m => {
    m.classList.remove('active');
    m.classList.add('hidden');
    m.style.display = 'none';
  });

  state = await window.Helpers.getState();
  state.complianceRules = (state.complianceRules || []).map(normalise);

  if (!_eventsBound) {
    _eventsBound = true;
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#btn-new-rule');
      if (btn) openNewRuleModal();
    });
  }

  renderRules();
});

// ── Table renderer ────────────────────────────────────────────────────────────
function renderRules() {
  const tbody = document.getElementById('rulesTableBody');
  if (!tbody) return;

  if (!state.complianceRules || state.complianceRules.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No compliance rules found.</td></tr>';
    return;
  }

  tbody.innerHTML = state.complianceRules.map(rule => `
    <tr>
      <td>
        <div class="td-title">${rule.name}</div>
        <div class="td-subtitle">${rule.desc.substring(0, 50)}${rule.desc.length > 50 ? '...' : ''}</div>
      </td>
      <td><span class="badge ${rule.severity === 'Critical' ? 'critical' : rule.severity === 'High' ? 'warning' : 'pending'}">${rule.severity}</span></td>
      <td><span class="badge gray">${rule.dept}</span></td>
      <td><span class="badge green">${rule.evidence}</span></td>
      <td><span class="badge ${rule.status === 'Active' ? 'green' : 'gray'}">${rule.status}</span></td>
      <td>
        <div class="action-btn-group">
          <button class="action-btn view" onclick="viewRule('${rule.id}')">View</button>
          <button class="action-btn edit" onclick="editRule('${rule.id}')">Edit</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── New Rule modal ────────────────────────────────────────────────────────────
function openNewRuleModal() {
  ['ruleName', 'ruleDesc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sev = document.getElementById('ruleSeverity');
  if (sev) sev.value = 'Medium';

  window.Modal.open('newRuleModal');
}

function closeNewRuleModal() {
  window.Modal.close('newRuleModal');
}

async function saveNewRule() {
  const nameInput = document.getElementById('ruleName');
  if (!nameInput || !nameInput.value.trim()) {
    const errEl = document.getElementById('ruleName-error');
    if (errEl) errEl.classList.remove('hidden');
    if (window.Toast) window.Toast.show('error', 'Validation Error', 'Rule name is required.');
    return;
  }
  const errEl = document.getElementById('ruleName-error');
  if (errEl) errEl.classList.add('hidden');

  const payload = {
    rule_name:   nameInput.value.trim(),
    description: (document.getElementById('ruleDesc')?.value || '').trim() || 'No description provided.',
    severity:    document.getElementById('ruleSeverity')?.value || 'Medium',
    is_active:   true,
    remediation_steps: '',
  };

  const btn = document.getElementById('btn-create-rule');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  try {
    const createdRule = await window.Helpers.api.request('/compliance-rules', 'POST', payload);

    // Auto-create Company-wide binding for this rule if created successfully
    if (createdRule && (createdRule.id || createdRule.ruleId)) {
      try {
        const session = window.Auth ? window.Auth.getSession() : null;
        const compId = session ? session.companyId : null;
        if (compId && compId !== 'all') {
          await window.Helpers.api.request('/compliance-bindings', 'POST', {
            ruleId: createdRule.id || createdRule.ruleId,
            scopeType: 'Company',
            scopeId: compId
          });
        }
      } catch (bErr) {
        console.warn('Scope binding auto-creation warning:', bErr);
      }
    }

    window.Helpers._stateCache = null;
    state = await window.Helpers.getState();
    state.complianceRules = (state.complianceRules || []).map(normalise);

    if (window.Toast) window.Toast.show('success', 'Rule Created', `"${payload.rule_name}" created successfully.`);
    closeNewRuleModal();
    renderRules();
  } catch (e) {
    console.error('Failed to create rule:', e);
    if (window.Toast) window.Toast.show('error', 'Error', 'Failed to create rule. Check backend logs.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Rule'; }
  }
}

// ── View modal ────────────────────────────────────────────────────────────────
function viewRule(id) {
  const rule = state.complianceRules.find(r => r.id === String(id));
  if (!rule) return;

  const severityColor = { Critical: '#ef4444', High: '#f59e0b', Medium: '#3b82f6', Low: '#10b981' };
  const dotColor = severityColor[rule.severity] || '#64748b';

  window.Modal.create({
    id: 'view-rule-modal',
    title: 'View Compliance Rule',
    body: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Rule Name</span><br><strong style="font-size:15px">${rule.name}</strong></div>
        <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Severity</span><br><strong style="font-size:15px;color:${dotColor}">${rule.severity}</strong></div>
        <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Compliance Scope</span><br><strong style="font-size:15px">${rule.dept}</strong></div>
        <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Status</span><br><span class="badge ${rule.status === 'Active' ? 'green' : 'gray'}" style="margin-top:4px">${rule.status}</span></div>
      </div>
      <div><span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;">Description</span><br><span style="color:#334155">${rule.desc}</span></div>`,
    actions: [
      { text: 'Close', class: 'btn-secondary', close: true },
      { text: 'Edit Rule', class: 'btn-primary', onClick: () => { window.Modal.close('view-rule-modal'); editRule(id); return false; } }
    ]
  });
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function editRule(id) {
  const rule = state.complianceRules.find(r => r.id === String(id));
  if (!rule) return;

  const sevOptions = SEVERITY_OPTS.map(s =>
    `<option value="${s}" ${rule.severity === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  window.Modal.create({
    id: 'edit-rule-modal',
    title: 'Edit Compliance Rule',
    body: `
      <div class="form-group">
        <label class="form-label">Rule Name</label>
        <input type="text" id="editRuleName" class="form-control" value="${rule.name}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="form-group" style="margin:0;">
          <label class="form-label">Scope / Framework</label>
          <input type="text" id="editRulePolicy" class="form-control" value="${rule.dept}" disabled readonly style="background:#f1f5f9;color:#64748b">
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Severity Level</label>
          <select id="editRuleSeverity" class="form-control">${sevOptions}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea id="editRuleDesc" class="form-control" rows="4">${rule.desc}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="editRuleStatus" class="form-control">
          <option value="true" ${rule.status === 'Active' ? 'selected' : ''}>Active</option>
          <option value="false" ${rule.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>`,
    actions: [
      { text: 'Cancel', class: 'btn-secondary', close: true },
      { text: 'Save Changes', class: 'btn-primary', onClick: () => saveEdit(id) }
    ]
  });
}

// ── Save edit ─────────────────────────────────────────────────────────────────
async function saveEdit(id) {
  const idx = state.complianceRules.findIndex(r => r.id === String(id));
  if (idx === -1) return true;

  const nameVal   = document.getElementById('editRuleName')?.value?.trim();
  const descVal   = document.getElementById('editRuleDesc')?.value?.trim();
  const sevVal    = document.getElementById('editRuleSeverity')?.value;
  const statusVal = document.getElementById('editRuleStatus')?.value;

  if (!nameVal) {
    if (window.Toast) window.Toast.show('error', 'Validation', 'Rule name cannot be empty.');
    return false; // Keep modal open
  }

  const patch = {
    rule_name:   nameVal,
    description: descVal || 'No description provided.',
    severity:    sevVal || state.complianceRules[idx].severity,
    is_active:   statusVal === 'true',
  };

  // Optimistic local update
  state.complianceRules[idx].name     = patch.rule_name;
  state.complianceRules[idx].desc     = patch.description;
  state.complianceRules[idx].severity = patch.severity;
  state.complianceRules[idx].status   = patch.is_active ? 'Active' : 'Inactive';

  try {
    await window.Helpers.api.request(`/compliance-rules/${id}`, 'PATCH', patch);
    if (window.Toast) window.Toast.show('success', 'Rule Updated', `"${patch.rule_name}" updated.`);
  } catch (e) {
    console.warn('Could not persist rule update to backend:', e);
    if (window.Toast) window.Toast.show('error', 'Save Failed', 'Failed to update rule on backend.');
  }

  renderRules();
  return true; // Close modal
}
