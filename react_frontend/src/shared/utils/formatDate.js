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

/**
 * Formats audit log timestamps:
 * If the event occurred on the same calendar day (today), displays relative time:
 * "just now", "1 min ago", "15 mins ago", "1 hr ago", "6 hrs ago".
 * If on a previous day, displays formatted date "Oct 14, 2026".
 */
export const formatAuditTimestamp = (dateValue) => {
  if (!dateValue) {
    return { primary: '—', secondary: '—', full: '—', isSameDay: false, date: '—', time: '—' };
  }

  const d = new Date(dateValue);
  if (isNaN(d.getTime())) {
    return { primary: '—', secondary: '—', full: '—', isSameDay: false, date: '—', time: '—' };
  }

  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isSameDay) {
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    let relative = '';

    if (diffSec < 45) {
      relative = 'just now';
    } else {
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        relative = `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
      } else {
        const diffHours = Math.floor(diffMin / 60);
        relative = `${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
      }
    }

    return {
      primary: relative,
      secondary: timeStr,
      full: `${relative} (${timeStr})`,
      date: dateStr,
      time: timeStr,
      isSameDay: true,
    };
  }

  return {
    primary: dateStr,
    secondary: timeStr,
    full: `${dateStr} at ${timeStr}`,
    date: dateStr,
    time: timeStr,
    isSameDay: false,
  };
};
