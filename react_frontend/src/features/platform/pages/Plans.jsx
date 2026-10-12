import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../../services/api/client';
import { Table } from '../../../shared/components/Table';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import styles from './Plans.module.css';

const INITIAL_FORM_STATE = {
  name: '',
  maxUsers: '',
  unlimitedUsers: true,
  maxBranches: '',
  unlimitedBranches: false,
  maxActiveProcessTemplates: '',
  unlimitedTemplates: false,
  maxComplianceRules: '',
  unlimitedRules: false,
  auditLogRetentionDays: 90,
};

export default function PlatformPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Archive ConfirmDialog state
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Unarchive ConfirmDialog state
  const [unarchiveTarget, setUnarchiveTarget] = useState(null);
  const [unarchiving, setUnarchiving] = useState(false);

  // 1. Fetch Plans List
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient('/platform/plans');
      setPlans(Array.isArray(res) ? res : res?.items || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
      setError(err.message || 'Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // 2. Open Create Drawer
  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData(INITIAL_FORM_STATE);
    setFormError(null);
    setIsDrawerOpen(true);
  };

  // 3. Open Edit Drawer
  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormError(null);
    setFormData({
      name: plan.name || '',
      maxUsers: plan.maxUsers !== null && plan.maxUsers !== undefined ? String(plan.maxUsers) : '',
      unlimitedUsers: plan.maxUsers === null,
      maxBranches: plan.maxBranches !== null && plan.maxBranches !== undefined ? String(plan.maxBranches) : '',
      unlimitedBranches: plan.maxBranches === null,
      maxActiveProcessTemplates:
        plan.maxActiveProcessTemplates !== null && plan.maxActiveProcessTemplates !== undefined
          ? String(plan.maxActiveProcessTemplates)
          : '',
      unlimitedTemplates: plan.maxActiveProcessTemplates === null,
      maxComplianceRules:
        plan.maxComplianceRules !== null && plan.maxComplianceRules !== undefined
          ? String(plan.maxComplianceRules)
          : '',
      unlimitedRules: plan.maxComplianceRules === null,
      auditLogRetentionDays: plan.auditLogRetentionDays ?? 90,
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    if (saving) return;
    setIsDrawerOpen(false);
    setEditingPlan(null);
    setFormData(INITIAL_FORM_STATE);
    setFormError(null);
  };

  // 4. Save Plan (Create or Edit)
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Plan name is required');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        name: formData.name.trim(),
        maxUsers: formData.unlimitedUsers ? null : Number(formData.maxUsers || 0),
        maxBranches: formData.unlimitedBranches ? null : Number(formData.maxBranches || 0),
        maxActiveProcessTemplates: formData.unlimitedTemplates
          ? null
          : Number(formData.maxActiveProcessTemplates || 0),
        maxComplianceRules: formData.unlimitedRules
          ? null
          : Number(formData.maxComplianceRules || 0),
        auditLogRetentionDays: Number(formData.auditLogRetentionDays || 90),
      };

      if (editingPlan) {
        await apiClient(`/platform/plans/${editingPlan.id}`, {
          method: 'PATCH',
          body: payload,
        });
      } else {
        await apiClient('/platform/plans', {
          method: 'POST',
          body: payload,
        });
      }

      setIsDrawerOpen(false);
      await fetchPlans();
    } catch (err) {
      console.error('Failed to save plan:', err);
      setFormError(err.message || 'Failed to save plan changes');
    } finally {
      setSaving(false);
    }
  };

  // 5. Open Archive Dialog
  const handleOpenArchive = (plan) => {
    setArchiveTarget(plan);
  };

  const handleCloseArchive = () => {
    if (archiving) return;
    setArchiveTarget(null);
  };

  // 6. Confirm Archive Action
  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;

    try {
      setArchiving(true);
      // Attempt archive action or update isActive flag to false
      await apiClient(`/platform/plans/${archiveTarget.id}`, {
        method: 'PATCH',
        body: { isActive: false },
      });
      setArchiveTarget(null);
      await fetchPlans();
    } catch (err) {
      console.error('Failed to archive plan:', err);
      alert(err.message || 'Failed to archive plan');
    } finally {
      setArchiving(false);
    }
  };

  // 7. Unarchive Handlers
  const handleOpenUnarchive = (plan) => {
    setUnarchiveTarget(plan);
  };

  const handleCloseUnarchive = () => {
    if (unarchiving) return;
    setUnarchiveTarget(null);
  };

  const handleConfirmUnarchive = async () => {
    if (!unarchiveTarget) return;

    try {
      setUnarchiving(true);
      await apiClient(`/platform/plans/${unarchiveTarget.id}`, {
        method: 'PATCH',
        body: { isActive: true },
      });
      setUnarchiveTarget(null);
      await fetchPlans();
    } catch (err) {
      console.error('Failed to unarchive plan:', err);
      alert(err.message || 'Failed to unarchive plan');
    } finally {
      setUnarchiving(false);
    }
  };

  // Table Columns Definition
  const columns = [
    {
      header: 'Plan Name',
      accessor: 'name',
      render: (row) => (
        <div className={styles.planNameWrapper}>
          <div className={styles.planTitleLine}>
            <span className={`${styles.planName} ${!row.isActive ? styles.archivedPlanName : ''}`}>
              {row.name}
            </span>
            {!row.isActive && (
              <span className={styles.archivedBadge}>Archived Plan</span>
            )}
          </div>
          <span className={styles.planId}>ID: {row.id}</span>
        </div>
      ),
    },
    {
      header: 'Active Subscriptions',
      accessor: '_count',
      render: (row) => {
        const count = row._count?.subscriptions ?? 0;
        return (
          <span className={styles.subCountBadge}>
            {count} {count === 1 ? 'company' : 'companies'}
          </span>
        );
      },
    },
    {
      header: 'Max Users',
      accessor: 'maxUsers',
      render: (row) =>
        row.maxUsers === null ? (
          <span className={styles.unlimitedBadge}>Unlimited</span>
        ) : (
          <span>{row.maxUsers.toLocaleString()}</span>
        ),
    },
    {
      header: 'Max Branches',
      accessor: 'maxBranches',
      render: (row) =>
        row.maxBranches === null ? (
          <span className={styles.unlimitedBadge}>Unlimited</span>
        ) : (
          <span>{row.maxBranches}</span>
        ),
    },
    {
      header: 'Process Templates',
      accessor: 'maxActiveProcessTemplates',
      render: (row) =>
        row.maxActiveProcessTemplates === null ? (
          <span className={styles.unlimitedBadge}>Unlimited</span>
        ) : (
          <span>{row.maxActiveProcessTemplates}</span>
        ),
    },
    {
      header: 'Compliance Rules',
      accessor: 'maxComplianceRules',
      render: (row) =>
        row.maxComplianceRules === null ? (
          <span className={styles.unlimitedBadge}>Unlimited</span>
        ) : (
          <span>{row.maxComplianceRules}</span>
        ),
    },
    {
      header: 'Retention',
      accessor: 'auditLogRetentionDays',
      render: (row) => <span>{row.auditLogRetentionDays} days</span>,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className={styles.actionsWrapper}>
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => handleOpenEdit(row)}
          >
            Edit
          </button>
          {row.isActive ? (
            <button
              type="button"
              className={styles.archiveBtn}
              onClick={() => handleOpenArchive(row)}
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              className={styles.unarchiveBtn}
              onClick={() => handleOpenUnarchive(row)}
            >
              Unarchive
            </button>
          )}
        </div>
      ),
    },
  ];

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

      {/* Plans Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <h2 className={styles.sectionTitle}>Available Tiers & Quota Configurations</h2>
          <p className={styles.sectionSubtitle}>
            Null limit fields allow unlimited usage for that specific resource dimension.
          </p>
        </div>

        <Table
          columns={columns}
          data={plans}
          loading={loading}
          emptyMessage="No subscription plans found."
          rowClassName={(row) => (!row.isActive ? styles.archivedRow : '')}
        />
      </div>

      {/* Create / Edit Slide-Over Drawer */}
      {isDrawerOpen && (
        <div className={styles.drawerOverlay} onClick={handleCloseDrawer}>
          <div
            className={styles.drawerContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <h3 className={styles.drawerTitle}>
                {editingPlan ? `Edit Tier: ${editingPlan.name}` : 'Create Subscription Plan'}
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleCloseDrawer}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 65px)' }}>
              <div className={styles.drawerBody}>
                {formError && <div className={styles.errorBanner}>{formError}</div>}

                {/* Plan Name */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Plan Name *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Pro Enterprise"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Max Users */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Users</label>
                  <div className={styles.limitInputRow}>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      placeholder={formData.unlimitedUsers ? 'Unlimited' : 'e.g. 100'}
                      value={formData.unlimitedUsers ? '' : formData.maxUsers}
                      disabled={formData.unlimitedUsers}
                      onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                    />
                    <label className={styles.unlimitedCheckLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.unlimitedUsers}
                        onChange={(e) =>
                          setFormData({ ...formData, unlimitedUsers: e.target.checked })
                        }
                      />
                      Unlimited
                    </label>
                  </div>
                </div>

                {/* Max Branches */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Branches</label>
                  <div className={styles.limitInputRow}>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      placeholder={formData.unlimitedBranches ? 'Unlimited' : 'e.g. 5'}
                      value={formData.unlimitedBranches ? '' : formData.maxBranches}
                      disabled={formData.unlimitedBranches}
                      onChange={(e) => setFormData({ ...formData, maxBranches: e.target.value })}
                    />
                    <label className={styles.unlimitedCheckLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.unlimitedBranches}
                        onChange={(e) =>
                          setFormData({ ...formData, unlimitedBranches: e.target.checked })
                        }
                      />
                      Unlimited
                    </label>
                  </div>
                </div>

                {/* Max Active Process Templates */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Active Process Templates</label>
                  <div className={styles.limitInputRow}>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      placeholder={formData.unlimitedTemplates ? 'Unlimited' : 'e.g. 20'}
                      value={formData.unlimitedTemplates ? '' : formData.maxActiveProcessTemplates}
                      disabled={formData.unlimitedTemplates}
                      onChange={(e) =>
                        setFormData({ ...formData, maxActiveProcessTemplates: e.target.value })
                      }
                    />
                    <label className={styles.unlimitedCheckLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.unlimitedTemplates}
                        onChange={(e) =>
                          setFormData({ ...formData, unlimitedTemplates: e.target.checked })
                        }
                      />
                      Unlimited
                    </label>
                  </div>
                </div>

                {/* Max Compliance Rules */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Max Compliance Rules</label>
                  <div className={styles.limitInputRow}>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      placeholder={formData.unlimitedRules ? 'Unlimited' : 'e.g. 50'}
                      value={formData.unlimitedRules ? '' : formData.maxComplianceRules}
                      disabled={formData.unlimitedRules}
                      onChange={(e) =>
                        setFormData({ ...formData, maxComplianceRules: e.target.value })
                      }
                    />
                    <label className={styles.unlimitedCheckLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.unlimitedRules}
                        onChange={(e) =>
                          setFormData({ ...formData, unlimitedRules: e.target.checked })
                        }
                      />
                      Unlimited
                    </label>
                  </div>
                </div>

                {/* Audit Log Retention */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Audit Log Retention (Days)</label>
                  <input
                    type="number"
                    min="30"
                    className={styles.input}
                    value={formData.auditLogRetentionDays}
                    onChange={(e) =>
                      setFormData({ ...formData, auditLogRetentionDays: e.target.value })
                    }
                    required
                  />
                  <span className={styles.helperText}>Number of days immutable audit rows are retained for tenants.</span>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className={styles.drawerFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCloseDrawer}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog for Archive */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        onCancel={handleCloseArchive}
        onConfirm={handleConfirmArchive}
        title={`Archive Plan: ${archiveTarget?.name || ''}`}
        message={`Are you sure you want to archive this plan? Existing tenants on this tier will continue to operate, but this plan will be blocked from being selected for new tenant subscriptions.`}
        confirmText="Archive Plan"
        cancelText="Cancel"
        variant="danger"
        loading={archiving}
      />

      {/* ConfirmDialog for Unarchive */}
      <ConfirmDialog
        isOpen={Boolean(unarchiveTarget)}
        onCancel={handleCloseUnarchive}
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
