import { FileX, Inbox } from 'lucide-react';

// ─── Skeleton Shimmer ─────────────────────────────────────────────────────────
const shimmerStyle = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '400px 100%',
  animation: 'shimmer 1.4s infinite linear',
  borderRadius: 6,
};

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ ...shimmerStyle, height: 14, width: i === 0 ? '70%' : i % 2 === 0 ? '55%' : '40%' }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)', padding: 20,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ ...shimmerStyle, width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...shimmerStyle, height: 14, width: '60%' }} />
          <div style={{ ...shimmerStyle, height: 12, width: '40%' }} />
        </div>
      </div>
      <div style={{ ...shimmerStyle, height: 12, width: '90%' }} />
      <div style={{ ...shimmerStyle, height: 12, width: '75%' }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <div style={{ ...shimmerStyle, height: 11, width: i === 0 ? '60%' : '50%' }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
      </tbody>
    </table>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
/**
 * EmptyState
 * ──────────
 * Empty state display with SVG illustration and optional CTA button.
 *
 * @param {string}    [title]       - Primary message (default: 'No results found')
 * @param {string}    [description] - Secondary hint text
 * @param {string}    [variant]     - 'search' | 'empty' (default)
 * @param {ReactNode} [action]      - CTA element to render below description
 */
export function EmptyState({ title = 'No results found', description, variant = 'empty', action }) {
  const Icon = variant === 'search' ? FileX : Inbox;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        color: 'var(--text-placeholder)',
      }}>
        <Icon size={28} strokeWidth={1.5} />
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
        {title}
      </h3>

      {description && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6, marginBottom: action ? 20 : 0 }}>
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
