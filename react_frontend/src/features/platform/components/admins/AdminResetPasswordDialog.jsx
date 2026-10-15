import { useState, useEffect } from 'react';
import { X, KeyRound, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

export function AdminResetPasswordDialog({ isOpen, admin, onClose, onReset }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setError('');
    setTempPassword('');
    setCopied(false);
  }, [admin, isOpen]);

  if (!isOpen || !admin) return null;

  const handleReset = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await onReset(admin.id);
      if (res?.temporaryPassword) {
        setTempPassword(res.temporaryPassword);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Password reset failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl z-10 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Reset Administrator Password</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {!tempPassword ? (
            <>
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to reset the password for{' '}
                <strong className="text-slate-900">{admin.fullName}</strong> ({admin.email})?
              </p>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1">
                <p className="font-semibold">Security Impact</p>
                <p className="text-[11px] leading-relaxed">
                  Existing sessions for this administrator will be invalidated immediately. A new one-time temporary password will be generated for them.
                </p>
              </div>

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
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="px-4 py-2 font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
                >
                  {submitting ? 'Generating...' : 'Confirm & Reset'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Password Reset Generated</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    This temporary password is only shown once. Provide it securely to the administrator.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Temporary Credentials</label>
                <div className="flex items-center gap-2 p-3 bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl">
                  <span className="flex-1 select-all">{tempPassword}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
