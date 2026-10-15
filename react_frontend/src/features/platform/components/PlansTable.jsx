import React from 'react';
import { Table } from '../../../shared/components/Table';
import {
  CreditCard,
  Building2,
  Users,
  GitBranch,
  FileText,
  ShieldCheck,
  Clock,
  Pencil,
  Archive,
  RotateCcw,
  Sparkles,
  Inbox,
} from 'lucide-react';

export function PlansTable({
  plans = [],
  loading = false,
  activeTab = 'active',
  onEdit,
  onArchive,
  onUnarchive,
  onCreatePlan,
}) {
  const renderLimit = (value, icon) => {
    if (value === null || value === undefined) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          Unlimited
        </span>
      );
    }
    return (
      <span className="font-semibold text-slate-800 text-xs">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    );
  };

  const columns = [
    {
      header: 'Plan Tier',
      accessor: 'name',
      render: (row) => (
        <div className="py-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              {row.name}
            </span>
            {!row.isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Archived
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            ID: {row.id}
          </div>
        </div>
      ),
    },
    {
      header: 'Active Tenants',
      accessor: '_count',
      render: (row) => {
        const count = row._count?.subscriptions ?? 0;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              {count} {count === 1 ? 'company' : 'companies'}
            </span>
          </span>
        );
      },
    },
    {
      header: 'Max Users',
      accessor: 'maxUsers',
      render: (row) => renderLimit(row.maxUsers),
    },
    {
      header: 'Max Branches',
      accessor: 'maxBranches',
      render: (row) => renderLimit(row.maxBranches),
    },
    {
      header: 'Process Templates',
      accessor: 'maxActiveProcessTemplates',
      render: (row) => renderLimit(row.maxActiveProcessTemplates),
    },
    {
      header: 'Compliance Rules',
      accessor: 'maxComplianceRules',
      render: (row) => renderLimit(row.maxComplianceRules),
    },
    {
      header: 'Audit Retention',
      accessor: 'auditLogRetentionDays',
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.auditLogRetentionDays} days</span>
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
            onClick={() => onEdit(row)}
            title="Edit Plan Quotas"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit</span>
          </button>

          {row.isActive ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-700 bg-rose-50/60 border border-rose-200/80 hover:bg-rose-50 hover:border-rose-300 transition-all shadow-2xs cursor-pointer"
              onClick={() => onArchive(row)}
              title="Archive Plan"
            >
              <Archive className="w-3.5 h-3.5 text-rose-600" />
              <span>Archive</span>
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-emerald-700 bg-emerald-50/60 border border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
              onClick={() => onUnarchive(row)}
              title="Unarchive and Restore Plan"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
              <span>Restore</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  if (!loading && plans.length === 0) {
    if (activeTab === 'archived') {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No archived plans</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Plans you archive will appear here. Existing tenants on archived tiers continue normal operation, but the tier is hidden from new tenant assignments.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No active subscription plans defined</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Create commercial tiers with custom user caps, branches, and compliance quotas for your tenant organizations.
        </p>
        {onCreatePlan && (
          <button
            type="button"
            onClick={onCreatePlan}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create First Plan</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <Table
        columns={columns}
        data={plans}
        loading={loading}
        emptyMessage="No subscription plans found."
      />
    </div>
  );
}