import React from 'react';
import { Table } from '../../../shared/components/Table';
import styles from '../pages/Plans.module.css';

/*
    Props:
    1) plans: array of plan objects
    2) loading: boolean indicating data fetch state
    3) onEdit: - fn that takes in plan to edit
    4) onArchive:
    5) onUnArchive;
*/

export function PlansTable({
  plans,
  loading,
  onEdit,
  onArchive,
  onUnarchive
}) {

  const renderLimit = (value) => {
    if (value === null || value === undefined) {
      return <span className={styles.unlimitedBadge}>Unlimited</span>;
    }
    return <span>{typeof value === 'number' ? value.toLocaleString() : value}</span>;
  };


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
            onClick={() => onEdit(row)}
          >
            Edit
          </button>
          {row.isActive ? (
            <button
              type="button"
              className={styles.archiveBtn}
              onClick={() => onArchive(row)}
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              className={styles.unarchiveBtn}
              onClick={() => onUnarchive(row)}
            >
              Unarchive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div>
        <h2 className={styles.sectionTitle}>Available Tiers and Quota Configurations</h2>
        <p className={styles.sectionSubtitle}>
          Keep Null for unlimited usage of that resource.
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
  )
}