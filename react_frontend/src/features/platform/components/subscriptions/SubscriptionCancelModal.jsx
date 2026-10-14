import { useState } from 'react';
import { X, AlertOctagon } from 'lucide-react';

export function SubscriptionCancelModal({
  isOpen,
  subscription,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  if (!isOpen || !subscription) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!reason.trim()) {
      setFormError('A cancellation reason is required.');
      return;
    }
    if (reason.trim().length < 5) {
      setFormError('Cancellation reason must be at least 5 characters.');
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm({ status: 'Cancelled', reason: reason.trim() });
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to cancel subscription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            Cancel Subscription
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            {formError}
          </div>
        )}

        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
          <p className="font-bold">Warning: Terminal Action</p>
          <p>
            Cancelling terminates the active billing cycle for{' '}
            <strong>{subscription.company?.legalName || 'this company'}</strong>. The record will remain intact for audit history. Resuming billing will require assigning a new subscription.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explain why this subscription is being cancelled..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
              Dismiss
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
