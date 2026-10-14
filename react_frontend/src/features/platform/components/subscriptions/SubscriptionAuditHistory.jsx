import { useState, useEffect } from 'react';
import { History, User, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import { apiClient } from '../../../../services/api/client';

export function SubscriptionAuditHistory({ subscriptionId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!subscriptionId) return;

    setLoading(true);
    apiClient(`/api/platform/audit-logs?entityType=Subscription&entityId=${subscriptionId}`)
      .then((res) => {
        if (isMounted) setLogs(res?.items || []);
      })
      .catch((err) => console.error('Failed to load subscription audit logs:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [subscriptionId]);

  if (loading) {
    return <div className="text-xs text-slate-400 py-3">Loading change history...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-3 bg-slate-50 border border-slate-100 rounded-xl px-3 text-center">
        No recorded changes for this subscription yet.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {logs.map((log) => {
        const adminName = log.adminUser?.fullName || log.adminUser?.email || 'Platform Admin';
        const reason = log.after?.reason || log.before?.reason;
        return (
          <div key={log.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-500" />
                {log.action}
              </span>
              <span className="text-slate-400 text-[11px]">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500">
              <User className="w-3 h-3 text-slate-400" />
              <span>By <strong>{adminName}</strong></span>
            </div>

            {/* Diff info */}
            {log.before && log.after && (
              <div className="bg-white p-2 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                {log.before.status !== log.after.status && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold text-slate-600">{log.before.status}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-bold text-blue-600">{log.after.status}</span>
                  </div>
                )}
                {log.before.planId !== log.after.planId && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Plan ID:</span>
                    <span className="font-mono text-[10px] text-slate-500">{log.before.planId?.slice(0, 8)}...</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-mono text-[10px] font-bold text-blue-600">{log.after.planId?.slice(0, 8)}...</span>
                  </div>
                )}
                {log.before.billingCycle !== log.after.billingCycle && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Cycle:</span>
                    <span className="font-medium text-slate-600">{log.before.billingCycle}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-bold text-blue-600">{log.after.billingCycle}</span>
                  </div>
                )}
              </div>
            )}

            {reason && (
              <div className="flex items-center gap-1.5 text-slate-600 italic text-[11px] bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                <MessageSquare className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Reason: {reason}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
