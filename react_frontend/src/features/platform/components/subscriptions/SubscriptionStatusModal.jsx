import { useState, useEffect } from 'react';
import { X, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

const ALLOWED_TRANSITIONS = {
  Trialing: ['Active', 'Cancelled'],
  Active: ['PastDue', 'Cancelled'],
  PastDue: ['Active', 'Cancelled'],
  Cancelled: [],
};

export function SubscriptionStatusModal({
  isOpen,
  subscription,
  onClose,
  onConfirm,
}) {
  const [targetStatus, setTargetStatus] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen && subscription) {
      const allowed = ALLOWED_TRANSITIONS[subscription.status] || [];
      setTargetStatus(allowed[0] || '');
      setReason('');
      setFormError(null);
    }
  }, [isOpen, subscription]);

  if (!isOpen || !subscription) return null;

  const currentStatus = subscription.status;
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  const isTerminal = allowedNext.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!targetStatus) {
      setFormError('Please select a valid target status.');
      return;
    }
    if (!reason.trim()) {
      setFormError('A reason is mandatory for subscription status changes.');
      return;
    }
    if (reason.trim().length < 5) {
      setFormError('Reason must be at least 5 characters long for audit logging.');
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm({ status: targetStatus, reason: reason.trim() });
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Transition Subscription Status
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

        {isTerminal ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">Cancelled Status is Terminal</p>
            <p>This subscription has been permanently cancelled and cannot transition to other states. To restore access, assign a new subscription to the tenant.</p>
            <button type="button" onClick={onClose} className="w-full mt-3 py-2 text-xs font-semibold bg-slate-200 rounded-lg">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-400 font-medium">Current Status</span>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{currentStatus}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-slate-400 font-medium">Allowed Targets</span>
                <div className="font-bold text-blue-600 text-sm mt-0.5">{allowedNext.join(', ')}</div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Next Legal Status</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                {allowedNext.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for Status Change <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain why this subscription is transitioning (e.g. Non-payment, dispute, customer request)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Confirm Transition'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
