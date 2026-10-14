import { useState, useEffect } from 'react';
import { History, Activity, Clock } from 'lucide-react';
import { apiClient } from '../../../../services/api/client';

export function CompanyActivityTab({ company }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient(`/api/platform/audit-logs?companyId=${company.id}&pageSize=20`).catch(() => null);
        const items = res?.items || (Array.isArray(res) ? res : []);
        setLogs(items);
      } catch (err) {
        setError('Audit logs could not be loaded');
      } finally {
        setLoading(false);
      }
    }
    if (company?.id) {
      loadLogs();
    }
  }, [company?.id]);

  return (
    <div className="space-y-4">
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Platform Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable record of administrative mutations performed on this tenant.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400">Loading audit history...</div>
        ) : error || logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-300" />
            <div>No audit log events recorded yet for this organization.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <div className="text-slate-600 mt-1">
                    By <span className="font-semibold text-slate-700">{log.adminUser?.fullName || 'Platform Operator'}</span>
                  </div>
                </div>
                <div className="text-right text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
