import { X, Building2, User, Clock, ShieldAlert, XCircle, ExternalLink, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../../shared/components/Badge';
import { formatRelativeExpiry } from '../../utils/relativeDate';

export function SupportDetailDrawer({
  grant,
  isOpen,
  onClose,
  onRequestRevoke,
}) {
  if (!isOpen || !grant) return null;

  const rel = formatRelativeExpiry(grant.expiresAt);
  const isActive = !grant.revokedAt && !rel.isExpired;
  const actionLogs = Array.isArray(grant.actionLog) ? grant.actionLog : [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{grant.company?.legalName || 'Support Grant'}</h2>
              <Badge status={grant.revokedAt ? 'error' : isActive ? 'success' : 'default'}>
                {grant.revokedAt ? 'Revoked' : isActive ? 'Active' : 'Expired'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Grant ID: {grant.id}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1 text-xs">
          {/* Overview Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-medium">Operator Admin</span>
                <div className="font-bold text-slate-800 mt-0.5">{grant.adminUser?.fullName}</div>
                <div className="text-[11px] text-slate-400">{grant.adminUser?.email}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Granted At</span>
                <div className="font-semibold text-slate-800 mt-0.5">{new Date(grant.grantedAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60">
              <div>
                <span className="text-slate-400 font-medium">Expires</span>
                <div className={`font-semibold mt-0.5 ${isActive ? 'text-amber-700' : 'text-slate-700'}`}>
                  {rel.text} <span className="font-normal text-slate-400">({rel.formattedDate})</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Revocation Status</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {grant.revokedAt ? (
                    <span className="text-rose-600 font-bold">
                      Revoked on {new Date(grant.revokedAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-500">Not revoked</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Stated Support Reason</span>
              <p className="mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 italic">
                "{grant.reason}"
              </p>
            </div>
          </div>

          {/* Revoke CTA if Active */}
          {isActive && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onRequestRevoke(grant)}
                className="px-4 py-2 font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-all"
              >
                Revoke Support Grant Now
              </button>
            </div>
          )}

          {/* Action Log Timeline */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Immutable Action Timeline ({actionLogs.length})</span>
            </h4>
            {actionLogs.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-center">
                No session actions recorded.
              </div>
            ) : (
              <div className="space-y-2">
                {actionLogs.map((log, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 uppercase">
                        {log.action}
                      </span>
                      <span className="text-slate-400 font-normal text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      By: <strong>{log.adminName || log.adminId}</strong>
                      {log.targetCompany && <span> • Target: {log.targetCompany}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cross Links */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link to={`/platform/companies/${grant.companyId}`} className="text-blue-600 hover:underline flex items-center gap-1 font-semibold">
              <Building2 className="w-3.5 h-3.5" /> Company Profile
            </Link>
            <Link to="/platform/audit-log" className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
              Platform Audit Logs <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
