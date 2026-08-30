document.addEventListener('DOMContentLoaded', async () => {
  await ExecutiveShell.init({
    activeNav: 'reports',
    pageTitle: 'Executive Reports',
    subtitle: 'Board-ready summaries across your organization',
  });

  await loadData();
  ExecutiveShell.onBranchChange(loadData);
});

async function loadData() {
  window.Helpers._stateCache = null;
  const state = await window.Helpers.getState(true);
  document.getElementById('context-banner').textContent = `Report scope: ${ExecutiveShell.getBranchLabel()}`;

  const projects = state.projects || [];
  const tasks = state.tasks || [];
  const violations = (state.complianceViolations || []).filter((v) => v.status === 'Open');
  const branches = state.branches || [];
  const users = state.users || [];

  document.getElementById('report-kpis').innerHTML = `
    <div class="exec-kpi"><div class="exec-kpi-label">Employees</div><div class="exec-kpi-value">${users.length}</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Branches</div><div class="exec-kpi-value">${branches.length}</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Active Projects</div><div class="exec-kpi-value">${projects.filter((p) => p.status === 'Active').length}</div></div>
    <div class="exec-kpi"><div class="exec-kpi-label">Open Violations</div><div class="exec-kpi-value" style="color:#dc2626">${violations.length}</div></div>
  `;

  const tbody = document.getElementById('branch-summary-body');
  if (!branches.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--exec-muted);">No branch data available.</td></tr>';
  } else {
    tbody.innerHTML = branches.map((b) => {
      const bProjects = projects.filter((p) => p.branchName === b.name);
      const bProjectIds = bProjects.map((p) => String(p.id || p.projectId));
      const bTasks = tasks.filter((t) => bProjectIds.includes(String(t.projectId)) && t.status !== 'Completed');
      const bViolations = violations.filter((v) => {
        if (v.entityType === 'Project') return bProjectIds.includes(String(v.entityId));
        if (v.entityType === 'Task') {
          const t = tasks.find((x) => String(x.id || x.taskId) === String(v.entityId));
          return t && bProjectIds.includes(String(t.projectId));
        }
        return false;
      });
      const health = Math.max(0, 100 - bViolations.length * 10);
      const healthClass = health >= 80 ? 'green' : health >= 60 ? 'yellow' : 'red';

      return `<tr>
        <td><span class="exec-branch-tag"><i class="ri-map-pin-line"></i> ${b.name}</span></td>
        <td>${bProjects.length}</td>
        <td>${bTasks.length}</td>
        <td>${bViolations.length}</td>
        <td><span class="exec-pill ${healthClass}">${health}%</span></td>
      </tr>`;
    }).join('');
  }

  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const completionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const atRisk = projects.filter((p) => p.status === 'On_Hold').length;

  document.getElementById('exec-snapshot').innerHTML = `
    <p><strong>Organizational Pulse</strong> — Your company operates across <strong>${branches.length} branch${branches.length !== 1 ? 'es' : ''}</strong> with <strong>${projects.length} total projects</strong> and <strong>${tasks.length} tracked tasks</strong>.</p>
    <p>Task completion rate stands at <strong>${completionRate}%</strong>. <strong>${atRisk} project${atRisk !== 1 ? 's are' : ' is'}</strong> currently flagged at risk.</p>
    <p>Compliance posture: <strong>${violations.length} open violation${violations.length !== 1 ? 's' : ''}</strong> require executive attention. Use the branch filter to drill into specific locations.</p>
    <p style="font-size:12px;color:var(--exec-muted);margin-top:16px;">Generated ${new Date().toLocaleString()} · Read-only executive view</p>
  `;
}
