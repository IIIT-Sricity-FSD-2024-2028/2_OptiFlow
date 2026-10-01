import { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import StatusBadge from '../ui/StatusBadge';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ─── JSON Diff Renderer ───────────────────────────────────────────────────────
function JsonDiff({ before, after }) {
  const [open, setOpen] = useState(false);
  if (!before && !after) return null;

  const allKeys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--text-muted)', padding: 0, fontWeight: 500,
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {open ? 'Hide' : 'Show'} field changes
      </button>
      {open && (
        <div style={{
          marginTop: 6, borderRadius: 6, overflow: 'hidden',
          border: '1px solid var(--border-color)', fontSize: 12, fontFamily: 'monospace',
        }}>
          {allKeys.map(key => {
            const b = before?.[key];
            const a = after?.[key];
            const changed = JSON.stringify(b) !== JSON.stringify(a);
            if (!changed) return null;
            return (
              <div key={key}>
                {b != null && (
                  <div style={{ padding: '4px 10px', background: '#fef2f2', color: '#991b1b', borderBottom: '1px solid #fecaca' }}>
                    − {key}: {JSON.stringify(b)}
                  </div>
                )}
                {a != null && (
                  <div style={{ padding: '4px 10px', background: '#f0fdf4', color: '#166534' }}>
                    + {key}: {JSON.stringify(a)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Event Tag ────────────────────────────────────────────────────────────────
const EVENT_TAG_COLORS = {
  TASK_STATUS_CHANGED:     { bg: '#eff6ff', color: '#1d4ed8' },
  EVIDENCE_SUBMITTED:      { bg: '#f0fdf4', color: '#15803d' },
  COMMENT_ADDED:           { bg: '#f5f3ff', color: '#6d28d9' },
  VIOLATION_CREATED:       { bg: '#fef2f2', color: '#b91c1c' },
  APPROVAL_GRANTED:        { bg: '#f0fdf4', color: '#166534' },
  APPROVAL_REJECTED:       { bg: '#fef2f2', color: '#991b1b' },
  ESCALATED:               { bg: '#fff7ed', color: '#c2410c' },
  CHANGE_REQUEST_CREATED:  { bg: '#fdf4ff', color: '#7e22ce' },
  PROCESS_STARTED:         { bg: '#eff6ff', color: '#1d4ed8' },
  PROCESS_COMPLETED:       { bg: '#f0fdf4', color: '#166534' },
};

function EventTag({ type }) {
  const style = EVENT_TAG_COLORS[type] ?? { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 4,
      fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
      background: style.bg, color: style.color,
    }}>
      {type?.replace(/_/g, ' ') ?? 'EVENT'}
    </span>
  );
}

// ─── AuditTimeline ────────────────────────────────────────────────────────────
/**
 * AuditTimeline
 * ─────────────
 * Chronological audit event stream with timestamps, actor avatars,
 * event tags, and expandable before/after JSON diffs.
 *
 * @param {Array} events - Array of audit event objects:
 *   { id, type, actor: { name, role }, timestamp, description, before?, after?, status? }
 */
export default function AuditTimeline({ events = [] }) {
  if (events.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
        No audit events found.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute', left: 11, top: 8, bottom: 8,
        width: 2, background: 'var(--border-color)',
        borderRadius: 1,
      }} />

      {events.map((event, idx) => (
        <div key={event.id ?? idx} style={{ position: 'relative', marginBottom: 24 }}>
          {/* Dot */}
          <div style={{
            position: 'absolute', left: -22, top: 3,
            width: 10, height: 10, borderRadius: '50%',
            background: 'white', border: '2px solid var(--primary-color)',
            zIndex: 1,
          }} />

          {/* Content */}
          <div style={{
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-xs)',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <Avatar name={event.actor?.name ?? ''} role={event.actor?.role} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                    {event.actor?.name ?? 'System'}
                  </span>
                  <EventTag type={event.type} />
                  {event.status && <StatusBadge status={event.status} size="sm" />}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {event.actor?.role?.replace(/_/g, ' ')} · {formatTimestamp(event.timestamp)}
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.55 }}>
                {event.description}
              </p>
            )}

            {/* JSON Diff */}
            {(event.before || event.after) && (
              <JsonDiff before={event.before} after={event.after} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
