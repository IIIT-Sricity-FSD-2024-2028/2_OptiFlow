let trendChartInstance = null;
let breakdownChartInstance = null;
let branchChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const session = await ExecutiveShell.init({
    activeNav: 'dashboard',
    pageTitle: 'Executive Overview',
    subtitle: 'Company-wide operational intelligence',
  });
  if (!session) return;

  await loadMetrics(ExecutiveBranchSwitcher.getSelectedBranchId());
  ExecutiveShell.onBranchChange(() => {
    loadMetrics(ExecutiveBranchSwitcher.getSelectedBranchId());
  });
});

async function loadMetrics(branchId = '') {
  const sessionRaw = sessionStorage.getItem('currentUser');
  const session = JSON.parse(sessionRaw);
  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': session.roleLabel || session.role || 'Company Owner',
    'x-user-email': session.email,
    'x-company-id': session.companyId,
    'x-user-id': session.id,
  };

  try {
    const url = branchId
      ? `http://localhost:5500/executive/metrics?branchId=${branchId}`
      : 'http://localhost:5500/executive/metrics';
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Failed to fetch executive metrics');
    const { data } = await res.json();
    const metrics = data || {};

    document.getElementById('dashboard-heading').textContent = branchId
      ? `${ExecutiveShell.getBranchLabel()} Overview`
      : 'Company Overview';

    document.getElementById('valUsers').textContent = metrics.totalUsers ?? 0;
    document.getElementById('valTeams').textContent = `Across ${metrics.totalTeams ?? 0} Teams`;

    const hs = document.getElementById('healthScore');
    hs.textContent = metrics.healthScore ?? '--';
    hs.style.color = metrics.healthScore < 80 ? '#dc2626' : '';

    document.getElementById('valProjects').textContent = metrics.activeProjects ?? 0;
    document.getElementById('valDelayed').textContent = `${metrics.delayedProjectsCount ?? 0} delayed`;

    const escEl = document.getElementById('openEscalations');
    escEl.textContent = metrics.openEscalations?.length ?? 0;
    escEl.style.color = metrics.openEscalations?.length > 0 ? '#dc2626' : '';

    renderCharts(metrics);
    renderTables(metrics);
  } catch (err) {
    console.error(err);
    document.getElementById('healthScore').textContent = 'Err';
  }
}

function renderCharts(metrics) {
  const taskTrend = metrics.taskTrend || {};
  const trendLabels = Object.keys(taskTrend).sort();
  const trendData = trendLabels.map((l) => taskTrend[l]);

  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(document.getElementById('taskTrendChart'), {
    type: 'line',
    data: {
      labels: trendLabels.map((d) => d.substring(5)),
      datasets: [{ label: 'Tasks Completed', data: trendData, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
  });

  const teamBreakdown = metrics.teamBreakdown || [];
  if (breakdownChartInstance) breakdownChartInstance.destroy();
  breakdownChartInstance = new Chart(document.getElementById('teamBreakdownChart'), {
    type: 'bar',
    data: {
      labels: teamBreakdown.map((t) => t.teamName) || ['No Teams'],
      datasets: [
        { label: 'Projects', data: teamBreakdown.map((t) => t.activeProjects), backgroundColor: '#10b981' },
        { label: 'Tasks', data: teamBreakdown.map((t) => t.activeTasks), backgroundColor: '#8b5cf6' },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } },
  });

  const bComp = metrics.branchComparison || [];
  if (branchChartInstance) branchChartInstance.destroy();
  branchChartInstance = new Chart(document.getElementById('branchComparisonChart'), {
    type: 'bar',
    data: {
      labels: bComp.map((b) => b.branchName) || ['No Branches'],
      datasets: [
        { label: 'Active Projects', data: bComp.map((b) => b.activeProjects), backgroundColor: '#2563eb' },
        { label: 'Open Violations', data: bComp.map((b) => b.openViolations), backgroundColor: '#ef4444' },
      ],
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true } } },
  });
}

function renderTables(metrics) {
  const vBody = document.getElementById('violationsTable');
  if (!metrics.highPriorityViolations?.length) {
    vBody.innerHTML = '<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--exec-muted);">No high-priority violations.</td></tr>';
  } else {
    vBody.innerHTML = metrics.highPriorityViolations.map((v) => `<tr>
      <td style="font-weight:500;">${v.entityName}</td>
      <td><span class="exec-pill ${v.severity === 'Critical' ? 'red' : 'yellow'}">${v.severity}</span></td>
      <td>${ExecutiveShell.fmtDate(v.detectedAt)}</td>
    </tr>`).join('');
  }

  const eBody = document.getElementById('escalationsTable');
  if (!metrics.openEscalations?.length) {
    eBody.innerHTML = '<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--exec-muted);">No open escalations.</td></tr>';
  } else {
    eBody.innerHTML = metrics.openEscalations.map((e) => `<tr>
      <td style="font-weight:500;">${e.entityName}</td>
      <td>${e.assignedOwner}</td>
      <td>${ExecutiveShell.fmtDate(e.reportedDate)}</td>
    </tr>`).join('');
  }
}
