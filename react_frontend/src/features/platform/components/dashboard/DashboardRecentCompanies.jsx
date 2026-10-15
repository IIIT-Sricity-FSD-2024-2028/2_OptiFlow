import { Building2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';

export function DashboardRecentCompanies({ companies = [], loading }) {
  if (loading) {
    return (
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 bg-slate-100 rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Recently Added Companies</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest onboarded tenant organizations</p>
          </div>
          <Link
            to={PATHS.PLATFORM.COMPANIES}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {companies.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-6 text-center">No companies registered yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {companies.map((c) => {
              const activeSub = (c.subscriptions && c.subscriptions[0]) || null;
              const planName = activeSub?.plan?.name || 'No Plan';

              return (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`${PATHS.PLATFORM.COMPANIES}/${c.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 hover:underline truncate block"
                    >
                      {c.legalName}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                        {planName}
                      </span>
                      <span>•</span>
                      <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                  <Badge status={c.status === 'Active' ? 'success' : c.status === 'Suspended' ? 'warning' : 'danger'}>
                    {c.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400">Total 5 most recently created tenants</span>
        <Link
          to={PATHS.PLATFORM.COMPANY_NEW}
          className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <span>Provision Tenant &rarr;</span>
        </Link>
      </div>
    </div>
  );
}
