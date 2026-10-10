import React, { createContext, useContext, useState, useCallback } from 'react';

// WHY: Toasts deliver non-blocking feedback (saved changes, validation errors, API alerts).
// A central ToastProvider + useToast hook gives all 9 roles an effortless imperative API:
// toast.success("Saved!"), toast.error("Failed!"), while keeping the UI clean and handcrafted.

const ToastContext = createContext(null);

const ICONS = {
  success: (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const TOAST_STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

// Standalone Toast Card
export const Toast = ({ visible = false,message, type = 'info', onClose, className = '' }) => {
  if (!visible || !message) return null;
  const style = TOAST_STYLES[type] || TOAST_STYLES.info;
  const icon = ICONS[type] || ICONS.info;

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 w-full max-w-sm p-4 rounded-xl border shadow-md transition-all ${style} ${className}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <p className="flex-1 text-sm font-medium leading-snug">
        {message}
      </p>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="flex-shrink-0 p-1 opacity-70 hover:opacity-100 transition-opacity rounded-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  // Convenience methods matching the user spec: toast.success(msg), toast.error(msg)
  const api = {
    addToast,
    removeToast,
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toast viewport overlay fixed at top right */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            type={t.type}
            message={t.message}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom hook to consume toast anywhere in the component tree
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside ToastProvider to avoid crashes
    return {
      success: (msg) => console.log('[Toast:success]', msg),
      error: (msg) => console.error('[Toast:error]', msg),
      warning: (msg) => console.warn('[Toast:warning]', msg),
      info: (msg) => console.info('[Toast:info]', msg),
      addToast: () => {},
      removeToast: () => {},
    };
  }
  return context;
};

export default Toast;
