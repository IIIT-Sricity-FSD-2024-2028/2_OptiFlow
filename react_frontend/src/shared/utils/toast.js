// WHY: useToast() only works inside React components. Code that lives outside the component tree
// (an API event handler, and later Redux thunks and listeners) still needs to show a toast, so this
// module gives it the same four calls without a hook:
//
//   import { toast } from '../shared/utils/toast';
//   toast.error('You do not have permission to do that.');
//
// ToastProvider registers itself here while it is mounted. A call made when no provider is mounted
// (before the app renders, or in tests) goes to the console instead of being lost silently.

let handler = null;

export const registerToastHandler = (next) => {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
};

const show = (type, message, duration) => {
  if (handler) return handler.addToast(message, type, duration);
  const log = type === 'error' ? console.error : type === 'warning' ? console.warn : console.log;
  log(`[Toast:${type}]`, message);
  return null;
};

export const toast = {
  success: (message, duration) => show('success', message, duration),
  error: (message, duration) => show('error', message, duration),
  warning: (message, duration) => show('warning', message, duration),
  info: (message, duration) => show('info', message, duration),
};
