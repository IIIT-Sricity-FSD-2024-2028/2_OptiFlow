import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ─── Focus trap hook ──────────────────────────────────────────────────────────
function useFocusTrap(ref, isOpen) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    el.addEventListener('keydown', handleTab);
    first?.focus();
    return () => el.removeEventListener('keydown', handleTab);
  }, [isOpen, ref]);
}

// ─── Modal Component ──────────────────────────────────────────────────────────
/**
 * Modal
 * ─────
 * Accessible React Portal dialog with focus trapping, ESC dismiss, scale animation,
 * and optional size control.
 *
 * @param {boolean}   isOpen   - Controls visibility
 * @param {Function}  onClose  - Called when dismissed
 * @param {string}    title    - Modal header title
 * @param {string}    [size]   - 'sm' | 'md' (default) | 'lg' | 'xl'
 * @param {boolean}   [hideClose] - Hide X close button
 * @param {ReactNode} children  - Modal body content
 * @param {ReactNode} [footer]  - Custom footer (replaces default close button)
 */
export function Modal({ isOpen, onClose, title, children, footer, size = 'md', hideClose = false }) {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useFocusTrap(containerRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Wait for animation
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!visible) return null;

  const widths = { sm: '380px', md: '520px', lg: '680px', xl: '860px' };

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        animation: isOpen ? 'fadeIn 0.18s ease' : 'none',
        padding: '16px',
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          width: widths[size] ?? widths.md,
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
          animation: isOpen ? 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}>
          <h2 id="modal-title" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            {title}
          </h2>
          {!hideClose && (
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color var(--transition-fast), background var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-main)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── useConfirm hook ──────────────────────────────────────────────────────────
/**
 * useConfirm
 * ──────────
 * Promise-based confirmation dialog.
 * Usage: const confirmed = await confirm({ title: '...', message: '...' });
 */
export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', message: '', resolve: null });

  const confirm = useCallback(({ title, message }) => {
    return new Promise((resolve) => {
      setState({ open: true, title, message, resolve });
    });
  }, []);

  const handleConfirm = () => { state.resolve?.(true);  setState(s => ({ ...s, open: false })); };
  const handleCancel  = () => { state.resolve?.(false); setState(s => ({ ...s, open: false })); };

  const ConfirmDialog = (
    <Modal
      isOpen={state.open}
      onClose={handleCancel}
      title={state.title}
      size="sm"
      footer={
        <>
          <button onClick={handleCancel} style={secondaryBtnStyle}>Cancel</button>
          <button onClick={handleConfirm} id="confirm-dialog-confirm-btn" style={dangerBtnStyle}>Confirm</button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{state.message}</p>
    </Modal>
  );

  return { confirm, ConfirmDialog };
}

const secondaryBtnStyle = {
  padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
  background: 'white', color: 'var(--text-main)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
};
const dangerBtnStyle = {
  padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
  background: '#dc2626', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer',
};

export default Modal;
