import { History, Shield, ArrowRight } from 'lucide-react';
import { useScopedAuditLogs } from '../../hooks/useAuditLogs';

export function AdminAuditHistory({ adminUserId }) {
  const { logs, loading, error } = useScopedAuditLogs({ adminUserId }, { enabled: Boolean(adminUserId) });

  if (loading) {
    return <div className="text-xs text-slate-400 py-3">Loading administrator audit history...</div>;
  }

  if (error) {
    return <div className="text-xs text-red-600 py-3">Could not load audit history: {error}</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-3 bg-slate-50 border border-slate-100 rounded-xl px-3 text-center">
        No platform mutation history recorded for this administrator.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-500" />
              {log.action}
            </span>
            <span className="text-slate-400 text-[11px]">
              {new Date(log.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="text-slate-500 text-[11px]">
            Target Entity: <span className="font-semibold text-slate-700">{log.entityType}</span> (ID: {log.entityId?.slice(0, 8)}...)
          </div>

          {log.before && log.after && (
            <div className="bg-white p-2 rounded-lg border border-slate-100 text-[11px] text-slate-600">
              {Object.keys(log.after)
                .filter((k) => log.before[k] !== log.after[k])
                .slice(0, 3)
                .map((field) => (
                  <div key={field} className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-400">{field}:</span>
                    <span className="line-through text-slate-400">{String(log.before[field])}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-semibold text-blue-600">{String(log.after[field])}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
