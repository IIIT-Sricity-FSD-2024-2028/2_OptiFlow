import { CreditCard, Calendar, Sparkles } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';

export function CompanySubscriptionTab({ company }) {
  const subscriptions = company.subscriptions || [];
  const activeSub = subscriptions.find((s) => s.status === 'Active' || s.status === 'Trialing') || subscriptions[0];

  return (
    <div className="space-y-6">
      {/* Active Subscription Summary */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {activeSub?.plan?.name || 'No Active Plan'}
              </h3>
              {activeSub?.status === 'Trialing' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Free Trial
                </span>
              ) : (
                <Badge status={activeSub?.status === 'Active' ? 'success' : 'default'}>
                  {activeSub?.status || 'None'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Billing cycle: <span className="font-semibold text-slate-700">{activeSub?.billingCycle || 'Monthly'}</span>
            </p>
          </div>

          {activeSub?.currentPeriodEnd && (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                Renews on: <strong>{new Date(activeSub.currentPeriodEnd).toLocaleDateString()}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Quotas & Limits Grid */}
        {activeSub?.plan && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tier Entitlements & Quotas</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 font-medium">Max Users</div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {activeSub.plan.maxUsers ? activeSub.plan.maxUsers.toLocaleString() : 'Unlimited'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 font-medium">Max Branches</div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {activeSub.plan.maxBranches ? activeSub.plan.maxBranches.toLocaleString() : 'Unlimited'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 font-medium">Compliance Rules</div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {activeSub.plan.maxComplianceRules ? activeSub.plan.maxComplianceRules.toLocaleString() : 'Unlimited'}
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="text-slate-500 font-medium">Log Retention</div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {activeSub.plan.auditLogRetentionDays} days
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Records History */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <h4 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-600" />
          <span>Subscription History ({subscriptions.length})</span>
        </h4>
        <div className="divide-y divide-slate-100">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-800">{sub.plan?.name || 'Custom Plan'}</span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="text-slate-500">{sub.billingCycle}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-[11px]">
                  {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : ''}
                </span>
                <Badge status={sub.status === 'Active' ? 'success' : sub.status === 'Trialing' ? 'warning' : 'default'}>
                  {sub.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
