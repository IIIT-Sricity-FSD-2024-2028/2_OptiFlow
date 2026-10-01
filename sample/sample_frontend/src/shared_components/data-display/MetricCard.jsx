import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * MetricCard
 * ──────────
 * Standardized KPI card matching legacy .metric-card design.
 * Renders title, bold 32px value, colored pill tag, trend indicator,
 * and optional mini progress bar in a responsive grid.
 *
 * @param {string}  title         - KPI label
 * @param {string|number} value   - Main numeric value
 * @param {string}  [tag]         - Pill tag text (e.g. "↑ 12%")
 * @param {string}  [tagVariant]  - 'default' | 'blue' | 'green' | 'yellow' | 'red'
 * @param {number}  [trend]       - Percentage trend (positive = up, negative = down)
 * @param {number}  [progress]    - 0–100 for progress bar
 * @param {string}  [progressColor] - CSS color for progress bar
 * @param {ReactNode} [icon]      - Optional icon in top-right corner
 * @param {string}  [subtitle]    - Secondary label below value
 */
export default function MetricCard({
  title, value, tag, tagVariant = 'default',
  trend, progress, progressColor = 'var(--primary-color)',
  icon, subtitle,
}) {
  const tagColors = {
    default: { bg: '#f1f5f9', color: '#475569' },
    blue:    { bg: '#e0e7ff', color: '#3730a3' },
    green:   { bg: '#dcfce7', color: '#166534' },
    yellow:  { bg: '#fef9c3', color: '#854d0e' },
    red:     { bg: '#fee2e2', color: '#991b1b' },
  };
  const tagStyle = tagColors[tagVariant] ?? tagColors.default;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#94a3b8';

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      transition: 'box-shadow var(--transition)',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      {/* Icon */}
      {icon && (
        <div style={{
          position: 'absolute', top: 20, right: 20,
          color: 'var(--text-muted)', opacity: 0.5,
        }}>
          {icon}
        </div>
      )}

      {/* Title */}
      <div style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
        fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8,
      }}>
        {title}
      </div>

      {/* Value */}
      <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1, marginBottom: 12 }}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{subtitle}</div>
      )}

      {/* Bottom Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
        {tag && (
          <span style={{
            display: 'inline-block',
            padding: '3px 9px', borderRadius: 999,
            fontSize: 11, fontWeight: 500,
            background: tagStyle.bg, color: tagStyle.color,
          }}>
            {tag}
          </span>
        )}

        {trend != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500, color: trendColor }}>
            <TrendIcon size={13} />
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {progress != null && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 5, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: `${Math.min(100, Math.max(0, progress))}%`,
              background: progressColor,
              transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{progress}% complete</div>
        </div>
      )}
    </div>
  );
}
