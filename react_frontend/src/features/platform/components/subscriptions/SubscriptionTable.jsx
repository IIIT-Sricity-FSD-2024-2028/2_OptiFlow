import { Link } from 'react-router-dom';
import { Sparkles, Calendar, Building2, MoreHorizontal, ArrowRight, Clock } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';
import { formatRelativePeriod } from '../../utils/relativeDate';

export function SubscriptionTable({
  subscriptions,
  loading,
  onSelectSubscription,
  onRequestAction,
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <div className="inline-block animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading subscriptions...</p>
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No subscriptions found</h3>
        <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-4">Plan</th>
              <th className="py-3.5 px-4">Cycle</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Period End</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((sub) => {
              const rel = formatRelativePeriod(sub.currentPeriodEnd);
              return (
                <tr
                  key={sub.id}
                  onClick={() => onSelectSubscription(sub)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <Link
                          to={`/platform/companies/${sub.companyId}?tab=subscription`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {sub.company?.legalName || 'Unknown Company'}
                        </Link>
                        <div className="text-[11px] text-slate-400">ID: {sub.companyId.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{sub.plan?.name || 'Custom Plan'}</div>
                    {sub.plan?.isActive === false && (
                      <span className="text-[10px] text-amber-600 font-semibold">(Archived)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                      {sub.billingCycle}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {sub.status === 'Trialing' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Trialing
                      </span>
                    ) : sub.status === 'PastDue' ? (
                      <Badge status="error">Past Due</Badge>
                    ) : (
                      <Badge status={sub.status === 'Active' ? 'success' : 'default'}>
                        {sub.status}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold text-xs ${rel.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                        {rel.text}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{rel.formattedDate}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectSubscription(sub)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestAction('plan', sub)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        Change
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
