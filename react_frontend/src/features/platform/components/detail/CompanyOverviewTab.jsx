import { Building2, Users, GitBranch, Calendar } from 'lucide-react';

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
            <dt className="text-xs font-medium text-slate-500">Status</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">{company.status || 'Active'}</dd>
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
    </div>
  );
}

