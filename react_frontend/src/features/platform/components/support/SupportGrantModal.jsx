import { useState, useEffect } from 'react';
import { X, ShieldCheck, Clock } from 'lucide-react';
import { apiClient } from '../../../../services/api/client';

export function SupportGrantModal({ isOpen, preselectedCompanyId, onClose, onConfirm }) {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setDurationHours(4);
      if (preselectedCompanyId) {
        setCompanyId(preselectedCompanyId);
      } else {
        apiClient('/api/platform/companies?pageSize=100')
          .then((res) => {
            const list = (res?.items || []).filter((c) => c.status !== 'Closed');
            setCompanies(list);
            if (list[0]) setCompanyId(list[0].id);
          })
          .catch((err) => console.error('Failed to load companies:', err));
      }
    }
  }, [isOpen, preselectedCompanyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || reason.trim().length < 10) return;
    try {
      setSubmitting(true);
      await onConfirm({ companyId, reason: reason.trim(), durationHours: Number(durationHours) });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to grant support access');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Grant Support Access
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!preselectedCompanyId && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Tenant</label>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl">
                {companies.map((c) => <option key={c.id} value={c.id}>{c.legalName} ({c.status})</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Duration (max 24h)</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 4, 8, 24].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setDurationHours(h)}
                  className={`py-2 text-xs font-semibold rounded-xl border ${
                    durationHours === h ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Business Reason (min 10 chars) *</label>
            <textarea
              rows={3}
              required
              minLength={10}
              placeholder="Describe the specific troubleshooting purpose..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none"
            />
            <div className="text-right text-[11px] text-slate-400 mt-0.5">{reason.trim().length}/10 min</div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-800 space-y-1">
            <span className="font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Immutable Audit Row</span>
            <p className="text-[11px]">This session activates immediately and will automatically expire in {durationHours} hour(s).</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={submitting || reason.trim().length < 10} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
              {submitting ? 'Granting...' : 'Grant Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
