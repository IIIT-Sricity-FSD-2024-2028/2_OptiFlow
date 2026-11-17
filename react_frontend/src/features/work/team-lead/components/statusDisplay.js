// Status display helpers for the Team Lead dashboard.

export const getBadgeStatus = (status) => {
  if (!status) return 'default';

  const value = String(status).toLowerCase();

  if (value.includes('completed') || value.includes('approved')) return 'success';
  if (value === 'active') return 'active';
  if (value.includes('progress') || value.includes('review')) return 'info';
  if (value.includes('pending') || value.includes('blocked')) return 'warning';
  if (value.includes('rejected') || value.includes('failed')) return 'danger';

  return 'default';
};

export const formatStatus = (status) =>
  String(status || 'Unknown').replace(/_/g, ' ');

/** Extension requests still waiting for a decision. */
export const openExtensionRequests = (requests) =>
  requests.filter((e) => e.status !== 'Resolved' && e.status !== 'Closed');
