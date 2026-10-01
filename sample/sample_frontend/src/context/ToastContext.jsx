import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    // Mark as exiting for slide-out animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timersRef.current[id];
    }, 300);
  }, []);

  const addToast = useCallback(({ message, variant = 'info', duration = 4000, title }) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, variant, duration, title, exiting: false }]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const pauseTimer = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const resumeTimer = useCallback((id, duration = 1500) => {
    timersRef.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = {
    success: (message, opts) => addToast({ message, variant: 'success', ...opts }),
    error: (message, opts) => addToast({ message, variant: 'error', duration: 6000, ...opts }),
    warning: (message, opts) => addToast({ message, variant: 'warning', ...opts }),
    info: (message, opts) => addToast({ message, variant: 'info', ...opts }),
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss, pauseTimer, resumeTimer }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

export function useToastState() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastState must be used within ToastProvider');
  return ctx;
}

export default ToastContext;
