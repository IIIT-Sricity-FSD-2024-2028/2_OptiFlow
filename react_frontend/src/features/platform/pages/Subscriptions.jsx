import { useState } from 'react';
import { CreditCard, Plus, AlertTriangle } from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { SubscriptionSummaryStrip } from '../components/subscriptions/SubscriptionSummaryStrip';
import { SubscriptionFilterBar } from '../components/subscriptions/SubscriptionFilterBar';
import { SubscriptionTable } from '../components/subscriptions/SubscriptionTable';
import { SubscriptionDetailDrawer } from '../components/subscriptions/SubscriptionDetailDrawer';
import { SubscriptionModals } from '../components/subscriptions/SubscriptionModals';

export default function PlatformSubscriptions() {
  const {
    subscriptions, total, summary, page, setPage, pageSize,
    search, setSearch, statusFilter, setStatusFilter,
    planFilter, setPlanFilter, cycleFilter, setCycleFilter,
    quickFilter, setQuickFilter, loading, error, refetch,
    updateSubscription, createSubscription,
  } = useSubscriptions(10);

  const [selectedSub, setSelectedSub] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [modalTargetSub, setModalTargetSub] = useState(null);

  const handleOpenAction = (type, sub) => {
    setModalTargetSub(sub);
    setActiveModal(type);
  };

  const handleUpdate = async (payload) => {
    if (!modalTargetSub) return;
    await updateSubscription(modalTargetSub.id, payload);
    if (selectedSub && selectedSub.id === modalTargetSub.id) {
      setSelectedSub((prev) => ({ ...prev, ...payload }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-slate-700" />
            Subscriptions & Billing Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tenant plan entitlements, lifecycle statuses, renewals, and operational billing overrides.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveModal('assign')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Subscription</span>
        </button>
      </div>

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

      <SubscriptionSummaryStrip
        summary={summary}
        currentStatus={statusFilter}
        quickFilter={quickFilter}
        onSelectStatus={setStatusFilter}
        onSelectQuick={setQuickFilter}
      />

      <SubscriptionFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        planFilter={planFilter}
        onPlanChange={setPlanFilter}
        cycleFilter={cycleFilter}
        onCycleChange={setCycleFilter}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
      />

      <SubscriptionTable
        subscriptions={subscriptions}
        loading={loading}
        onSelectSubscription={(sub) => setSelectedSub(sub)}
        onRequestAction={handleOpenAction}
      />

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <SubscriptionDetailDrawer
        subscription={selectedSub}
        isOpen={Boolean(selectedSub)}
        onClose={() => setSelectedSub(null)}
        onRequestAction={handleOpenAction}
      />

      <SubscriptionModals
        activeModal={activeModal}
        targetSub={modalTargetSub}
        onClose={() => setActiveModal(null)}
        onUpdate={handleUpdate}
        onCreate={createSubscription}
      />
    </div>
  );
}
