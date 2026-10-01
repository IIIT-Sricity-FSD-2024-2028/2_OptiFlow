import { useState } from 'react';
import { Modal } from '../../shared_components/ui/Modal';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * ChangeRequestModal
 * ──────────────────
 * Enforces Downward Immutability.
 * Subordinates cannot directly edit baselines (deadlines, budgets, scopes).
 * This modal displays current vs. proposed delta diffs, captures mandatory
 * justifications, and dispatches to superior review queues.
 *
 * @param {boolean}   isOpen      - Controls visibility
 * @param {Function}  onClose     - Called when dismissed
 * @param {Function}  onSubmit    - Called with { changes, justification }
 * @param {object}    current     - Current baseline values { label: value }
 * @param {object}    [proposed]  - Proposed values to prefill (optional)
 * @param {string}    entityName  - Name of the task/project being requested
 * @param {string}    [entityType]- 'task' | 'project' | 'process' (default: 'task')
 */
export default function ChangeRequestModal({
  isOpen,
  onClose,
  onSubmit,
  current = {},
  proposed: initialProposed = {},
  entityName = 'Untitled',
  entityType = 'task',
}) {
  const [proposed, setProposed] = useState(initialProposed);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const fields = Object.keys(current);

  const changedFields = fields.filter(key =>
    proposed[key] != null && String(proposed[key]).trim() !== '' && proposed[key] !== current[key]
  );

  const validate = () => {
    const errs = {};
    if (changedFields.length === 0) errs.changes = 'At least one field must be changed.';
    if (!justification.trim()) errs.justification = 'Justification is required.';
    if (justification.trim().length < 20) errs.justification = 'Please provide a more detailed justification (min. 20 characters).';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await onSubmit?.({
        changes: changedFields.reduce((acc, k) => ({ ...acc, [k]: { from: current[k], to: proposed[k] } }), {}),
        justification: justification.trim(),
      });
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setProposed(initialProposed);
    setJustification('');
    setErrors({});
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Change Request — ${entityName}`}
      size="lg"
      footer={
        <>
          <button onClick={handleClose} style={secondaryStyle}>Cancel</button>
          <button
            id="change-request-submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ ...primaryStyle, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </button>
        </>
      }
    >
      {/* Immutability notice */}
      <div style={{
        display: 'flex', gap: 10,
        background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 20,
      }}>
        <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: '#92400e', lineHeight: 1.55, margin: 0 }}>
          <strong>Downward Immutability Policy:</strong> Baselines cannot be edited directly.
          This change request will be dispatched to your superior's review queue for approval.
        </p>
      </div>

      {/* Delta Diff Table */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>
          Proposed Changes to {entityType.charAt(0).toUpperCase() + entityType.slice(1)}: <em>{entityName}</em>
        </h4>
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Field', 'Current Baseline', '', 'Proposed Value'].map((h, i) => (
                  <th key={i} style={{ padding: '9px 14px', fontSize: 11, fontWeight: 600, textAlign: 'left', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => {
                const changed = proposed[field] != null && proposed[field] !== current[field] && String(proposed[field]).trim() !== '';
                return (
                  <tr key={field} style={{ borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none', background: changed ? '#fefce8' : 'white' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--text-main)', textTransform: 'capitalize' }}>
                      {field.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: changed ? '#dc2626' : 'var(--text-secondary)', textDecoration: changed ? 'line-through' : 'none' }}>
                      {String(current[field] ?? '—')}
                    </td>
                    <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>
                      {changed && <ArrowRight size={13} />}
                    </td>
                    <td style={{ padding: '6px 14px' }}>
                      <input
                        id={`change-request-field-${field}`}
                        value={proposed[field] ?? ''}
                        onChange={e => {
                          setProposed(prev => ({ ...prev, [field]: e.target.value }));
                          if (errors.changes) setErrors(prev => ({ ...prev, changes: undefined }));
                        }}
                        placeholder={`Propose new ${field.replace(/_/g, ' ')}…`}
                        style={{
                          width: '100%', padding: '6px 10px',
                          border: `1px solid ${changed ? 'var(--primary-color)' : 'var(--border-color)'}`,
                          borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                          background: changed ? 'var(--primary-light)' : 'white',
                          outline: 'none', color: 'var(--text-main)',
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {errors.changes && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{errors.changes}</p>}
      </div>

      {/* Justification */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
          Business Justification <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          id="change-request-justification"
          value={justification}
          onChange={e => { setJustification(e.target.value); if (errors.justification) setErrors(prev => ({ ...prev, justification: undefined })); }}
          placeholder="Explain why this change is necessary and how it impacts the project timeline, budget, or scope…"
          rows={4}
          style={{
            width: '100%', resize: 'vertical',
            border: `1px solid ${errors.justification ? '#ef4444' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius)', padding: '10px 12px',
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
            color: 'var(--text-main)', lineHeight: 1.55,
          }}
        />
        {errors.justification && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{errors.justification}</p>}
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {justification.length} characters · Minimum 20 required.
        </p>
      </div>
    </Modal>
  );
}

const baseBtn = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none' };
const secondaryStyle = { ...baseBtn, background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' };
const primaryStyle   = { ...baseBtn, background: 'var(--primary-color)', color: 'white' };
