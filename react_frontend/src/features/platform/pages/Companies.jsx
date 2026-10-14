import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, AlertTriangle } from 'lucide-react';
import { PATHS } from '../../../app/paths';
import { Pagination } from '../../../shared/components/Pagination';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useCompanies } from '../hooks/useCompanies';
import { CompanyFilterBar } from '../components/CompanyFilterBar';
import { CompanyTable } from '../components/CompanyTable';

export default function PlatformCompanies() {
  const {
    companies,
    total,
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    loading,
    error,
    updateCompanyStatus,
  } = useCompanies(10);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    company: null,
    targetStatus: null,
    loading: false,
  });

  const handleRequestStatusChange = (company, targetStatus) => {
    setConfirmModal({
      isOpen: true,
      company,
      targetStatus,
      loading: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmModal.company || !confirmModal.targetStatus) return;
    try {
      setConfirmModal((prev) => ({ ...prev, loading: true }));
      await updateCompanyStatus(confirmModal.company.id, confirmModal.targetStatus);
      setConfirmModal({ isOpen: false, company: null, targetStatus: null, loading: false });
    } catch (err) {
      alert(err.message || 'Failed to update company status');
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const getDialogConfig = () => {
    const { company, targetStatus } = confirmModal;
    if (!company || !targetStatus) return { title: '', message: '', variant: 'primary', confirmText: 'Confirm' };
    if (targetStatus === 'Suspended') {
      return { title: `Suspend: ${company.legalName}`, message: 'Users will be blocked from logging in until reactivated.', variant: 'danger', confirmText: 'Suspend Company' };
    }
    if (targetStatus === 'Closed') {
      return { title: `Close: ${company.legalName}`, message: 'Permanently close this company and terminate all sessions.', variant: 'danger', confirmText: 'Close Permanently' };
    }
    return { title: `Reactivate: ${company.legalName}`, message: 'Users will regain immediate access to workspaces.', variant: 'primary', confirmText: 'Reactivate Company' };
  };

  const dialogConfig = getDialogConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-slate-700" />
            Tenant Companies
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage provisioned organizations, accounts, subscription tiers, and lifecycle statuses.
          </p>
        </div>
        <Link
          to={PATHS.PLATFORM.COMPANY_NEW}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-150 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Company</span>
        </Link>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <CompanyFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Main Companies Table */}
      <CompanyTable
        companies={companies}
        loading={loading}
        onRequestStatusChange={handleRequestStatusChange}
      />

      {/* Shared Pagination Controls */}
      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* ConfirmDialog for Suspend, Reactivate, and Close */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onCancel={() => !confirmModal.loading && setConfirmModal({ isOpen: false, company: null, targetStatus: null, loading: false })}
        onConfirm={handleConfirmStatusChange}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        cancelText="Cancel"
        variant={dialogConfig.variant}
        loading={confirmModal.loading}
      />
    </div>
  );
}
