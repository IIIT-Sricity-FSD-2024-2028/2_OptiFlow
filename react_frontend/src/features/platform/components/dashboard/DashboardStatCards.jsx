import { Building2, CreditCard, Clock, AlertTriangle, AlertCircle, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../../../shared/components/StatCard';
import { PATHS } from '../../../../app/paths';

export function DashboardStatCards({ metrics, loading }) {
  const navigate = useNavigate();
  const counts = metrics.companyCounts || {};
  const subCounts = metrics.subscriptionCounts || {};

  const totalCompaniesSubtitle = counts.total > 0 ? (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
      <span className="text-emerald-600 font-bold">{counts.active || 0} active</span>
      <span>•</span>
      <span className="text-amber-600 font-bold">{counts.suspended || 0} suspended</span>
      <span>•</span>
      <span className="text-slate-400">{counts.closed || 0} closed</span>
    </div>
  ) : 'Registered tenant organizations';

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <StatCard
          title="Total Companies"
          value={counts.total ?? metrics.totalCompanies ?? 0}
          subtitle={totalCompaniesSubtitle}
          icon={<Building2 className="w-4 h-4 text-slate-500" />}
          loading={loading}
          onClick={() => navigate(PATHS.PLATFORM.COMPANIES)}
        />

        <StatCard
          title="Active Subscriptions"
          value={subCounts.active ?? 0}
          subtitle="Active paying tier plans"
          icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
          loading={loading}
          onClick={() => navigate(`${PATHS.PLATFORM.SUBSCRIPTIONS}?status=Active`)}
        />

        <StatCard
          title="Trialing"
          value={subCounts.trialing ?? 0}
          subtitle="In onboarding trial period"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          loading={loading}
          onClick={() => navigate(`${PATHS.PLATFORM.SUBSCRIPTIONS}?status=Trialing`)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <StatCard
          title="Past Due"
          value={subCounts.pastDue ?? 0}
          subtitle="Unpaid billing periods"
          icon={<AlertTriangle className={`w-4 h-4 ${subCounts.pastDue > 0 ? 'text-amber-600' : 'text-slate-400'}`} />}
          loading={loading}
          warning={subCounts.pastDue > 0}
          onClick={() => navigate(`${PATHS.PLATFORM.SUBSCRIPTIONS}?quick=pastDue`)}
        />

        <StatCard
          title="Expiring Soon"
          value={subCounts.expiringSoon ?? 0}
          subtitle="Ends within next 7 days"
          icon={<AlertCircle className={`w-4 h-4 ${subCounts.expiringSoon > 0 ? 'text-indigo-600' : 'text-slate-400'}`} />}
          loading={loading}
          onClick={() => navigate(`${PATHS.PLATFORM.SUBSCRIPTIONS}?quick=expiring30`)}
        />

        <StatCard
          title="New Companies"
          value={counts.newLast30Days ?? 0}
          subtitle="Onboarded in last 30 days"
          icon={<PlusCircle className="w-4 h-4 text-indigo-500" />}
          loading={loading}
          onClick={() => navigate(PATHS.PLATFORM.COMPANIES)}
        />
      </div>
    </div>
  );
}

