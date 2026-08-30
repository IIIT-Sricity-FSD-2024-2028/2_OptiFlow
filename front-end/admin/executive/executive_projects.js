let branchChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  await ExecutiveShell.init({
    activeNav: 'projects',
    pageTitle: 'Global Projects',
    subtitle: 'Cross-branch project portfolio — read-only executive view',
  });

  await loadData();
  bindFilters();
  ExecutiveShell.onBranchChange(loadData);
});

function bindFilters() {
  document.getElementById('project-search')?.addEventListener('input', renderTable);
  document.getElementById('status-filter')?.addEventListener('change', renderTable);
}

async function loadData() {
  window.Helpers._stateCache = null;
  const state = await window.Helpers.getState(true);
  window._execProjectState = state;
  renderKpis(state);
  renderTable();
  renderBranchChart(state);
  document.getElementById('context-banner').textContent =
    `Viewing: ${ExecutiveShell.getBranchLabel()}`;
}

function getFilteredProjects(state) {
  const query = (document.getElementById('project-search')?.value || '').toLowerCase();
  const status = document.getElementById('status-filter')?.value || '';
  return (state.projects || []).filter((p) => {
    const matchQ = !query || p.name.toLowerCase().includes(query) ||
      (p.branchName || '').toLowerCase().includes(query) ||
      (p.teamName || '').toLowerCase().includes(query);
    const matchS = !status || p.status === status;
    return matchQ && matchS;
  });
}

function renderKpis(state) {
  const projects = state.projects || [];
  const active = projects.filter((p) => p.status === 'Active').length;
  const atRisk = projects.filter((p) => p.status === 'On_Hold').length;
  const branches = new Set(projects.map((p) => p.branchName).filter(Boolean));

  document.getElementById('project-kpis').innerHTML = `
    <div class="exec-kpi"><div class="exec-kpi-label">Total Projects</div><div class="exec-kpi-value">${projects.length}</div><div class="exec-kpi-sub">Company-wide</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Active</div><div class="exec-kpi-value" style="color:#2563eb">${active}</div><div class="exec-kpi-sub">In execution</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">At Risk</div><div class="exec-kpi-value" style="color:#dc2626">${atRisk}</div><div class="exec-kpi-sub">On hold / delayed</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Branches</div><div class="exec-kpi-value">${branches.size}</div><div class="exec-kpi-sub">Geographic coverage</div></div>
  `;
}

function renderTable() {
  const state = window._execProjectState;
  if (!state) return;
  const filtered = getFilteredProjects(state);
  const tbody = document.getElementById('projects-table-body');
  document.getElementById('project-count-label').textContent = `${filtered.length} projects`;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--exec-muted);">No projects match your filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((p) => {
    const projId = p.projectId || p.id;
    const tasks = (state.tasks || []).filter((t) => String(t.projectId) === String(projId));
    const done = tasks.filter((t) => t.status === 'Completed').length;
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    const violations = (state.complianceViolations || []).filter(
      (v) => v.status === 'Open' && v.entityType === 'Task' &&
        tasks.some((t) => String(t.taskId || t.id) === String(v.entityId)),
    ).length;
    const pill = ExecutiveShell.statusPill(p.status);
    const risk = violations > 0 ? `<span class="exec-pill red">${violations} violation${violations > 1 ? 's' : ''}</span>` : '<span class="exec-pill green">Clear</span>';

    return `<tr class="clickable" onclick="window.location.href='executive_tasks.html?project=${projId}'">
      <td style="font-weight:600;">${p.name}</td>
      <td><span class="exec-branch-tag"><i class="ri-map-pin-line"></i> ${p.branchName || '—'}</span></td>
      <td>${p.teamName || '—'}</td>
      <td><span class="exec-pill ${pill}">${p.status}</span></td>
      <td>${progress}%</td>
      <td>${ExecutiveShell.fmtDate(p.endDate)}</td>
      <td>${risk}</td>
    </tr>`;
  }).join('');
}

function renderBranchChart(state) {
  const projects = state.projects || [];
  const byBranch = {};
  projects.forEach((p) => {
    const b = p.branchName || 'Unassigned';
    byBranch[b] = (byBranch[b] || 0) + 1;
  });
  const labels = Object.keys(byBranch);
  const data = Object.values(byBranch);
  const canvas = document.getElementById('branchProjectChart');
  if (!canvas) return;
  if (branchChart) branchChart.destroy();
  branchChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No data'],
      datasets: [{ data: data.length ? data : [0], backgroundColor: ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'] }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
}
