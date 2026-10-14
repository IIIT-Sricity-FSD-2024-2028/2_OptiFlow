import { useState, useEffect } from 'react';
import { X, UserCheck, AlertTriangle } from 'lucide-react';

export function AdminEditModal({ isOpen, admin, onClose, onSave }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (admin) {
      setFullName(admin.fullName || '');
      setEmail(admin.email || '');
      setEmailConfirmed(false);
      setError('');
    }
  }, [admin, isOpen]);

  if (!isOpen || !admin) return null;

  const isEmailChanged = email.trim().toLowerCase() !== (admin.email || '').toLowerCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    if (isEmailChanged && !emailConfirmed) {
      setError('Please acknowledge the security confirmation to change this email.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSave(admin.id, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update admin');
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
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Edit Administrator</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailConfirmed(false);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          {isEmailChanged && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="leading-relaxed">
                  Changing this email changes their login identifier and modifies platform-level audit attribution.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 font-medium text-amber-900">
                <input
                  type="checkbox"
                  checked={emailConfirmed}
                  onChange={(e) => setEmailConfirmed(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                Confirm email address modification
              </label>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
