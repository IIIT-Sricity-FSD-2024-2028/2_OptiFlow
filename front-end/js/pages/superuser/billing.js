function isSystemAdminSession(session) {
  const role = String(session?.role || '').toLowerCase();
  const label = String(session?.roleLabel || session?.assignedRole || '').toLowerCase();
  return role === 'system_admin' || label.includes('system admin');
}

function formatLimit(limit) {
  return limit == null ? 'Unlimited' : String(limit);
}

function formatUsage(used, limit) {
  return `${used} / ${formatLimit(limit)} used`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const sessionRaw = sessionStorage.getItem('currentUser');
  if (!sessionRaw) {
    window.location.href = '../login.html';
    return;
  }

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch {
    window.location.href = '../login.html';
    return;
  }

  if (!isSystemAdminSession(session)) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (window.Sidebar) {
    await window.Sidebar.render('billing');
  }

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
      ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    const rows = [
      {
        label: 'Branches',
        used: usage.branches?.used ?? 0,
        limit: usage.branches?.limit,
      },
      {
        label: 'Users',
        used: usage.users?.used ?? 0,
        limit: usage.users?.limit,
      },
    ];

    const tbody = document.getElementById('usageTableBody');
    tbody.innerHTML = rows
      .map((row) => {
        const pct =
          row.limit && row.limit > 0
            ? Math.min(100, Math.round((row.used / row.limit) * 100))
            : null;
        return `
          <tr>
            <td>${row.label}</td>
            <td>${row.used}</td>
            <td>${formatLimit(row.limit)}</td>
            <td>${pct != null ? `${pct}% (${formatUsage(row.used, row.limit)})` : formatUsage(row.used, row.limit)}</td>
          </tr>
        `;
      })
      .join('');
  } catch (e) {
    if (errEl) {
      errEl.textContent = e.message || 'Failed to load billing information.';
      errEl.style.display = 'block';
    }
  }
}
