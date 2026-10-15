import React, { useState } from 'react';
import { CreditCard, Plus, Layers, Archive, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { usePlans } from '../hooks/usePlans';
import { PlansTable } from '../components/PlansTable';
import { PlanDrawer } from '../components/PlanDrawer';

export default function PlatformPlans() {
  const toast = useToast();
  const { plans, loading, error, savePlan, setPlanActiveStatus } = usePlans();

  // Active tab state: 'active' | 'archived'
  const [activeTab, setActiveTab] = useState('active');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Archive ConfirmDialog state
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Unarchive ConfirmDialog state
  const [unarchiveTarget, setUnarchiveTarget] = useState(null);
  const [unarchiving, setUnarchiving] = useState(false);

  // Filter plans into active vs archived
  const activePlans = plans.filter((p) => p.isActive !== false);
  const archivedPlans = plans.filter((p) => p.isActive === false);
  const displayedPlans = activeTab === 'active' ? activePlans : archivedPlans;

  // Open Create Drawer
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsDrawerOpen(true);
  };

  // Open Edit Drawer
  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingPlan(null);
  };

  // Confirm Archive Action
  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      setArchiving(true);
      await setPlanActiveStatus(archiveTarget.id, false);
      toast.success(`Plan "${archiveTarget.name}" archived successfully.`);
      setArchiveTarget(null);
    } catch (err) {
      console.error('Failed to archive plan:', err);
      toast.error(err.message || 'Failed to archive plan');
    } finally {
      setArchiving(false);
    }
  };

  // Confirm Unarchive Action
  const handleConfirmUnarchive = async () => {
    if (!unarchiveTarget) return;
    try {
      setUnarchiving(true);
      await setPlanActiveStatus(unarchiveTarget.id, true);
      toast.success(`Plan "${unarchiveTarget.name}" unarchived successfully.`);
      setUnarchiveTarget(null);
    } catch (err) {
      console.error('Failed to unarchive plan:', err);
      toast.error(err.message || 'Failed to unarchive plan');
    } finally {
      setUnarchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-slate-700" />
            Subscription Plans & Quotas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage commercial tiers, feature limits, and subscription quotas across tenants.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Plan</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Switcher Above Table */}
      <div className="flex items-center justify-between border-b border-slate-200 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active Plans</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'active'
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activePlans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'archived'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Archived Plans</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'archived'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {archivedPlans.length}
            </span>
          </button>
        </div>

        <p className="hidden md:block text-xs text-slate-400">
          Showing {displayedPlans.length} {activeTab} tier{displayedPlans.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Plans Table */}
      <PlansTable
        plans={displayedPlans}
        loading={loading}
        activeTab={activeTab}
        onEdit={handleOpenEdit}
        onArchive={(plan) => setArchiveTarget(plan)}
        onUnarchive={(plan) => setUnarchiveTarget(plan)}
        onCreatePlan={handleOpenCreate}
      />

      {/* Create / Edit Drawer */}
      <PlanDrawer
        isOpen={isDrawerOpen}
        editingPlan={editingPlan}
        onClose={handleCloseDrawer}
        onSave={savePlan}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onCancel={() => !archiving && setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
        title={`Archive Plan: ${archiveTarget?.name || ''}`}
        message="Are you sure you want to archive this plan? Existing tenants on this tier will continue to operate, but this plan will be blocked from being selected for new tenant subscriptions."
        confirmText="Archive Plan"
        cancelText="Cancel"
        variant="danger"
        loading={archiving}
      />

      {/* Unarchive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(unarchiveTarget)}
        onCancel={() => !unarchiving && setUnarchiveTarget(null)}
        onConfirm={handleConfirmUnarchive}
        title={`Unarchive Plan: ${unarchiveTarget?.name || ''}`}
        message={`Are you sure you want to unarchive "${unarchiveTarget?.name || ''}"? It will become active again and available for new tenant subscriptions.`}
        confirmText="Unarchive Plan"
        cancelText="Cancel"
        variant="primary"
        loading={unarchiving}
      />
    </div>
  );
}
