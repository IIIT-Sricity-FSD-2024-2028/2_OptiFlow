import { Modal } from './Modal';

export const ConfirmDialog = ({
  isOpen,
  open,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const isActuallyOpen = isOpen !== undefined ? isOpen : open;
  const isDanger = variant === 'danger';

  return (
    <Modal
      isOpen={isActuallyOpen}
      onClose={loading ? undefined : onCancel}
      title={title}
      className="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white transition-colors disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <p className="text-slate-600 text-sm">{message}</p>
    </Modal>
  );
};
