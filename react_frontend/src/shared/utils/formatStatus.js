export const formatStatus = (status) => {
  if (!status || typeof status !== 'string') return '—';

  return status
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getStatusVariant = (status) => {
  if (!status || typeof status !== 'string') return 'default';

  const normalized = status.toLowerCase().replace(/[_-]/g, '');

  if (['completed', 'approved', 'active', 'passed', 'resolved', 'done', 'success'].includes(normalized)) {
    return 'success';
  }
  if (['pending', 'inprogress', 'underreview', 'review', 'inreview', 'draft', 'open', 'warning'].includes(normalized)) {
    return 'warning';
  }
  if (['rejected', 'failed', 'inactive', 'blocked', 'cancelled', 'high', 'critical', 'danger', 'error'].includes(normalized)) {
    return 'danger';
  }
  if (['scheduled', 'info', 'assigned', 'new'].includes(normalized)) {
    return 'info';
  }

  return 'default';
};
