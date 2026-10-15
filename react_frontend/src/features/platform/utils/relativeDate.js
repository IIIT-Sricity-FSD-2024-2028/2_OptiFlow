/**
 * Formats a date relative to now in days (e.g. "in 5 days", "3 days overdue")
 */
export function formatRelativePeriod(dateInput) {
  if (!dateInput) return { text: 'N/A', isOverdue: false, daysDiff: 0 };

  const targetDate = new Date(dateInput);
  if (isNaN(targetDate.getTime())) return { text: 'Invalid date', isOverdue: false, daysDiff: 0 };

  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: overdueDays === 0 ? 'Due today' : `${overdueDays}d overdue`,
      isOverdue: true,
      daysDiff: diffDays,
      formattedDate: targetDate.toLocaleDateString(),
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Renews today',
      isOverdue: false,
      daysDiff: 0,
      formattedDate: targetDate.toLocaleDateString(),
    };
  }

  if (diffDays === 1) {
    return {
      text: 'in 1 day',
      isOverdue: false,
      daysDiff: 1,
      formattedDate: targetDate.toLocaleDateString(),
    };
  }

  if (diffDays > 30) {
    const months = Math.round(diffDays / 30);
    return {
      text: `in ${months} mo (${diffDays}d)`,
      isOverdue: false,
      daysDiff: diffDays,
      formattedDate: targetDate.toLocaleDateString(),
    };
  }

  return {
    text: `in ${diffDays} days`,
    isOverdue: false,
    daysDiff: diffDays,
    formattedDate: targetDate.toLocaleDateString(),
  };
}

/**
 * Formats precise expiry relative time for support grants (e.g. "in 3h", "expired 2d ago")
 */
export function formatRelativeExpiry(dateInput) {
  if (!dateInput) return { text: 'N/A', isExpired: false, formattedDate: '' };

  const targetDate = new Date(dateInput);
  if (isNaN(targetDate.getTime())) return { text: 'Invalid date', isExpired: false, formattedDate: '' };

  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0) {
    const absMin = Math.abs(diffMinutes);
    const absHours = Math.abs(diffHours);
    const absDays = Math.abs(diffDays);

    let text = `${absMin}m ago`;
    if (absMin >= 60 && absHours < 24) {
      text = `expired ${absHours}h ago`;
    } else if (absHours >= 24) {
      text = `expired ${absDays}d ago`;
    } else {
      text = `expired ${absMin}m ago`;
    }

    return {
      text,
      isExpired: true,
      formattedDate: targetDate.toLocaleString(),
    };
  }

  let text = `in ${diffMinutes}m`;
  if (diffMinutes >= 60 && diffHours < 24) {
    text = `in ${diffHours}h`;
  } else if (diffHours >= 24) {
    text = `in ${diffDays}d`;
  }

  return {
    text,
    isExpired: false,
    formattedDate: targetDate.toLocaleString(),
  };
}

/**
 * Formats past timestamp (e.g. "2m ago", "1h ago", "3d ago", or date string)
 */
export function formatRelativePast(dateInput) {
  if (!dateInput) return '—';
  const targetDate = new Date(dateInput);
  if (isNaN(targetDate.getTime())) return '—';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return targetDate.toLocaleDateString();
}
