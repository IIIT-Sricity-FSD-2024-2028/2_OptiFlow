import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * SlideOverDrawer
 * ───────────────
 * Off-canvas panel that slides in from the right edge.
 * Uses React Portal, CSS slide-in/out transitions, backdrop dismiss,
 * ESC key handler, and body scroll lock.
 *
 * @param {boolean}   isOpen    - Controls visibility
 * @param {Function}  onClose   - Called when dismissed
 * @param {string}    [title]   - Drawer header title
 * @param {string}    [width]   - Drawer width (default: '480px')
 * @param {ReactNode} children  - Drawer body content
 * @param {ReactNode} [footer]  - Optional footer
 */
export default function SlideOverDrawer({ isOpen, onClose, title, children, footer, width = '480px' }) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
      document.body.style.overflow = 'hidden';
    } else {
      setAnimating(false);
      document.body.style.overflow = '';
      const t = setTimeout(() => setMounted(false), 350);
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

  if (!mounted) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-drawer)', display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(3px)',
          opacity: animating ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'relative',
          width, maxWidth: '100vw',
          height: '100%',
          background: 'white',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          transform: animating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {title && <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 6,
              color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: 'auto',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
            flexShrink: 0,
            background: 'var(--surface-2)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
