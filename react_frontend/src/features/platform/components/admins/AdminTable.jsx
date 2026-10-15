import { Shield, KeyRound, UserCheck, MoreHorizontal, UserX, UserPlus } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';

export function AdminTable({
  admins,
  loading,
  currentAdminId,
  onSelectAdmin,
  onRequestEdit,
  onRequestResetPassword,
  onRequestToggleStatus,
}) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <div className="inline-block animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading administrators...</p>
      </div>
    );
  }

  if (!admins || admins.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No administrators found</h3>
        <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
            <tr>
              <th className="py-3.5 px-4">Administrator</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Password Security</th>
              <th className="py-3.5 px-4">Created Date</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((admin) => {
              const isCurrentAdmin = admin.id === currentAdminId;
              return (
                <tr
                  key={admin.id}
                  onClick={() => onSelectAdmin(admin)}
                  className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                    isCurrentAdmin ? 'bg-blue-50/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {admin.fullName?.charAt(0) || 'A'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{admin.fullName}</span>
                          {isCurrentAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{admin.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge status={admin.isActive ? 'success' : 'default'}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {admin.passwordChangedAt ? (
                      <div>
                        <span>Updated: {new Date(admin.passwordChangedAt).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Initial Setup
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectAdmin(admin)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestEdit(admin)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestResetPassword(admin)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        title="Issue new temporary password"
                      >
                        Reset Key
                      </button>
                      {!isCurrentAdmin && (
                        <button
                          type="button"
                          onClick={() => onRequestToggleStatus(admin)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                            admin.isActive
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {admin.isActive ? 'Deactivate' : 'Reactivate'}
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
