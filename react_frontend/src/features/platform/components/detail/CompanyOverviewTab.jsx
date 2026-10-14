import { Building2, Users, GitBranch, Calendar, ShieldCheck } from 'lucide-react';
import { Badge } from '../../../../shared/components/Badge';

export function CompanyOverviewTab({ company }) {
  const users = company.users || [];
  const branches = company.branches || [];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{company.userCount || users.length}</div>
            <div className="text-xs font-medium text-slate-500">Active Users</div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{company.branchCount || branches.length}</div>
            <div className="text-xs font-medium text-slate-500">Branches Configured</div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'}
            </div>
            <div className="text-xs font-medium text-slate-500">Registered Date</div>
          </div>
        </div>
      </div>

      {/* Organization Info Card */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-600" />
          <span>Organization Profile</span>
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500">Legal Name</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{company.legalName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Tenant Identifier</dt>
            <dd className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded w-fit mt-0.5 select-all">{company.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Industry</dt>
            <dd className="text-slate-700 mt-0.5">{company.industry || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Company Size</dt>
            <dd className="text-slate-700 mt-0.5">{company.size || 'Not specified'}</dd>
          </div>
        </dl>
      </div>

      {/* Primary Users / Admins Card */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Tenant Personnel ({users.length})</span>
        </h3>
        {users.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">No users registered yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {users.slice(0, 8).map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-800">{u.fullName}</div>
                  <div className="text-slate-500">{u.email}</div>
                </div>
                <Badge status={u.isActive ? 'success' : 'default'}>
                  {u.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
