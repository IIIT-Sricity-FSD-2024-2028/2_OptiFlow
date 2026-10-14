import React, { useState } from 'react';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/components/Toast';
import { usePlans } from '../hooks/usePlans';
import { PlansTable } from '../components/PlansTable';
import { PlanDrawer } from '../components/PlanDrawer';
import styles from './Plans.module.css';

export default function PlatformPlans() {
  const toast = useToast();
  const { plans, loading, error, savePlan, setPlanActiveStatus } = usePlans();

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Archive ConfirmDialog state
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Unarchive ConfirmDialog state
  const [unarchiveTarget, setUnarchiveTarget] = useState(null);
  const [unarchiving, setUnarchiving] = useState(false);

  // 2. Open Create Drawer
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setIsDrawerOpen(true);
  };

  // 3. Open Edit Drawer
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
    } 
    catch (err) {
      console.error('Failed to archive plan:', err);
      toast.error(err.message || 'Failed to archive plan');
    } 
    finally {
      setArchiving(false);
    }
  };

  // --- Unarchive Handlers ---
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
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.headerSection}>
          <div>
            <h1 className={styles.title}>Subscription Plans</h1>
            <p className={styles.subtitle}>
              Manage commercial tiers, feature limits, and subscription quotas across tenants.
            </p>
          </div>
          <button
            type="button"
            className={styles.createBtn}
            onClick={handleOpenCreate}
          >
            + Create Plan
          </button>
        </div>
        {/* Global Error Banner */}
        {error && <div className={styles.errorBanner}>{error}</div>}
        {/* Plans Table */}
        <PlansTable
          plans={plans}
          loading={loading}
          onEdit={handleOpenEdit}
          onArchive={(plan) => setArchiveTarget(plan)}
          onUnarchive={(plan) => setUnarchiveTarget(plan)}
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
