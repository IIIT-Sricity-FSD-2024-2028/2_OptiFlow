import { useState } from 'react';
import { ShieldAlert, Plus, AlertTriangle } from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { useSupportAccess } from '../hooks/useSupportAccess';
import { SupportActiveRiskBanner } from '../components/support/SupportActiveRiskBanner';
import { SupportFilterBar } from '../components/support/SupportFilterBar';
import { SupportAccessTable } from '../components/support/SupportAccessTable';
import { SupportDetailDrawer } from '../components/support/SupportDetailDrawer';
import { SupportGrantModal } from '../components/support/SupportGrantModal';
import { SupportRevokeDialog } from '../components/support/SupportRevokeDialog';

export default function PlatformSupportAccess() {
  const {
    grants, total, summary, page, setPage, pageSize,
    search, setSearch, statusFilter, setStatusFilter,
    companyFilter, setCompanyFilter, startDate, setStartDate,
    endDate, setEndDate, loading, error, refetch,
    createGrant, revokeGrant,
  } = useSupportAccess(10);

  const [selectedGrant, setSelectedGrant] = useState(null);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const handleRevokeConfirm = async (id) => {
    await revokeGrant(id);
    if (selectedGrant && selectedGrant.id === id) {
      setSelectedGrant(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            Support Access Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Time-boxed, reasoned, and revocable administrative access grants into customer tenant data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGrantModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Grant Support Access</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => refetch()} className="font-bold underline text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Risk Banner & Count Strip */}
      <SupportActiveRiskBanner
        summary={summary}
        currentStatus={statusFilter}
        onSelectStatus={setStatusFilter}
      />

      {/* Filter Bar */}
      <SupportFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        companyFilter={companyFilter}
        onCompanyChange={setCompanyFilter}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
      />

      {/* Main Table */}
      <SupportAccessTable
        grants={grants}
        loading={loading}
        onSelectGrant={(g) => setSelectedGrant(g)}
        onRequestRevoke={(g) => setRevokeTarget(g)}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Detail Slide-over Drawer */}
      <SupportDetailDrawer
        grant={selectedGrant}
        isOpen={Boolean(selectedGrant)}
        onClose={() => setSelectedGrant(null)}
        onRequestRevoke={(g) => setRevokeTarget(g)}
      />

      {/* Grant Access Modal */}
      <SupportGrantModal
        isOpen={grantModalOpen}
        onClose={() => setGrantModalOpen(false)}
        onConfirm={createGrant}
      />

      {/* Revoke Confirmation Dialog */}
      <SupportRevokeDialog
        isOpen={Boolean(revokeTarget)}
        grant={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
      />
    </div>
  );
}
