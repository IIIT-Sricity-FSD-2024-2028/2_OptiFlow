import { X, ExternalLink, Shield, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuditDiffViewer } from './AuditDiffViewer';

export function AuditDetailDrawer({ log, isOpen, onClose }) {
  if (!isOpen || !log) return null;

  const date = new Date(log.createdAt);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {log.action}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">Event ID: {log.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 flex-1 text-xs">
          {/* Metadata Grid */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div>
              <span className="text-slate-400 font-medium">Timestamp</span>
              <p className="font-semibold text-slate-800 mt-0.5">{date.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400 font-mono">{date.toISOString()}</span>
            </div>

            <div className="pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-medium">Platform Operator</span>
                <p className="font-semibold text-slate-800 mt-0.5">{log.adminUser?.fullName || 'System'}</p>
                <span className="text-[11px] text-slate-500">{log.adminUser?.email || log.adminUserId}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Target Company</span>
                {log.companyId ? (
                  <Link
                    to={`/platform/companies/${log.companyId}`}
                    className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>{log.company?.legalName || log.companyId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <p className="font-semibold text-slate-600 mt-0.5">Global / Non-tenant</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60">
              <span className="text-slate-400 font-medium">Affected Entity</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-semibold text-[11px]">
                  {log.entityType}
                </span>
                <span className="font-mono text-slate-700 text-[11px] select-all">{log.entityId}</span>
              </div>
            </div>
          </div>

          {/* Diff Viewer */}
          <AuditDiffViewer before={log.before} after={log.after} />
        </div>
      </div>
    </div>
  );
}
