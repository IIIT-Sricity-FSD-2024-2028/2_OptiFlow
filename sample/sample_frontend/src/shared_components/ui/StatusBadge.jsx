import { clsx } from 'clsx';

const STATUS_CONFIG = {
  Draft:      { label: 'Draft',      style: { background: 'var(--status-draft-bg)',     color: 'var(--status-draft-text)' } },
  Active:     { label: 'Active',     style: { background: 'var(--status-active-bg)',    color: 'var(--status-active-text)' } },
  In_Review:  { label: 'In Review',  style: { background: 'var(--status-review-bg)',    color: 'var(--status-review-text)' } },
  Completed:  { label: 'Completed',  style: { background: 'var(--status-completed-bg)', color: 'var(--status-completed-text)' } },
  Blocked:    { label: 'Blocked',    style: { background: 'var(--status-blocked-bg)',   color: 'var(--status-blocked-text)' } },
  Pending:    { label: 'Pending',    style: { background: 'var(--status-review-bg)',    color: 'var(--status-review-text)' } },
  Approved:   { label: 'Approved',   style: { background: 'var(--status-completed-bg)', color: 'var(--status-completed-text)' } },
  Rejected:   { label: 'Rejected',   style: { background: 'var(--status-blocked-bg)',   color: 'var(--status-blocked-text)' } },
  Escalated:  { label: 'Escalated',  style: { background: '#fdf4ff', color: '#7e22ce' } },
  Open:       { label: 'Open',       style: { background: 'var(--status-active-bg)',    color: 'var(--status-active-text)' } },
  Closed:     { label: 'Closed',     style: { background: 'var(--status-draft-bg)',     color: 'var(--status-draft-text)' } },
  Initiated:  { label: 'Initiated',  style: { background: '#f0fdf4', color: '#14532d' } },
};

/**
 * StatusBadge
 * ───────────
 * Color-coded status indicator for tasks, processes, and workflow states.
 *
 * @param {string} status  - One of the STATUS_CONFIG keys (Draft, Active, In_Review, etc.)
 * @param {string} [size]  - 'sm' | 'md' (default)
 */
export default function StatusBadge({ status, size = 'md', className }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    style: { background: '#f1f5f9', color: '#475569' },
  };

  return (
    <span
      className={clsx('status-badge', className)}
      style={{
        ...config.style,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 7px' : '3px 10px',
        borderRadius: '999px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        width: size === 'sm' ? 5 : 6,
        height: size === 'sm' ? 5 : 6,
        borderRadius: '50%',
        backgroundColor: config.style.color,
        flexShrink: 0,
        opacity: 0.8,
      }} />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
