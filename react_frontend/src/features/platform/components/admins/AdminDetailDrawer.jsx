import { X, Shield, KeyRound, Activity, UserCheck, ShieldAlert } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';
import { AdminAuditHistory } from './AdminAuditHistory';

export function AdminDetailDrawer({
  admin,
  isOpen,
  currentAdminId,
  onClose,
  onRequestEdit,
  onRequestResetPassword,
  onRequestToggleStatus,
}) {
  if (!isOpen || !admin) return null;

  const isCurrentAdmin = admin.id === currentAdminId;
  const supportCount = admin._count?.supportAccesses ?? admin.supportAccesses?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{admin.fullName}</h2>
              {isCurrentAdmin && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">You</span>
              )}
              <Badge status={admin.isActive ? 'success' : 'default'}>
                {admin.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{admin.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1 text-xs">
          {/* Profile Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-medium">Administrator ID</span>
                <p className="font-mono text-[11px] text-slate-700 mt-0.5 truncate">{admin.id}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Created Date</span>
                <p className="font-semibold text-slate-800 mt-0.5">{new Date(admin.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 font-medium">Password Last Changed</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {admin.passwordChangedAt ? new Date(admin.passwordChangedAt).toLocaleString() : 'Never (Setup Required)'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Delegated Support Grants</span>
                <div className="mt-0.5 flex items-center gap-1.5 font-bold text-slate-700">
                  <span>{supportCount} Sessions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRequestEdit(admin)}
              className="px-3.5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all"
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => onRequestResetPassword(admin)}
              className="px-3.5 py-2 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
            >
              Issue Temporary Password
            </button>
            {!isCurrentAdmin ? (
              <button
                type="button"
                onClick={() => onRequestToggleStatus(admin)}
                className={`px-3.5 py-2 font-bold rounded-xl transition-all ${
                  admin.isActive
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                }`}
              >
                {admin.isActive ? 'Deactivate Account' : 'Reactivate Account'}
              </button>
            ) : (
              <span className="px-3 py-2 text-[11px] italic text-slate-400 self-center">
                Self-deactivation disabled
              </span>
            )}
          </div>

          {/* Platform Audit Trail */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Recent Platform Mutations</span>
            </h4>
            <AdminAuditHistory adminUserId={admin.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
