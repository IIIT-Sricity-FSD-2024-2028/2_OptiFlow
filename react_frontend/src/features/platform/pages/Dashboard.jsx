import { useState, useEffect, useCallback } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { apiClient } from "../../../services/api/client";
import { DashboardStatCards } from "../components/dashboard/DashboardStatCards";
import { DashboardNeedsAttention } from "../components/dashboard/DashboardNeedsAttention";
import { DashboardPlanDistribution } from "../components/dashboard/DashboardPlanDistribution";
import { DashboardRecentActivity } from "../components/dashboard/DashboardRecentActivity";
import { DashboardRecentCompanies } from "../components/dashboard/DashboardRecentCompanies";

export default function PlatformDashboard() {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient("/api/platform/metrics");
      setMetrics(res || {});
    } catch (err) {
      console.error("Failed to load platform dashboard metrics:", err);
      setError(err.message || "Failed to load platform metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Platform Health & Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System overview of tenant onboarding, subscription lifecycle, and
            audit logs.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchMetrics}
            className="font-bold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Stat Cards (Top Row) */}
      <DashboardStatCards metrics={metrics} loading={loading} />

      {/* 2. Needs Attention Panel */}
      <DashboardNeedsAttention
        needsAttention={metrics.needsAttention}
        loading={loading}
      />

      {/* 3. Operational Breakdown Grid: Plan Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardPlanDistribution
          plans={metrics.planDistribution || []}
          loading={loading}
        />
        <DashboardRecentCompanies
          companies={metrics.recentCompanies || []}
          loading={loading}
        />
      </div>

      {/* 4. Recent Platform Audit Activity */}
      <DashboardRecentActivity
        activity={metrics.recentActivity || []}
        loading={loading}
      />
    </div>
  );
}
