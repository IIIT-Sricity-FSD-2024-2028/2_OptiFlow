import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastState } from '../../context/ToastContext';

const TOAST_ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const TOAST_STYLES = {
  success: { bg: 'var(--toast-success-bg)', border: 'var(--toast-success-border)', color: 'var(--toast-success)', iconColor: '#22c55e' },
  error:   { bg: 'var(--toast-error-bg)',   border: 'var(--toast-error-border)',   color: 'var(--toast-error)',   iconColor: '#ef4444' },
  warning: { bg: 'var(--toast-warning-bg)', border: 'var(--toast-warning-border)', color: 'var(--toast-warning)', iconColor: '#f59e0b' },
  info:    { bg: 'var(--toast-info-bg)',    border: 'var(--toast-info-border)',    color: 'var(--toast-info)',    iconColor: '#3b82f6' },
};

function ToastItem({ toast, onDismiss, onMouseEnter, onMouseLeave }) {
  const style = TOAST_STYLES[toast.variant] ?? TOAST_STYLES.info;
  const Icon = TOAST_ICONS[toast.variant] ?? Info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px',
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: 300, maxWidth: 400,
        animation: toast.exiting ? 'toastOut 0.3s ease forwards' : 'toastIn 0.35s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: 'all',
      }}
    >
      <Icon size={18} style={{ color: style.iconColor, flexShrink: 0, marginTop: 1 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <p style={{ fontSize: 13, fontWeight: 600, color: style.color, marginBottom: 2 }}>{toast.title}</p>
        )}
        <p style={{ fontSize: 13, color: style.color, lineHeight: 1.5, margin: 0 }}>{toast.message}</p>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: style.color, opacity: 0.6, padding: 2,
          display: 'flex', alignItems: 'center', flexShrink: 0,
          borderRadius: 'var(--radius-sm)',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * ToastProvider
 * ─────────────
 * Renders the toast viewport (fixed top-right portal).
 * Wrap your app with <ToastProvider> from context/ToastContext.jsx.
 * The toast notification UI is rendered here via Portal.
 */
export default function ToastViewport() {
  const { toasts, dismiss, pauseTimer, resumeTimer } = useToastState();

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        top: 20, right: 20,
        display: 'flex', flexDirection: 'column', gap: 10,
        zIndex: 'var(--z-toast)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => dismiss(t.id)}
          onMouseEnter={() => pauseTimer(t.id)}
          onMouseLeave={() => resumeTimer(t.id, 1500)}
        />
      ))}
    </div>,
    document.body
  );
}
