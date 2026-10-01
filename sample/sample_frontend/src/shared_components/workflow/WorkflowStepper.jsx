import { Check, Clock, AlertCircle, X, RotateCcw } from 'lucide-react';

const STAGE_STATUS = {
  completed:  { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', Icon: Check },
  active:     { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', Icon: Clock },
  rejected:   { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', Icon: X },
  pending:    { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', Icon: Clock },
};

/**
 * WorkflowStepper
 * ───────────────
 * Multi-stage pipeline tracker (Initiated → In Review → Compliance Checked → Approved).
 * Renders stage status badges, conditional branching flags, and backward rejection loopbacks.
 *
 * @param {Array}  stages - Array of stage objects:
 *   { id, label, status: 'completed'|'active'|'rejected'|'pending', assignee?, note? }
 * @param {string} [orientation] - 'horizontal' | 'vertical' (default)
 */
export default function WorkflowStepper({ stages = [], orientation = 'vertical' }) {
  const isHoriz = orientation === 'horizontal';

  if (isHoriz) {
    return <HorizontalStepper stages={stages} />;
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      {/* Vertical connector line */}
      <div style={{
        position: 'absolute', left: 15, top: 16, bottom: 16,
        width: 2, background: 'var(--border-color)', borderRadius: 1,
        zIndex: 0,
      }} />

      {stages.map((stage, idx) => {
        const cfg = STAGE_STATUS[stage.status] ?? STAGE_STATUS.pending;
        const Icon = cfg.Icon;
        const isRejected = stage.status === 'rejected';
        const showLoopback = isRejected && idx > 0;

        return (
          <div key={stage.id ?? idx} style={{ position: 'relative', marginBottom: 20, zIndex: 1 }}>
            {/* Loopback arrow for rejections */}
            {showLoopback && (
              <div style={{
                position: 'absolute', left: -26, top: -10,
                fontSize: 11, color: '#ef4444',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <RotateCcw size={12} /> <span style={{ fontWeight: 500 }}>Loopback</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Stage dot */}
              <div style={{
                width: 30, height: 30,
                borderRadius: '50%',
                background: cfg.bg, border: `2px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, position: 'absolute', left: -32, top: -2,
                zIndex: 2,
              }}>
                <Icon size={13} style={{ color: cfg.color }} strokeWidth={2.5} />
              </div>

              {/* Content */}
              <div style={{
                flex: 1, background: 'white',
                border: `1px solid ${cfg.border}`,
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                boxShadow: 'var(--shadow-xs)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{stage.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px',
                    borderRadius: 999, background: cfg.bg, color: cfg.color,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {stage.status}
                  </span>
                  {stage.conditional && (
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      background: '#fdf4ff', color: '#7e22ce', fontWeight: 600,
                    }}>
                      CONDITIONAL
                    </span>
                  )}
                </div>
                {stage.assignee && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    Assigned to: <strong>{stage.assignee}</strong>
                  </div>
                )}
                {stage.note && (
                  <div style={{
                    marginTop: 6, fontSize: 12, color: isRejected ? '#991b1b' : 'var(--text-muted)',
                    background: isRejected ? '#fef2f2' : 'var(--surface-2)',
                    padding: '4px 8px', borderRadius: 4,
                  }}>
                    {isRejected && <AlertCircle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
                    {stage.note}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalStepper({ stages }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
      {stages.map((stage, idx) => {
        const cfg = STAGE_STATUS[stage.status] ?? STAGE_STATUS.pending;
        const Icon = cfg.Icon;

        return (
          <div key={stage.id ?? idx} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: cfg.bg, border: `2px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={13} style={{ color: cfg.color }} strokeWidth={2.5} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
                {stage.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div style={{ height: 2, flex: 1, background: 'var(--border-color)', margin: '0 4px', marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
