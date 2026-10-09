export const formatDate = (dateValue, options = {}) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date);
};

export const formatDateTime = (dateValue) => {
  return formatDate(dateValue, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
