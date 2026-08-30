document.addEventListener('DOMContentLoaded', async () => {
  const projectFilter = new URLSearchParams(window.location.search).get('project');

  await ExecutiveShell.init({
    activeNav: 'tasks',
    pageTitle: 'Global Tasks',
    subtitle: projectFilter ? 'Filtered by selected project' : 'All tasks across branches and teams',
  });

  window._execProjectFilter = projectFilter;
  await loadData();
  bindFilters();
  ExecutiveShell.onBranchChange(loadData);
});

function bindFilters() {
  ['task-search', 'task-status-filter', 'task-priority-filter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', renderTable);
    document.getElementById(id)?.addEventListener('change', renderTable);
  });
}

async function loadData() {
  window.Helpers._stateCache = null;
  const state = await window.Helpers.getState(true);
  window._execTaskState = state;
  renderKpis(state);
  renderTable();
  document.getElementById('context-banner').textContent =
    `Viewing: ${ExecutiveShell.getBranchLabel()}${window._execProjectFilter ? ' · Project filter active' : ''}`;
}

function getFilteredTasks(state) {
  const query = (document.getElementById('task-search')?.value || '').toLowerCase();
  const status = document.getElementById('task-status-filter')?.value || '';
  const priority = document.getElementById('task-priority-filter')?.value || '';

  return (state.tasks || []).filter((t) => {
    if (window._execProjectFilter && String(t.projectId) !== String(window._execProjectFilter)) return false;
    const matchQ = !query ||
      t.title.toLowerCase().includes(query) ||
      (t.projectName || '').toLowerCase().includes(query) ||
      (t.branchName || '').toLowerCase().includes(query) ||
      (t.assigneeName || '').toLowerCase().includes(query);
    const matchS = !status || t.status === status;
    const matchP = !priority || t.priority === priority;
    return matchQ && matchS && matchP;
  });
}

function renderKpis(state) {
  let tasks = state.tasks || [];
  if (window._execProjectFilter) {
    tasks = tasks.filter((t) => String(t.projectId) === String(window._execProjectFilter));
  }
  const inProg = tasks.filter((t) => t.status === 'In_Progress').length;
  const overdue = tasks.filter((t) => t.overdue && t.status !== 'Completed').length;
  const completed = tasks.filter((t) => t.status === 'Completed').length;

  document.getElementById('task-kpis').innerHTML = `
    <div class="exec-kpi"><div class="exec-kpi-label">Total Tasks</div><div class="exec-kpi-value">${tasks.length}</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">In Progress</div><div class="exec-kpi-value" style="color:#2563eb">${inProg}</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Overdue</div><div class="exec-kpi-value" style="color:#dc2626">${overdue}</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Completed</div><div class="exec-kpi-value" style="color:#16a34a">${completed}</div></div>
  `;
}

function renderTable() {
  const state = window._execTaskState;
  if (!state) return;
  const filtered = getFilteredTasks(state);
  const tbody = document.getElementById('tasks-table-body');
  document.getElementById('task-count-label').textContent = `${filtered.length} tasks`;

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--exec-muted);">No tasks found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((t) => {
    const pill = ExecutiveShell.statusPill(t.status);
    const pri = String(t.priority || 'Medium').toLowerCase();
    const priClass = pri === 'critical' || pri === 'high' ? 'red' : pri === 'medium' ? 'yellow' : 'gray';
    const due = t.overdue && t.status !== 'Completed'
      ? `<span style="color:#dc2626;font-weight:600;">${ExecutiveShell.fmtDate(t.dueDate)}</span>`
      : ExecutiveShell.fmtDate(t.dueDate);

    return `<tr>
      <td style="font-weight:600;">${t.title}</td>
      <td><span class="exec-branch-tag"><i class="ri-map-pin-line"></i> ${t.branchName || '—'}</span></td>
      <td>${t.projectName || '—'}</td>
      <td>${t.assigneeName || 'Unassigned'}</td>
      <td><span class="exec-pill ${priClass}">${t.priority || 'Medium'}</span></td>
      <td><span class="exec-pill ${pill}">${t.status}</span></td>
      <td>${due}</td>
    </tr>`;
  }).join('');
}
