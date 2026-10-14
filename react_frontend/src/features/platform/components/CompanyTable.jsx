import { Table } from '../../../shared/components/Table';
import { Badge } from '../../../shared/components/Badge';
import { CompanyActionMenu } from './CompanyActionMenu';
import { Building2, Sparkles } from 'lucide-react';

const getBadgeStatus = (status) => {
  if (status === 'Active') return 'success';
  if (status === 'Suspended') return 'warning';
  if (status === 'Closed') return 'danger';
  return 'default';
};

export function CompanyTable({ companies, loading, onRequestStatusChange }) {
  const columns = [
    {
      header: 'Company',
      accessor: 'legalName',
      render: (row) => {
        const users = row.userCount ?? row._count?.users ?? 0;
        const branches = row.branchCount ?? row._count?.branches ?? 0;

        return (
          <div className="flex items-start gap-3 py-1">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 mt-0.5">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 leading-tight">
                {row.legalName || 'Unnamed Company'}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>{users} {users === 1 ? 'user' : 'users'}</span>
                <span>•</span>
                <span>{branches} {branches === 1 ? 'branch' : 'branches'}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Plan / Tier',
      render: (row) => {
        const primarySub = row.subscriptions?.[0];
        const isTrial = primarySub?.status === 'Trialing';
        const planName = primarySub?.plan?.name;

        if (!planName) {
          return <span className="text-xs text-slate-400 italic">No Active Plan</span>;
        }

        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="text-xs font-semibold text-slate-800">{planName}</span>
            {isTrial ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                14d Trial
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">{primarySub?.billingCycle || 'Monthly'}</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Tenant ID',
      accessor: 'id',
      render: (row) => (
        <code className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200/70 select-all">
          {row.id}
        </code>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge status={getBadgeStatus(row.status)}>
          {row.status || 'Active'}
        </Badge>
      ),
    },
    {
      header: 'Registered',
      accessor: 'createdAt',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <CompanyActionMenu
          company={row}
          onRequestStatusChange={onRequestStatusChange}
        />
      ),
    },
  ];

  return (
    <div className="overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs">
      <Table
        columns={columns}
        data={companies}
        loading={loading}
        emptyMessage="No companies match the current criteria."
      />
    </div>
  );
}
