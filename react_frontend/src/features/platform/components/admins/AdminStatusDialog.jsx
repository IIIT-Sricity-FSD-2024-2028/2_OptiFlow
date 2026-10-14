import { useState, useEffect } from 'react';
import { X, UserX, UserCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

export function AdminStatusDialog({ isOpen, admin, currentAdminId, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReason('');
    setError('');
  }, [admin, isOpen]);

  if (!isOpen || !admin) return null;

  const isDeactivating = admin.isActive;
  const isSelf = admin.id === currentAdminId;

  const handleAction = async (e) => {
    e.preventDefault();
    if (isSelf && isDeactivating) {
      setError('You cannot deactivate your own account.');
      return;
    }
    if (isDeactivating && reason.trim().length < 5) {
      setError('A deactivation reason of at least 5 characters is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onConfirm(admin.id, !isDeactivating, reason.trim());
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDeactivating ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {isDeactivating ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {isDeactivating ? 'Deactivate Administrator' : 'Reactivate Administrator'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAction} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {isSelf && isDeactivating ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Self-Deactivation Blocked</span>
              </div>
              <p>You cannot deactivate your own account from this view. To manage your credentials, visit your Profile.</p>
            </div>
          ) : (
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to {isDeactivating ? 'deactivate' : 'reactivate'}{' '}
              <strong className="text-slate-900">{admin.fullName}</strong> ({admin.email})?
              {isDeactivating && ' Login will be blocked and existing platform sessions will be invalidated immediately.'}
            </p>
          )}

          {isDeactivating && !isSelf && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Deactivation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for revoking platform administrator access..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                required
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (isSelf && isDeactivating)}
              className={`px-4 py-2 font-semibold text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 ${
                isDeactivating ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? 'Updating...' : isDeactivating ? 'Deactivate Account' : 'Reactivate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
