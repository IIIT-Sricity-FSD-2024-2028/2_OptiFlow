import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import PermissionGate from '../auth/PermissionGate';
import { Modal } from '../ui/Modal';

/**
 * ApprovalActionBar
 * ─────────────────
 * Sticky action toolbar pinned to the viewport bottom of a workflow screen.
 * Dispatches Approve, Reject (with mandatory justification dialog), or Escalate.
 * Wire-gated with <PermissionGate> to completely suppress unauthorized actions.
 *
 * @param {Function}  onApprove     - Called on Approve click
 * @param {Function}  onReject      - Called with { justification } on Reject confirm
 * @param {Function}  [onEscalate]  - Called on Escalate click (optional)
 * @param {string[]}  [approveRoles]  - Roles allowed to approve
 * @param {string[]}  [rejectRoles]   - Roles allowed to reject
 * @param {string[]}  [escalateRoles] - Roles allowed to escalate
 * @param {boolean}   [isLoading]     - Disables buttons during async operations
 * @param {string}    [entityLabel]   - Label for the entity being reviewed (e.g. "this task")
 */
export default function ApprovalActionBar({
  onApprove,
  onReject,
  onEscalate,
  approveRoles = ['Project_Manager', 'Compliance_Officer', 'Team_Leader', 'Branch_Manager', 'Company_Owner', 'SuperUser'],
  rejectRoles  = ['Project_Manager', 'Compliance_Officer', 'Team_Leader', 'Branch_Manager', 'Company_Owner', 'SuperUser'],
  escalateRoles = ['Project_Manager', 'Compliance_Officer', 'SuperUser'],
  isLoading = false,
  entityLabel = 'this item',
}) {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRejectConfirm = async () => {
    if (!justification.trim()) return;
    setSubmitting(true);
    try {
      await onReject?.({ justification: justification.trim() });
      setRejectModalOpen(false);
      setJustification('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Rejection Justification Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => { setRejectModalOpen(false); setJustification(''); }}
        title="Reject — Provide Justification"
        size="md"
        footer={
          <>
            <button
              onClick={() => { setRejectModalOpen(false); setJustification(''); }}
              style={secondaryStyle}
            >
              Cancel
            </button>
            <button
              id="reject-confirm-btn"
              onClick={handleRejectConfirm}
              disabled={!justification.trim() || submitting}
              style={{
                ...dangerStyle,
                opacity: !justification.trim() || submitting ? 0.5 : 1,
                cursor: !justification.trim() || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Rejecting…' : 'Confirm Rejection'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          You are about to reject <strong>{entityLabel}</strong>.
          A mandatory justification is required before this action can be dispatched
          to the submitter's review queue.
        </p>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
          Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          id="rejection-justification-input"
          value={justification}
          onChange={e => setJustification(e.target.value)}
          placeholder="Describe why this is being rejected and what needs to be corrected…"
          rows={4}
          autoFocus
          style={{
            width: '100%', resize: 'vertical',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)', padding: '10px 12px',
            fontSize: 13, fontFamily: 'inherit', outline: 'none',
            color: 'var(--text-main)', lineHeight: 1.55,
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; }}
        />
        {!justification.trim() && (
          <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>Justification is required to reject.</p>
        )}
      </Modal>

      {/* Sticky Action Bar */}
      <div style={{
        position: 'sticky', bottom: 0, left: 0, right: 0,
        background: 'white',
        borderTop: '1px solid var(--border-color)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
        zIndex: 50,
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', flex: 1 }}>
          Review actions for <strong style={{ color: 'var(--text-main)' }}>{entityLabel}</strong>
        </span>

        {/* Escalate */}
        {onEscalate && (
          <PermissionGate roles={escalateRoles}>
            <button
              id="action-escalate-btn"
              onClick={onEscalate}
              disabled={isLoading}
              style={{ ...escalateStyle, opacity: isLoading ? 0.6 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
            >
              <AlertTriangle size={15} />
              Escalate
            </button>
          </PermissionGate>
        )}

        {/* Reject */}
        <PermissionGate roles={rejectRoles}>
          <button
            id="action-reject-btn"
            onClick={() => setRejectModalOpen(true)}
            disabled={isLoading}
            style={{ ...dangerOutlineStyle, opacity: isLoading ? 0.6 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
          >
            <XCircle size={15} />
            Reject
          </button>
        </PermissionGate>

        {/* Approve */}
        <PermissionGate roles={approveRoles}>
          <button
            id="action-approve-btn"
            onClick={onApprove}
            disabled={isLoading}
            style={{ ...approveStyle, opacity: isLoading ? 0.6 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#15803d'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#16a34a'; }}
          >
            <CheckCircle size={15} />
            {isLoading ? 'Approving…' : 'Approve'}
          </button>
        </PermissionGate>
      </div>
    </>
  );
}

// ─── Button styles ────────────────────────────────────────────────────────────
const baseBtn = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 'var(--radius-sm)',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
  transition: 'all var(--transition)',
};
const secondaryStyle = { ...baseBtn, background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)' };
const dangerStyle    = { ...baseBtn, background: '#dc2626', border: 'none', color: 'white' };
const approveStyle   = { ...baseBtn, background: '#16a34a', border: 'none', color: 'white' };
const escalateStyle  = { ...baseBtn, background: 'white', border: '1px solid #fed7aa', color: '#c2410c' };
const dangerOutlineStyle = { ...baseBtn, background: 'white', border: '1px solid #fca5a5', color: '#dc2626' };
