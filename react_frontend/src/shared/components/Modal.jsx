import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export const Modal = ({
  isOpen,
  open,
  onClose,
  title,
  children,
  footer,
  className = '',
}) => {
  const isActuallyOpen = isOpen !== undefined ? isOpen : open;

  useEffect(() => {
    if (!isActuallyOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActuallyOpen, onClose]);

  if (!isActuallyOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — pointer-events-auto so clicking it closes the modal */}
      <div
        className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm transition-opacity pointer-events-auto"
        onClick={onClose}
      />
      {/* Modal panel — pointer-events-auto so inputs and buttons work */}
      <div
        className={`relative w-full max-w-[520px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden pointer-events-auto ${className}`}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[60vh] text-slate-700 text-sm">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
