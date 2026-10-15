import { useState, useEffect } from 'react';
import { X, Calendar, PlusCircle } from 'lucide-react';

export function SubscriptionPeriodModal({
  isOpen,
  subscription,
  onClose,
  onConfirm,
}) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen && subscription?.currentPeriodEnd) {
      const current = new Date(subscription.currentPeriodEnd);
      setNewDate(current.toISOString().split('T')[0]);
      setReason('');
      setFormError(null);
    }
  }, [isOpen, subscription]);

  if (!isOpen || !subscription) return null;

  const handleApplyPreset = (days) => {
    const base = new Date(subscription.currentPeriodEnd || Date.now());
    base.setDate(base.getDate() + days);
    setNewDate(base.toISOString().split('T')[0]);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!newDate) {
      setFormError('New period end date is required.');
      return;
    }
    if (!reason.trim()) {
      setFormError('A valid operational reason is required for period adjustments.');
      return;
    }
    if (reason.trim().length < 5) {
      setFormError('Reason must be at least 5 characters long for audit accountability.');
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm({
        currentPeriodEnd: new Date(`${newDate}T23:59:59.999Z`).toISOString(),
        reason: reason.trim(),
      });
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to update period end');
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
            <Calendar className="w-5 h-5 text-indigo-600" />
            Adjust Current Period End
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Quick Presets (Extension)</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '+7 Days', days: 7 },
                { label: '+14 Days', days: 14 },
                { label: '+30 Days', days: 30 },
                { label: '+90 Days', days: 90 },
              ].map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => handleApplyPreset(p.days)}
                  className="py-1.5 px-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              New Period End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reason for Adjustment <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Goodwill extension while onboarding, sales trial elongation..."
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
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Period Extension'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
