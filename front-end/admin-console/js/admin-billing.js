document.addEventListener('DOMContentLoaded', async () => {
  const session = await AdminConsoleShell.init({
    activeNav: 'billing',
    pageTitle: 'Billing',
    subtitle: 'Subscription and plan details',
  });
  if (!session) return;
  await loadBilling();
});

async function loadBilling() {
  const errEl = document.getElementById('billing-error');
  try {
    const raw = await window.Helpers.api.request('/governance/billing', 'GET');
    const data = raw?.data ?? raw;
    const plan = data.plan;
    const sub = data.subscription;
    const usage = data.usage || {};

    document.getElementById('planName').textContent = plan?.name || 'No active plan';
    document.getElementById('billingCycle').textContent =
      sub?.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly';
    document.getElementById('planPrice').textContent = plan
      ? `₹${Number(data.priceInr || 0).toLocaleString('en-IN')}`
      : '—';
    document.getElementById('planStatus').textContent = sub?.status || '—';
    document.getElementById('planRenewal').textContent = sub?.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN')
      : '—';

    const rows = [
      { label: 'Branches', used: usage.branches?.used ?? 0, limit: usage.branches?.limit },
      { label: 'Users', used: usage.users?.used ?? 0, limit: usage.users?.limit },
    ];

    document.getElementById('usageTableBody').innerHTML = rows
      .map(
        (r) => `
      <tr>
        <td>${r.label}</td>
        <td>${r.used}</td>
        <td>${r.limit == null ? 'Unlimited' : r.limit}</td>
      </tr>`,
      )
      .join('');
  } catch (e) {
    if (errEl) {
      errEl.textContent = e.message || 'Failed to load billing.';
      errEl.style.display = 'block';
    }
  }
}
