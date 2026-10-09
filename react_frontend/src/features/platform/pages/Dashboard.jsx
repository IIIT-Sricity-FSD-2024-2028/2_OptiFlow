import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2,CreditCard,Users,ShieldAlert, Layers, KeyRound, UserCheck} from 'lucide-react';

import { apiClient } from '../../../services/api/client';
import { PATHS } from '../../../app/paths';

//reusable components 
import { StatCard } from '../../../shared/components/StatCard';
import { ShortcutCard } from '../../../shared/components/ShortcutCard';
import { Table } from '../../../shared/components/Table';

//importing styles as separate file
import styles from './Dashboard.module.css';

export default function PlatformDashboard() {
  const [metrics, setMetrics] = useState({
    totalCompanies: 0,
    totalAdmins: 0,
    subscriptionsByPlan: [],
    recentSupportLogs: [],
    recentCompanies: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardMetrics() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient('/platform/metrics');
        setMetrics(data || {});
      } catch (err) {
        console.error('Failed to load platform metrics:', err);
        setError(err.message || 'Failed to fetch platform metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardMetrics();
  }, []);

  // Compute total active subscriptions across plans
  const totalActiveSubscriptions = (metrics.subscriptionsByPlan || []).reduce(
    (acc, item) => acc + (item.count || 0),
    0
  );

  // Table column definition for recent tenant organizations
  const companyColumns = [
    {
      header: 'Company Name',
      accessor: 'legalName',
      render: (row) => (
        <div className={styles.companyInfo}>
          <span className={styles.companyName}>{row.legalName || row.name || 'Unnamed Tenant'}</span>
          <span className={styles.companyId}>ID: {row.id}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const status = row.status || 'Active';
        const badgeClass =
          status === 'Active'
            ? styles.badgeSuccess
            : status === 'Suspended'
            ? styles.badgeWarning
            : styles.badgeNeutral;
        return <span className={badgeClass}>{status}</span>;
      },
    },
    {
      header: 'Active Plan',
      render: (row) => {
        const activeSub = (row.subscriptions || []).find((s) => s.status === 'Active') || (row.subscriptions || [])[0];
        const planName = activeSub?.plan?.name || (activeSub ? 'Subscribed' : 'None');
        return <span className={styles.badgePlan}>{planName}</span>;
      },
    },
    {
      header: 'Total Users',
      render: (row) => row._count?.users ?? (row.users ? row.users.length : '—'),
    },
    {
      header: 'Registered',
      render: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'),
    },
  ];

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Platform Dashboard</h1>
          <p className={styles.subtitle}>System-wide tenant statistics, subscription status, and operator controls</p>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Shortcut cards displaying code using props */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Tenants"
          value={metrics.totalCompanies || 0}
          subtitle="Registered tenant organizations"
          icon={<Building2 size={20} />}
          loading={loading}
        />

        <StatCard
          title="Active Subscriptions"
          value={totalActiveSubscriptions}
          subtitle="Tenants with active tier plan"
          icon={<CreditCard size={20} />}
          loading={loading}
        />

        <StatCard
          title="Active Support Grants"
          value={metrics.recentSupportLogs ? metrics.recentSupportLogs.length : 0}
          subtitle="Recent delegated access audits"
          icon={<ShieldAlert size={20} />}
          loading={loading}
        />

        <StatCard
          title="Platform Admins"
          value={metrics.totalAdmins || 0}
          subtitle="Global staff operators"
          icon={<Users size={20} />}
          loading={loading}
        />
      </div>

      {/* 2. Platform Management Shortcuts */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Platform Management Shortcuts</h2>
            {/* <p className={styles.sectionSubtitle}>Quick navigation to core platform operations</p> */}
          </div>
        </div>

        <div className={styles.shortcutsGrid}>
          <ShortcutCard
            to={PATHS.PLATFORM.COMPANIES}
            title="Tenants Directory"
            description="Manage company accounts"
            icon={<Building2 size={18} />}
          />
          <ShortcutCard
            to={PATHS.PLATFORM.PLANS}
            title="Subscription Plans"
            description="Tier limits & feature rules"
            icon={<Layers size={18} />}
          />
          <ShortcutCard
            to={PATHS.PLATFORM.SUBSCRIPTIONS}
            title="Subscriptions"
            description="Active company tiers"
            icon={<CreditCard size={18} />}
          />
          <ShortcutCard
            to={PATHS.PLATFORM.SUPPORT_ACCESS}
            title="Support Access"
            description="Audit session logs"
            icon={<KeyRound size={18} />}
          />
          <ShortcutCard
            to={PATHS.PLATFORM.ADMIN_USERS}
            title="Admin Staff"
            description="Manage operator users"
            icon={<UserCheck size={18} />}
          />
        </div>
      </div>

      {/* 3. Recent Registered Tenants Overview Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Registered Tenant Organizations</h2>
            {/* <p className={styles.sectionSubtitle}>Recently onboarded companies and their active plan statuses</p> */}
          </div>
          <Link to={PATHS.PLATFORM.COMPANIES} className={styles.viewAllLink}>
            View All Tenants &rarr;
          </Link>
        </div>

        <Table
          columns={companyColumns}
          data={metrics.recentCompanies || []}
          loading={loading}
          emptyMessage="No tenant organizations registered yet."
        />
      </div>
    </div>
  );
}
