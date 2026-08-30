let healthChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await ExecutiveShell.init({
    activeNav: 'compliance',
    pageTitle: 'Compliance Intelligence',
    subtitle: 'Company-wide compliance posture and violations',
  });

  await loadData();
  bindFilters();
  ExecutiveShell.onBranchChange(loadData);
});

function bindFilters() {
  document.getElementById('violation-search')?.addEventListener('input', renderViolations);
  document.getElementById('severity-filter')?.addEventListener('change', renderViolations);
}

function resolveBranch(v, state) {
  if (v.entityType === 'Project') {
    const p = (state.projects || []).find((x) => String(x.id || x.projectId) === String(v.entityId));
    return p?.branchName || '—';
  }
  if (v.entityType === 'Task') {
    const t = (state.tasks || []).find((x) => String(x.id || x.taskId) === String(v.entityId));
    return t?.branchName || '—';
  }
  return '—';
}

async function loadData() {
  window.Helpers._stateCache = null;
  const state = await window.Helpers.getState(true);
  window._execComplianceState = state;
  renderKpis(state);
  renderViolations();
  renderBranchHealth(state);
  renderEvidenceSummary(state);
  document.getElementById('context-banner').textContent = `Viewing: ${ExecutiveShell.getBranchLabel()}`;
}

function renderKpis(state) {
  const violations = (state.complianceViolations || []).filter((v) => v.status === 'Open' || v.status === 'Under_Review');
  const critical = violations.filter((v) => v.severity === 'Critical' || v.severity === 'High').length;
  const rules = (state.complianceRules || []).filter((r) => r.isActive !== false).length;
  const pendingEv = (state.evidence || []).filter((e) => e.status === 'Pending' || e.status === 'Under_Review').length;
  const score = Math.max(0, Math.min(100, 100 - violations.length * 3));

  document.getElementById('compliance-kpis').innerHTML = `
    <div class="exec-kpi"><div class="exec-kpi-label">Health Score</div><div class="exec-kpi-value" style="color:${score >= 80 ? '#16a34a' : '#dc2626'}">${score}</div><div class="exec-kpi-sub">Out of 100</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Open Violations</div><div class="exec-kpi-value" style="color:#dc2626">${violations.length}</div><div class="exec-kpi-sub">${critical} high/critical</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Active Rules</div><div class="exec-kpi-value">${rules}</div><div class="exec-kpi-sub">Enforced policies</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Pending Evidence</div><div class="exec-kpi-value" style="color:#d97706">${pendingEv}</div><div class="exec-kpi-sub">Awaiting review</div></div>
  `;
}

function getFilteredViolations(state) {
  const query = (document.getElementById('violation-search')?.value || '').toLowerCase();
  const severity = document.getElementById('severity-filter')?.value || '';
  return (state.complianceViolations || [])
    .filter((v) => v.status === 'Open' || v.status === 'Under_Review')
    .filter((v) => {
      const rule = (state.complianceRules || []).find((r) => String(r.id || r.ruleId) === String(v.ruleId));
      const ruleName = (rule?.name || rule?.ruleName || '').toLowerCase();
      const branch = resolveBranch(v, state).toLowerCase();
      const matchQ = !query || ruleName.includes(query) || branch.includes(query) || String(v.entityId).includes(query);
      const matchS = !severity || v.severity === severity;
      return matchQ && matchS;
    });
}

function renderViolations() {
  const state = window._execComplianceState;
  if (!state) return;
  const filtered = getFilteredViolations(state);
  const tbody = document.getElementById('violations-table-body');

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--exec-muted);">No open violations. Company is compliant.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((v) => {
    const rule = (state.complianceRules || []).find((r) => String(r.id || r.ruleId) === String(v.ruleId)) || {};
    const sevClass = v.severity === 'Critical' ? 'red' : v.severity === 'High' ? 'yellow' : 'gray';
    return `<tr>
      <td style="font-weight:600;">${rule.name || rule.ruleName || 'Rule'}</td>
      <td><span class="exec-branch-tag"><i class="ri-map-pin-line"></i> ${resolveBranch(v, state)}</span></td>
      <td>${v.entityType} #${String(v.entityId).substring(0, 8)}</td>
      <td><span class="exec-pill ${sevClass}">${v.severity}</span></td>
      <td><span class="exec-pill blue">${v.status}</span></td>
      <td>${ExecutiveShell.fmtDate(v.detectedAt)}</td>
    </tr>`;
  }).join('');
}

function renderBranchHealth(state) {
  const branches = state.branches || [];
  const violations = (state.complianceViolations || []).filter((v) => v.status === 'Open');
  const labels = branches.map((b) => b.name);
  const counts = branches.map((b) => {
    return violations.filter((v) => resolveBranch(v, state) === b.name).length;
  });

  const canvas = document.getElementById('branchHealthChart');
  if (!canvas) return;
  if (healthChart) healthChart.destroy();
  healthChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No branches'],
      datasets: [{ label: 'Open Violations', data: counts.length ? counts : [0], backgroundColor: '#ef4444' }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });
}

function renderEvidenceSummary(state) {
  const pending = (state.evidence || []).filter((e) => e.status === 'Pending' || e.status === 'Under_Review');
  const el = document.getElementById('evidence-summary');
  if (!pending.length) {
    el.innerHTML = '<div style="color:#16a34a;font-weight:600;"><i class="ri-checkbox-circle-line"></i> Evidence queue is clear</div>';
    return;
  }
  el.innerHTML = pending.slice(0, 5).map((e) =>
    `<div style="padding:10px 0;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;">
      <span>${e.title || 'Evidence'}</span>
      <span class="exec-pill yellow">${e.status}</span>
    </div>`,
  ).join('') + (pending.length > 5 ? `<div style="margin-top:8px;font-size:12px;">+${pending.length - 5} more pending</div>` : '');
}
