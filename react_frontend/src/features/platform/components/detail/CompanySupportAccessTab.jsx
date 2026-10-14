import { ShieldAlert, Clock, UserCheck } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';

export function CompanySupportAccessTab({ company }) {
  const grants = company.supportAccesses || [];

  const getGrantStatus = (grant) => {
    if (grant.revokedAt) return { label: 'Revoked', status: 'danger' };
    const now = new Date();
    const expires = new Date(grant.expiresAt);
    if (expires < now) return { label: 'Expired', status: 'default' };
    return { label: 'Active', status: 'success' };
  };

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Platform Support Sessions ({grants.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Time-bound administrative access granted to platform operators for troubleshooting.
            </p>
          </div>
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
              return (
                <div key={grant.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {grant.adminUser?.fullName || 'Platform Admin'}
                      </span>
                      <span className="text-slate-400">({grant.adminUser?.email})</span>
                      <Badge status={statusInfo.status}>{statusInfo.label}</Badge>
                    </div>
                    <div className="text-slate-600 mt-1 italic">
                      "{grant.reason || 'Support inspection'}"
                    </div>
                  </div>

                  <div className="text-right text-slate-500 shrink-0 text-[11px] space-y-0.5">
                    <div className="flex items-center gap-1 sm:justify-end">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Granted: {new Date(grant.grantedAt).toLocaleString()}</span>
                    </div>
                    <div>Expires: {new Date(grant.expiresAt).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
