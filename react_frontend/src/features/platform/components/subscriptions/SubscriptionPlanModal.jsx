import { useState, useEffect } from 'react';
import { X, AlertTriangle, Layers } from 'lucide-react';
import { apiClient } from '../../../../services/api/client';

export function SubscriptionPlanModal({ isOpen, subscription, onClose, onConfirm }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [cycle, setCycle] = useState('Monthly');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && subscription) {
      setSelectedPlanId(subscription.planId);
      setCycle(subscription.billingCycle || 'Monthly');
      setReason('');
      apiClient('/api/platform/plans')
        .then((res) => setPlans((res || []).filter((p) => p.isActive !== false)))
        .catch((err) => console.error('Failed to load active plans:', err));
    }
  }, [isOpen, subscription]);

  if (!isOpen || !subscription) return null;

  const currentPlan = subscription.plan || {};
  const targetPlan = plans.find((p) => p.id === selectedPlanId) || currentPlan;
  const counts = subscription.company?._count || {};

  const limits = [
    { label: 'Users', usage: counts.users ?? 0, limit: targetPlan.maxUsers },
    { label: 'Branches', usage: counts.branches ?? 0, limit: targetPlan.maxBranches },
    { label: 'Templates', usage: counts.processTemplates ?? 0, limit: targetPlan.maxActiveProcessTemplates },
    { label: 'Compliance', usage: counts.complianceRules ?? 0, limit: targetPlan.maxComplianceRules },
  ];
  const overLimits = limits.filter((l) => l.limit !== null && l.usage > l.limit);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlanId) return;
    try {
      setSubmitting(true);
      await onConfirm({ planId: selectedPlanId, billingCycle: cycle, reason });
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Change Plan & Cycle
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Plan (Active only)</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {['Monthly', 'Annual'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`py-2 text-xs font-semibold rounded-xl border ${
                  cycle === c ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-700">Usage vs New Plan Limits:</span>
            <div className="grid grid-cols-2 gap-2">
              {limits.map((l) => (
                <div key={l.label} className="p-2 bg-white rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-400">{l.label}</span>
                  <div className="font-bold text-slate-800">{l.usage} / {l.limit !== null ? l.limit : '∞'}</div>
                </div>
              ))}
            </div>
            {overLimits.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Downgrade Warning:</strong> Over limit: {overLimits.map((l) => `${l.label} (${l.usage} > ${l.limit})`).join(', ')}.</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason (Audit)</label>
            <input
              type="text"
              placeholder="e.g., Customer requested tier change"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
              {submitting ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
