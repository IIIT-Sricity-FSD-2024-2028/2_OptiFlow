import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { apiClient } from '../../../../services/api/client';

export function SubscriptionAssignModal({ isOpen, onClose, onConfirm }) {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [cycle, setCycle] = useState('Monthly');
  const [status, setStatus] = useState('Active');
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingData(true);
      setFormError(null);
      Promise.all([
        apiClient('/api/platform/companies?pageSize=100'),
        apiClient('/api/platform/plans'),
      ])
        .then(([companiesRes, plansRes]) => {
          const all = companiesRes?.items || [];
          const eligible = all.filter((c) => {
            if (c.status === 'Closed') return false;
            return !(c.subscriptions || []).some(
              (s) => s.status === 'Active' || s.status === 'Trialing' || s.status === 'PastDue'
            );
          });
          setCompanies(eligible);
          if (eligible[0]) setSelectedCompanyId(eligible[0].id);

          const activePlans = (plansRes || []).filter((p) => p.isActive !== false);
          setPlans(activePlans);
          if (activePlans[0]) setSelectedPlanId(activePlans[0].id);
        })
        .catch((err) => {
          console.error('Failed to load options:', err);
          setFormError('Failed to load eligible companies or plans.');
        })
        .finally(() => setLoadingData(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedCompanyId) {
      setFormError('Please select a target company.');
      return;
    }
    if (!selectedPlanId) {
      setFormError('Please select a subscription plan tier.');
      return;
    }
    try {
      setSubmitting(true);
      await onConfirm({ companyId: selectedCompanyId, planId: selectedPlanId, billingCycle: cycle, status });
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to assign subscription');
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
            <Plus className="w-5 h-5 text-blue-600" /> Assign Subscription
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

        {loadingData ? (
          <div className="py-8 text-center text-slate-400">Loading companies & plans...</div>
        ) : companies.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">No Unsubscribed Tenants Available</p>
            <p>All active companies already have live subscriptions assigned.</p>
            <button type="button" onClick={onClose} className="w-full mt-3 py-2 font-semibold bg-slate-200 rounded-lg">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                {companies.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Plan</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Cycle</label>
                <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="Monthly">Monthly</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="Active">Active</option>
                  <option value="Trialing">Trialing</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                {submitting ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
