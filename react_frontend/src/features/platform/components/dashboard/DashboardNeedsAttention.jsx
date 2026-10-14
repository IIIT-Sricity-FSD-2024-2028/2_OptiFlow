import { ShieldAlert, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';

export function DashboardNeedsAttention({ needsAttention = {}, loading }) {
  const suspended = needsAttention.suspended || [];
  const noSubscription = needsAttention.noSubscription || [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 bg-white border border-slate-200 rounded-2xl animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
            <div className="h-10 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Needs Immediate Attention</span>
        </h2>
        <span className="text-xs text-slate-400">High-priority operational risk queues</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


        {/* 3. Suspended Companies */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Suspended Companies ({suspended.length})
              </span>
            </div>
            {suspended.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No suspended companies</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {suspended.map((c) => (
                  <li key={c.id} className="p-2 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <div className="font-semibold text-slate-800 truncate">{c.legalName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {c.id.slice(0, 8)}...</div>
                    </div>
                    <span className="shrink-0 font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded text-[10px]">Suspended</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link to={`${PATHS.PLATFORM.COMPANIES}?status=Suspended`} className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-between">
            <span>View all suspended</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* 4. Companies With No Subscription */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                Tenants with No Active Subscription ({noSubscription.length})
              </span>
            </div>
            {noSubscription.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">All tenants have subscriptions</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {noSubscription.map((c) => (
                  <li key={c.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <div className="font-semibold text-slate-800 truncate">{c.legalName}</div>
                      <div className="text-[10px] text-slate-400">Created {new Date(c.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className="shrink-0 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">No Plan</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link to={PATHS.PLATFORM.COMPANIES} className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-between">
            <span>Review tenant details</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
