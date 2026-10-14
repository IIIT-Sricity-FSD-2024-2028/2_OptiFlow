import { useState } from 'react';
import { ShieldAlert, Plus, Clock, UserCheck, ShieldCheck } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';
import { apiClient } from '../../../../services/api/client';
import { formatRelativeExpiry } from '../../utils/relativeDate';
import { SupportGrantModal } from '../support/SupportGrantModal';
import { SupportRevokeDialog } from '../support/SupportRevokeDialog';

export function CompanySupportAccessTab({ company, onRefresh }) {
  const grants = company.supportAccesses || [];
  const isClosedCompany = company.status === 'Closed';

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const getGrantStatus = (grant) => {
    if (grant.revokedAt) return { label: 'Revoked', status: 'error', isActive: false };
    const rel = formatRelativeExpiry(grant.expiresAt);
    if (rel.isExpired) return { label: 'Expired', status: 'default', isActive: false, rel };
    return { label: 'Active', status: 'success', isActive: true, rel };
  };

  const handleCreateGrant = async (payload) => {
    await apiClient('/api/platform/support-access', { method: 'POST', body: payload });
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  const handleRevoke = async (id) => {
    await apiClient(`/api/platform/support-access/${id}/revoke`, { method: 'POST' });
    if (onRefresh) onRefresh();
    else window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Delegated Support Sessions ({grants.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Time-bound administrative access granted to platform operators for troubleshooting.
            </p>
          </div>
          <button
            type="button"
            disabled={isClosedCompany}
            onClick={() => setGrantModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all disabled:opacity-40 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Grant Support Access</span>
          </button>
        </div>

        {grants.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No support access grants have been issued for this tenant.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grants.map((grant) => {
              const statusInfo = getGrantStatus(grant);
              const rel = formatRelativeExpiry(grant.expiresAt);
              return (
                <div key={grant.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{grant.adminUser?.fullName || 'Platform Admin'}</span>
                      <span className="text-slate-400 text-[11px]">({grant.adminUser?.email})</span>
                      <Badge status={statusInfo.status}>{statusInfo.label}</Badge>
                    </div>
                    <div className="text-slate-600 italic">"{grant.reason}"</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-slate-500 text-[11px] space-y-0.5">
                      <div className="flex items-center gap-1 sm:justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Expires: <strong className={statusInfo.isActive ? 'text-amber-700' : ''}>{rel.text}</strong></span>
                      </div>
                      <div className="text-slate-400">{rel.formattedDate}</div>
                    </div>
                    {statusInfo.isActive && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(grant)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SupportGrantModal
        isOpen={grantModalOpen}
        preselectedCompanyId={company.id}
        onClose={() => setGrantModalOpen(false)}
        onConfirm={handleCreateGrant}
      />

      <SupportRevokeDialog
        isOpen={Boolean(revokeTarget)}
        grant={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
      />
    </div>
  );
}
