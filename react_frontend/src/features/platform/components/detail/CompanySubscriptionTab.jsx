import { useState } from 'react';
import { CreditCard, Calendar, Sparkles, Plus } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';
import { apiClient } from '../../../../services/api/client';
import { SubscriptionModals } from '../subscriptions/SubscriptionModals';

export function CompanySubscriptionTab({ company, onRefresh }) {
  const subscriptions = company.subscriptions || [];
  const activeSub = subscriptions.find((s) => s.status === 'Active' || s.status === 'Trialing' || s.status === 'PastDue') || subscriptions[0];
  const isClosedCompany = company.status === 'Closed';
  const [activeModal, setActiveModal] = useState(null);

  const handleUpdate = async (payload) => {
    if (!activeSub) return;
    await apiClient(`/api/platform/subscriptions/${activeSub.id}`, { method: 'PATCH', body: payload });
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  const handleCreate = async (payload) => {
    await apiClient('/api/platform/subscriptions', { method: 'POST', body: { ...payload, companyId: company.id } });
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{activeSub?.plan?.name || 'No Active Plan'}</h3>
              {activeSub?.status === 'Trialing' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Free Trial
                </span>
              ) : (
                <Badge status={activeSub?.status === 'Active' ? 'success' : activeSub?.status === 'PastDue' ? 'error' : 'default'}>
                  {activeSub?.status || 'None'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Billing cycle: <span className="font-semibold text-slate-700">{activeSub?.billingCycle || 'Monthly'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeSub ? (
              <div className="flex flex-wrap gap-1.5">
                <button type="button" disabled={isClosedCompany} onClick={() => setActiveModal('plan')} className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40">Change Plan</button>
                <button type="button" disabled={isClosedCompany || activeSub.status === 'Cancelled'} onClick={() => setActiveModal('status')} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-40">Status</button>
                <button type="button" disabled={isClosedCompany} onClick={() => setActiveModal('period')} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-40">Extend</button>
                <button type="button" disabled={isClosedCompany || activeSub.status === 'Cancelled'} onClick={() => setActiveModal('cancel')} className="px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl disabled:opacity-40">Cancel</button>
              </div>
            ) : (
              <button type="button" disabled={isClosedCompany} onClick={() => setActiveModal('assign')} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40">
                <Plus className="w-4 h-4" /> Assign Subscription
              </button>
            )}
          </div>
        </div>

        {activeSub?.plan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="text-slate-500 font-medium">Max Users</div>
              <div className="text-base font-bold text-slate-900 mt-1">{company.userCount ?? 0} / {activeSub.plan.maxUsers ? activeSub.plan.maxUsers.toLocaleString() : 'Unlimited'}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="text-slate-500 font-medium">Max Branches</div>
              <div className="text-base font-bold text-slate-900 mt-1">{company.branchCount ?? 0} / {activeSub.plan.maxBranches ? activeSub.plan.maxBranches.toLocaleString() : 'Unlimited'}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="text-slate-500 font-medium">Compliance Rules</div>
              <div className="text-base font-bold text-slate-900 mt-1">{activeSub.plan.maxComplianceRules ? activeSub.plan.maxComplianceRules.toLocaleString() : 'Unlimited'}</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="text-slate-500 font-medium">Log Retention</div>
              <div className="text-base font-bold text-slate-900 mt-1">{activeSub.plan.auditLogRetentionDays} days</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <h4 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-600" />
          <span>Subscription Records ({subscriptions.length})</span>
        </h4>
        <div className="divide-y divide-slate-100">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">{sub.plan?.name || 'Custom Plan'}</span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="text-slate-500">{sub.billingCycle}</span>
              </div>
              <Badge status={sub.status === 'Active' ? 'success' : sub.status === 'Trialing' ? 'warning' : 'default'}>{sub.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      <SubscriptionModals
        activeModal={activeModal}
        targetSub={{ ...activeSub, company }}
        onClose={() => setActiveModal(null)}
        onUpdate={handleUpdate}
        onCreate={handleCreate}
      />
    </div>
  );
}
