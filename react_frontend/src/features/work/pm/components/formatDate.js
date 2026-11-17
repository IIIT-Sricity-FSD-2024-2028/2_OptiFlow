// Date display used on PM project pages ("14 Nov 2026", or "—" when empty).
export const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
