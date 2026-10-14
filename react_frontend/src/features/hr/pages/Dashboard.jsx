import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import { PATHS } from "../../../app/paths";
import { StatCard } from "../../../shared/components/StatCard";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { Loader } from "../../../shared/components/Loader";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Table } from "../../../shared/components/Table";
import { formatDate } from "../../../shared/utils/formatDate";

// WHY: HrDashboard serves as the primary operational telemetry hub and navigation
// launchpad for the Company Role Administrator (HR). It aggregates workforce headcounts,
// branch network footprints, functional team pods, and dynamic role architectures into
// scannable KPIs, while offering quick access to deep governance consoles.
export default function HrDashboard() {
  const navigate = useNavigate();

  // Raw datasets loaded from Express backend APIs
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  // Aggregated operational metrics calculated from fetched collections
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    totalBranches: 0,
    totalTeams: 0,
    totalRoles: 0,
    customRoles: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. DATA HYDRATION
  // WHY: Parallel Promise.all avoids network waterfalls against Neon PostgreSQL,
  // ensuring the HR Administrator sees immediate comprehensive workforce telemetry.
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersData, branchesData, teamsData, rolesData] = await Promise.all([
        apiClient("/users").catch((err) => {
          console.warn("[HrDashboard] Failed to fetch users:", err.message);
          return [];
        }),
        apiClient("/branches").catch((err) => {
          console.warn("[HrDashboard] Failed to fetch branches:", err.message);
          return [];
        }),
        apiClient("/teams").catch((err) => {
          console.warn("[HrDashboard] Failed to fetch teams:", err.message);
          return [];
        }),
        apiClient("/roles").catch((err) => {
          console.warn("[HrDashboard] Failed to fetch roles:", err.message);
          return [];
        }),
      ]);

      const loadedUsers = Array.isArray(usersData) ? usersData : [];
      const loadedBranches = Array.isArray(branchesData) ? branchesData : [];
      const loadedTeams = Array.isArray(teamsData) ? teamsData : [];
      const loadedRoles = Array.isArray(rolesData) ? rolesData : [];

      setUsers(loadedUsers);
      setBranches(loadedBranches);

      // Derive workforce and topology statistics
      const totalEmployees = loadedUsers.length;
      const activeEmployees = loadedUsers.filter((u) => u.isActive !== false).length;
      const inactiveEmployees = totalEmployees - activeEmployees;
      const totalBranches = loadedBranches.length;
      const totalTeams = loadedTeams.length;
      const totalRoles = loadedRoles.length;
      const customRoles = loadedRoles.filter((r) => !r.isSystem).length;

      setMetrics({
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        totalBranches,
        totalTeams,
        totalRoles,
        customRoles,
      });
    } catch (err) {
      console.error("[HrDashboard] Critical hydration failure:", err);
      setError(err.message || "Failed to load HR telemetry from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load without synchronous setState in effect body
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const [usersData, branchesData, teamsData, rolesData] = await Promise.all([
          apiClient("/users").catch(() => []),
          apiClient("/branches").catch(() => []),
          apiClient("/teams").catch(() => []),
          apiClient("/roles").catch(() => []),
        ]);

        if (isMounted) {
          const loadedUsers = Array.isArray(usersData) ? usersData : [];
          const loadedBranches = Array.isArray(branchesData) ? branchesData : [];
          const loadedTeams = Array.isArray(teamsData) ? teamsData : [];
          const loadedRoles = Array.isArray(rolesData) ? rolesData : [];

          setUsers(loadedUsers);
          setBranches(loadedBranches);

          const totalEmployees = loadedUsers.length;
          const activeEmployees = loadedUsers.filter((u) => u.isActive !== false).length;
          const inactiveEmployees = totalEmployees - activeEmployees;
          const totalBranches = loadedBranches.length;
          const totalTeams = loadedTeams.length;
          const totalRoles = loadedRoles.length;
          const customRoles = loadedRoles.filter((r) => !r.isSystem).length;

          setMetrics({
            totalEmployees,
            activeEmployees,
            inactiveEmployees,
            totalBranches,
            totalTeams,
            totalRoles,
            customRoles,
          });
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[HrDashboard] Critical hydration failure:", err);
          setError(err.message || "Failed to load HR telemetry from server.");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick launchpad actions for core HR workflows
  const quickActions = [
    {
      title: "Employee Directory",
      description: "Search, filter, onboard, and manage personnel profiles.",
      path: PATHS.HR.USERS,
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      count: `${metrics.totalEmployees} Employees`,
    },
    {
      title: "Regional Branches",
      description: "Setup territorial offices, addresses, and branch boundaries.",
      path: PATHS.HR.BRANCHES,
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      count: `${metrics.totalBranches} Locations`,
    },
    {
      title: "Functional Teams",
      description: "Organize squads, designate Team Leaders, and review structures.",
      path: PATHS.HR.TEAMS,
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      count: `${metrics.totalTeams} Teams`,
    },
    {
      title: "Role Templates",
      description: "Architect permission bundles and manage system/custom roles.",
      path: PATHS.HR.ROLES,
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      count: `${metrics.totalRoles} Roles`,
    },
    {
      title: "Role Assignments",
      description: "Grant and revoke scoped role allocations across branches.",
      path: PATHS.HR.ROLE_ASSIGNMENTS,
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      count: "Access Console",
    },
  ];

  // Table columns for the Recent Employee Roster
  const recentUserColumns = [
    {
      header: "Employee",
      render: (row) => (
        <div className="py-1">
          <div className="font-semibold text-slate-900">{row.fullName}</div>
          <div className="text-xs text-slate-500">{row.email}</div>
        </div>
      ),
    },
    {
      header: "Job Title",
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {row.jobTitle || "Team Member"}
        </span>
      ),
    },
    {
      header: "Primary Role",
      render: (row) => {
        const primaryRole = row.roleAssignments?.[0]?.role?.label || "User";
        return (
          <Badge type="status" value="info">
            {primaryRole}
          </Badge>
        );
      },
    },
    {
      header: "Reporting Line",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.manager?.fullName || "— (Direct)"}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <Badge
          type="status"
          value={row.isActive !== false ? "active" : "neutral"}
          dot={row.isActive !== false}
        >
          {row.isActive !== false ? "Active" : "Deactivated"}
        </Badge>
      ),
    },
    {
      header: "Joined",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.createdAt ? formatDate(row.createdAt) : "—"}
        </span>
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <Link
          to={`/hr/users/${row.id}`}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          View Profile &rarr;
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-12">
        <Loader className="mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading workforce telemetry...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              HR Workforce Command Center
            </h1>
            <Badge type="status" value="active" dot>
              Governance Live
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time workforce demographics, territorial branch topology, and access governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => fetchDashboardData()}>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => navigate(PATHS.HR.USERS)}>
            <span className="inline-flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Manage Employees
            </span>
          </Button>
        </div>
      </div>

      {/* Error Fallback Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => fetchDashboardData()}>
            Retry
          </Button>
        </div>
      )}

      {/* 4 Core Workforce KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Workforce */}
        <StatCard
          label="Total Workforce"
          value={metrics.totalEmployees}
          trend={`+${metrics.activeEmployees}`}
          trendLabel="Active"
          hint={`${metrics.activeEmployees} active, ${metrics.inactiveEmployees} deactivated`}
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        {/* Stat 2: Regional Branches */}
        <StatCard
          label="Regional Branches"
          value={metrics.totalBranches}
          hint="Operational office locations"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        {/* Stat 3: Functional Teams */}
        <StatCard
          label="Functional Teams"
          value={metrics.totalTeams}
          hint="Departmental operational squads"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />

        {/* Stat 4: Role Architect */}
        <StatCard
          label="Role Templates"
          value={metrics.totalRoles}
          hint={`${metrics.customRoles} custom scoped definitions`}
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* Governance & Operations Launchpad */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Governance & Domain Consoles
          </h2>
          <span className="text-xs text-slate-400">Quick Access Workspaces</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.path}
              className="group p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    {action.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                    &rarr;
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {action.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                <span>{action.count}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Employee Roster & Regional Footprint */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Personnel Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Recently Added Personnel</h2>
              <p className="text-xs text-slate-500">Latest employee registrations across all branches</p>
            </div>
            <Link
              to={PATHS.HR.USERS}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              View Full Directory &rarr;
            </Link>
          </div>

          <div className="p-6">
            {users.length === 0 ? (
              <EmptyState
                preset="inbox"
                message="No Employees Registered"
                description="The company employee directory has not been populated yet."
                action={
                  <Button variant="primary" onClick={() => navigate(PATHS.HR.USERS)}>
                    Add First Employee
                  </Button>
                }
              />
            ) : (
              <Table
                columns={recentUserColumns}
                data={users.slice(0, 6)}
                emptyMessage="No personnel records found."
              />
            )}
          </div>
        </div>

        {/* Branch Network Topology Overview (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Branch Topology</h2>
                <p className="text-xs text-slate-500">Active regional hubs</p>
              </div>
              <Link
                to={PATHS.HR.BRANCHES}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Manage &rarr;
              </Link>
            </div>

            <div className="p-6 space-y-4">
              {branches.length === 0 ? (
                <EmptyState
                  preset="search"
                  message="No Branches Found"
                  description="Create company branches to establish territorial operations."
                />
              ) : (
                branches.slice(0, 5).map((branch) => {
                  const branchTeamsCount = Array.isArray(branch.teams) ? branch.teams.length : 0;
                  return (
                    <div
                      key={branch.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{branch.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{branch.code || "BRANCH"}</div>
                      </div>
                      <Badge type="status" value="active">
                        {branchTeamsCount} {branchTeamsCount === 1 ? "Team" : "Teams"}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Configured Teams</span>
              <span className="font-bold text-slate-800">{metrics.totalTeams}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
