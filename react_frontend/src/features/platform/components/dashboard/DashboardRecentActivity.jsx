import { History, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { AuditActionBadge } from '../audit/AuditActionBadge';

export function DashboardRecentActivity({ activity = [], loading }) {
  if (loading) {
    return (
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 bg-slate-100 rounded"></div>
        ))}
      </div>
    );
  }

  const formatRelative = (dateStr) => {
    if (!dateStr) return '—';
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Recent Activity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Last 10 platform governance & operational actions</p>
          </div>
          <Link
            to={PATHS.PLATFORM.AUDIT_LOGS}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {activity.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-6 text-center">No audit trail recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {activity.map((item) => (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 truncate">
                      {item.adminUser?.fullName || item.adminUser?.email || 'Platform Admin'}
                    </span>
                    <AuditActionBadge action={item.action} />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {item.company?.legalName ? (
                      <span>Target Tenant: <strong>{item.company.legalName}</strong></span>
                    ) : (
                      <span>Entity: <span className="font-mono">{item.entityType} ({item.entityId ? item.entityId.slice(0, 8) : '—'})</span></span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400 font-mono mt-0.5">
                  {formatRelative(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Append-only immutable audit log</span>
        <Link to={PATHS.PLATFORM.AUDIT_LOGS} className="font-semibold text-slate-600 hover:text-slate-900">
          Audit Explorer &rarr;
        </Link>
      </div>
    </div>
  );
}
