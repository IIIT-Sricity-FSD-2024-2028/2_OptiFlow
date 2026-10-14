import { useState } from 'react';
import { X, UserPlus, AlertTriangle } from 'lucide-react';
import { AdminCredentialsView } from './AdminCredentialsView';

export function AdminCreateModal({ isOpen, onClose, onConfirm, onCreate }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setIsConfirming(false);
    setTemporaryPassword(null);
    onClose();
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    const submitFn = onConfirm || onCreate;
    if (!submitFn) return;
    try {
      setSubmitting(true);
      const res = await submitFn({ fullName: fullName.trim(), email: email.trim().toLowerCase() });
      const tempPass = res?.temporaryPassword || res?.data?.temporaryPassword;
      if (tempPass) setTemporaryPassword(tempPass);
      else handleClose();
    } catch (err) {
      alert(err.message || 'Failed to create platform administrator');
      setIsConfirming(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-800">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold">New Platform Administrator</h2>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {temporaryPassword ? (
          <AdminCredentialsView temporaryPassword={temporaryPassword} onClose={handleClose} />
        ) : isConfirming ? (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Cross-Tenant Access Confirmation
              </p>
              <p className="text-[11px] leading-relaxed">
                This account holds platform-level power and can access system settings across all tenant organizations.
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Administrator Name</span>
                <p className="font-medium text-slate-900">{fullName}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Email Address</span>
                <p className="font-medium text-slate-900">{email.trim().toLowerCase()}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={submitting}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-xs"
              >
                {submitting ? 'Creating...' : 'Confirm & Generate Access'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@platform.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={handleClose} className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs">
                Review & Confirm
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
