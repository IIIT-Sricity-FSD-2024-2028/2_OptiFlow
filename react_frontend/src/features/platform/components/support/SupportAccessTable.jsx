import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, Clock, XCircle, Building2, UserCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';
import { formatRelativeExpiry } from '../../utils/relativeDate';

export function SupportAccessTable({
  grants,
  loading,
  onSelectGrant,
  onRequestRevoke,
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <div className="inline-block animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading support access grants...</p>
      </div>
    );
  }

  if (!grants || grants.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No support grants found</h3>
        <p className="text-sm text-slate-500 mt-1">No grants match your current filter criteria.</p>
      </div>
    );
  }

  const getGrantStatus = (grant) => {
    if (grant.revokedAt) return { label: 'Revoked', status: 'error', isRevoked: true, isActive: false };
    const rel = formatRelativeExpiry(grant.expiresAt);
    if (rel.isExpired) return { label: 'Expired', status: 'default', isExpired: true, isActive: false, rel };
    return { label: 'Active', status: 'success', isActive: true, rel };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4">Company</th>
              <th className="py-3.5 px-4">Operator Admin</th>
              <th className="py-3.5 px-4">Reason</th>
              <th className="py-3.5 px-4">Granted At</th>
              <th className="py-3.5 px-4">Expires</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Revoked By</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grants.map((grant) => {
              const statusInfo = getGrantStatus(grant);
              const rel = formatRelativeExpiry(grant.expiresAt);
              return (
                <tr
                  key={grant.id}
                  onClick={() => onSelectGrant(grant)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    statusInfo.isActive ? 'bg-amber-50/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <Link
                      to={`/platform/companies/${grant.companyId}?tab=support-access`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{grant.company?.legalName || 'Company'}</span>
                    </Link>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{grant.adminUser?.fullName || 'Admin'}</div>
                    <div className="text-[11px] text-slate-400">{grant.adminUser?.email}</div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="truncate text-xs text-slate-600 italic" title={grant.reason}>
                      "{grant.reason}"
                    </p>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {new Date(grant.grantedAt).toLocaleDateString()}{' '}
                    <span className="text-[11px] text-slate-400">
                      {new Date(grant.grantedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-xs">
                    <span className={`font-semibold ${statusInfo.isActive ? 'text-amber-700' : 'text-slate-500'}`}>
                      {rel.text}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">{rel.formattedDate}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge status={statusInfo.status}>{statusInfo.label}</Badge>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {grant.revokedByAdmin ? (
                      <span className="font-medium text-slate-700">{grant.revokedByAdmin.fullName || grant.revokedByAdmin.email}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectGrant(grant)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        Details
                      </button>
                      {statusInfo.isActive && (
                        <button
                          type="button"
                          onClick={() => onRequestRevoke(grant)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
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
