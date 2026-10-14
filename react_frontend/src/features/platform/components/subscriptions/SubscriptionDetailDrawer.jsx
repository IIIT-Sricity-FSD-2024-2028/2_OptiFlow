import { X, Building2, CreditCard, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../../shared/components/Badge';
import { formatRelativePeriod } from '../../utils/relativeDate';
import { SubscriptionAuditHistory } from './SubscriptionAuditHistory';

export function SubscriptionDetailDrawer({ subscription, isOpen, onClose, onRequestAction }) {
  if (!isOpen || !subscription) return null;

  const company = subscription.company || {};
  const plan = subscription.plan || {};
  const counts = company._count || {};
  const rel = formatRelativePeriod(subscription.currentPeriodEnd);
  const isClosed = company.status === 'Closed';

  const usageMetrics = [
    { label: 'Active Users', current: counts.users ?? 0, limit: plan.maxUsers },
    { label: 'Branches', current: counts.branches ?? 0, limit: plan.maxBranches },
    { label: 'Process Templates', current: counts.processTemplates ?? 0, limit: plan.maxActiveProcessTemplates },
    { label: 'Compliance Rules', current: counts.complianceRules ?? 0, limit: plan.maxComplianceRules },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{company.legalName || 'Subscription'}</h2>
              {isClosed && <Badge status="error">Closed</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">ID: {subscription.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Tier</span>
                <div className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <CreditCard className="w-4 h-4 text-blue-600" /> {plan.name || 'Custom Plan'}
                </div>
              </div>
              {subscription.status === 'Trialing' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Trialing
                </span>
              ) : (
                <Badge status={subscription.status === 'Active' ? 'success' : subscription.status === 'PastDue' ? 'error' : 'default'}>
                  {subscription.status}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400">Cycle:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{subscription.billingCycle}</p>
              </div>
              <div>
                <span className="text-slate-400">Period End:</span>
                <p className={`font-semibold mt-0.5 ${rel.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {rel.text} <span className="font-normal text-slate-400">({rel.formattedDate})</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isClosed} onClick={() => onRequestAction('plan', subscription)} className="px-3 py-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40">Change Plan</button>
            <button type="button" disabled={isClosed || subscription.status === 'Cancelled'} onClick={() => onRequestAction('status', subscription)} className="px-3 py-1.5 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-40">Status</button>
            <button type="button" disabled={isClosed} onClick={() => onRequestAction('period', subscription)} className="px-3 py-1.5 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl disabled:opacity-40">Extend End</button>
            <button type="button" disabled={isClosed || subscription.status === 'Cancelled'} onClick={() => onRequestAction('cancel', subscription)} className="px-3 py-1.5 font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl disabled:opacity-40">Cancel</button>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-2.5">Usage vs Plan Limits</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {usageMetrics.map((item) => (
                <div key={item.label} className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                  <span className="text-slate-500 font-medium">{item.label}</span>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {item.current.toLocaleString()} <span className="text-slate-400 font-normal">/ {item.limit !== null ? item.limit.toLocaleString() : '∞'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-2.5">Change History</h4>
            <SubscriptionAuditHistory subscriptionId={subscription.id} />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link to={`/platform/companies/${subscription.companyId}`} className="text-blue-600 hover:underline flex items-center gap-1 font-semibold">
              <Building2 className="w-3.5 h-3.5" /> Company Profile
            </Link>
            <Link to="/platform/plans" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
              View Plans <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
