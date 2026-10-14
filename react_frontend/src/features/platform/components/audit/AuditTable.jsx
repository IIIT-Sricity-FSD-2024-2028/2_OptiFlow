import { Link } from 'react-router-dom';
import { History, Shield, ExternalLink, ArrowRight } from 'lucide-react';
import { formatRelativePast } from '../../utils/relativeDate';
import { AuditActionBadge } from './AuditActionBadge';

export function AuditTable({ logs, loading, onSelectLog }) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <div className="inline-block animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading audit log stream...</p>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No audit events match your filters</h3>
        <p className="text-sm text-slate-500 mt-1">Try broadening your search term or adjusting the date range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200/80 text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">Operator</th>
              <th className="py-3.5 px-4">Action</th>
              <th className="py-3.5 px-4">Target Company</th>
              <th className="py-3.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => {
              const date = new Date(log.createdAt);
              return (
                <tr
                  key={log.id}
                  onClick={() => onSelectLog(log)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-800" title={date.toLocaleString()}>
                      {formatRelativePast(date)}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      {date.toLocaleTimeString()}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {log.adminUser?.fullName?.charAt(0) || 'A'}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 truncate block">
                          {log.adminUser?.fullName || 'Platform Operator'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {log.adminUser?.email || 'System'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <AuditActionBadge action={log.action} />
                  </td>

                  <td className="py-3 px-4">
                    {log.companyId ? (
                      <Link
                        to={`/platform/companies/${log.companyId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        <span className="truncate max-w-[160px]">{log.company?.legalName || log.companyId}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                      </Link>
                    ) : (
                      <span className="text-slate-400 italic">Platform Level</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition-colors font-medium">
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
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
