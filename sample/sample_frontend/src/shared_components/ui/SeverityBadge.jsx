import { AlertTriangle, ArrowUp, Minus, Zap } from 'lucide-react';
import { clsx } from 'clsx';

const SEVERITY_CONFIG = {
  Low:      { label: 'Low',      icon: Minus,         style: { background: 'var(--severity-low-bg)',      color: 'var(--severity-low-text)' } },
  Medium:   { label: 'Medium',   icon: ArrowUp,        style: { background: 'var(--severity-medium-bg)',   color: 'var(--severity-medium-text)' } },
  High:     { label: 'High',     icon: AlertTriangle,  style: { background: 'var(--severity-high-bg)',     color: 'var(--severity-high-text)' } },
  Critical: { label: 'Critical', icon: Zap,            style: { background: 'var(--severity-critical-bg)', color: 'var(--severity-critical-text)', fontWeight: 700 } },
};

/**
 * SeverityBadge
 * ─────────────
 * Risk severity indicator for compliance violations, tasks, and issues.
 *
 * @param {string} severity - 'Low' | 'Medium' | 'High' | 'Critical'
 * @param {string} [size]   - 'sm' | 'md' (default)
 */
export default function SeverityBadge({ severity, size = 'md', className }) {
  const config = SEVERITY_CONFIG[severity] ?? {
    label: severity ?? 'Unknown',
    icon: Minus,
    style: { background: '#f1f5f9', color: '#475569' },
  };

  const Icon = config.icon;
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <span
      className={clsx('severity-badge', className)}
      style={{
        ...config.style,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '2px 7px' : '3px 10px',
        borderRadius: '999px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: config.style.fontWeight ?? 500,
        whiteSpace: 'nowrap',
        border: severity === 'Critical' ? '1.5px solid rgba(127,29,29,0.2)' : 'none',
      }}
    >
      <Icon size={iconSize} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}

export { SEVERITY_CONFIG };
