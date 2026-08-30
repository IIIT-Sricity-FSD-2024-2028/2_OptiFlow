function renderProgress(used, limit, barId, labelId) {
  const bar = document.getElementById(barId);
  const label = document.getElementById(labelId);
  const limitText = limit == null ? '∞' : String(limit);
  label.textContent = `${used} / ${limitText}`;

  if (!bar) return;
  if (limit == null || limit === 0) {
    bar.style.width = '8%';
    bar.className = 'ac-progress-fill';
    return;
  }

  const pct = Math.min(100, Math.round((used / limit) * 100));
  bar.style.width = `${pct}%`;
  bar.className = 'ac-progress-fill';
  if (pct >= 90) bar.classList.add('danger');
  else if (pct >= 75) bar.classList.add('warn');
}

document.addEventListener('DOMContentLoaded', async () => {
  const session = await AdminConsoleShell.init({
    activeNav: 'dashboard',
    pageTitle: 'Overview',
    subtitle: 'Real-time usage against your subscription plan',
  });
  if (!session) return;

  try {
    const raw = await window.Helpers.api.request('/governance/billing', 'GET');
    const data = raw?.data ?? raw;
    const usage = data.usage || {};

    renderProgress(
      usage.branches?.used ?? 0,
      usage.branches?.limit,
      'branchesBar',
      'branchesLabel',
    );
    renderProgress(
      usage.users?.used ?? 0,
      usage.users?.limit,
      'usersBar',
      'usersLabel',
    );

    document.getElementById('planName').textContent = data.plan?.name || '—';
    document.getElementById('billingCycle').textContent =
      data.subscription?.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly';
    document.getElementById('planStatus').textContent =
      data.subscription?.status || '—';
  } catch (e) {
    const err = document.getElementById('dashboard-error');
    if (err) {
      err.textContent = e.message || 'Failed to load usage data.';
      err.style.display = 'block';
    }
  }
});
