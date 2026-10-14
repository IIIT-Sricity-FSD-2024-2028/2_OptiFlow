import { useState } from 'react';
import { Shield, Plus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Pagination } from '../../../shared/components/Pagination';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { AdminSummaryStrip } from '../components/admins/AdminSummaryStrip';
import { AdminFilterBar } from '../components/admins/AdminFilterBar';
import { AdminTable } from '../components/admins/AdminTable';
import { AdminDetailDrawer } from '../components/admins/AdminDetailDrawer';
import { AdminCreateModal } from '../components/admins/AdminCreateModal';
import { AdminEditModal } from '../components/admins/AdminEditModal';
import { AdminStatusDialog } from '../components/admins/AdminStatusDialog';
import { AdminResetPasswordDialog } from '../components/admins/AdminResetPasswordDialog';

export default function PlatformAdminUsers() {
  const { user } = useAuth();
  const {
    admins, total, summary, page, setPage, pageSize,
    search, setSearch, statusFilter, setStatusFilter,
    loading, error, refetch, createAdmin, updateAdmin, resetPassword,
  } = useAdminUsers(10);

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [statusTargetAdmin, setStatusTargetAdmin] = useState(null);
  const [resetTargetAdmin, setResetTargetAdmin] = useState(null);

  const handleStatusConfirm = async (id, isActive, reason) => {
    await updateAdmin(id, { isActive, reason });
    if (selectedAdmin?.id === id) {
      setSelectedAdmin((prev) => ({ ...prev, isActive }));
    }
  };

  const handleEditSave = async (id, payload) => {
    await updateAdmin(id, payload);
    if (selectedAdmin?.id === id) {
      setSelectedAdmin((prev) => ({ ...prev, ...payload }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-slate-700" />
            Platform Administrators
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Safe onboarding, deactivation safeguards, and accountability for cross-tenant personnel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Administrator</span>
        </button>
      </div>

      <AdminSummaryStrip
        summary={summary}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => refetch()} className="text-xs font-bold underline hover:no-underline">Retry</button>
        </div>
      )}

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <AdminTable
        admins={admins}
        loading={loading}
        currentAdminId={user?.id}
        onSelectAdmin={setSelectedAdmin}
        onRequestEdit={setEditingAdmin}
        onRequestResetPassword={setResetTargetAdmin}
        onRequestToggleStatus={setStatusTargetAdmin}
      />

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <AdminDetailDrawer
        admin={selectedAdmin}
        isOpen={Boolean(selectedAdmin)}
        currentAdminId={user?.id}
        onClose={() => setSelectedAdmin(null)}
        onRequestEdit={setEditingAdmin}
        onRequestResetPassword={setResetTargetAdmin}
        onRequestToggleStatus={setStatusTargetAdmin}
      />

      <AdminCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={createAdmin}
        onConfirm={createAdmin}
      />

      <AdminEditModal
        isOpen={Boolean(editingAdmin)}
        admin={editingAdmin}
        onClose={() => setEditingAdmin(null)}
        onSave={handleEditSave}
      />

      <AdminStatusDialog
        isOpen={Boolean(statusTargetAdmin)}
        admin={statusTargetAdmin}
        currentAdminId={user?.id}
        onClose={() => setStatusTargetAdmin(null)}
        onConfirm={handleStatusConfirm}
      />

      <AdminResetPasswordDialog
        isOpen={Boolean(resetTargetAdmin)}
        admin={resetTargetAdmin}
        onClose={() => setResetTargetAdmin(null)}
        onReset={resetPassword}
      />
    </div>
  );
}
