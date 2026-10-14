import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Users,
  User,
  Shield,
  Building2,
  Network,
  ShieldCheck,
  Briefcase,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";
import {
  normalizeEmployees,
  ROLE_BADGE_STYLES,
} from "../components/orgTreeUtils";

/**
 * HrDashboard
 * Practical HR & Workforce Overview.
 * Displays company headcount, departmental squad staffing, regional offices,
 * operational attention items, and recent employee directory access.
 */
export default function HrDashboard() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. DATA HYDRATION
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersData, branchesData, teamsData, rolesData, projectsData] = await Promise.all([
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
        apiClient("/projects").catch((err) => {
          console.warn("[HrDashboard] Failed to fetch projects:", err.message);
          return [];
        }),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setProjects(
        Array.isArray(projectsData)
          ? projectsData
          : projectsData?.data || []
      );
    } catch (err) {
      console.error("[HrDashboard] Failed to load dashboard data:", err);
      setError(err.message || "Failed to load HR data from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 2. WORKFORCE NORMALIZATION
  const normalizedEmployees = useMemo(() => {
    return normalizeEmployees(users, teams);
  }, [users, teams]);

  // 3. OPERATIONAL METRICS

  // Workforce Headcount
  const workforce = useMemo(() => {
    const total = normalizedEmployees.length;
    const active = normalizedEmployees.filter((e) => e.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [normalizedEmployees]);

  // Attention Items / Operational Health Checks
  const attentionItems = useMemo(() => {
    const items = [];

    // 1. Unassigned personnel (individual contributors needing squad placement)
    const unassignedContributors = normalizedEmployees.filter(
      (e) => !e.teamName && (e.rank >= 3 || e.roleSlug === "team_member")
    );
    if (unassignedContributors.length > 0) {
      items.push({
        id: "unassigned",
        type: "warning",
        title: `${unassignedContributors.length} ${
          unassignedContributors.length === 1 ? "team member" : "team members"
        } unassigned to a squad`,
        description: "Assign members to functional squads in the Squads Directory roster.",
        actionPath: `${PATHS.HR.TEAMS}?view=table`,
        actionLabel: "Manage Squads",
      });
    }

    // 2. Squads without designated leads
    const squadsWithoutLead = teams.filter((t) => {
      const members = t.teamMembers || [];
      const hasLead = members.some(
        (m) =>
          m.role?.toLowerCase() === "lead" ||
          m.roleInTeam?.toLowerCase() === "lead" ||
          m.user?.roleAssignments?.[0]?.role?.name === "team_lead" ||
          m.user?.roleAssignments?.[0]?.role?.name === "team_leader"
      );
      return !hasLead && members.length > 0;
    });

    if (squadsWithoutLead.length > 0) {
      items.push({
        id: "missing-leads",
        type: "warning",
        title: `${squadsWithoutLead.length} ${squadsWithoutLead.length === 1 ? "squad has" : "squads have"} no designated Team Lead`,
        description: `Needs leadership: ${squadsWithoutLead.map((s) => s.name).slice(0, 2).join(", ")}${squadsWithoutLead.length > 2 ? "..." : ""}`,
        actionPath: `${PATHS.HR.TEAMS}?view=table`,
        actionLabel: "Designate Leads",
      });
    }

    // 3. Deactivated accounts
    if (workforce.inactive > 0) {
      items.push({
        id: "inactive",
        type: "info",
        title: `${workforce.inactive} deactivated employee ${workforce.inactive === 1 ? "account" : "accounts"}`,
        description: "Review deactivated profiles or reactivate if required.",
        actionPath: PATHS.HR.USERS,
        actionLabel: "Review Directory",
      });
    }

    return items;
  }, [normalizedEmployees, teams, workforce]);

  // Squad Staffing Breakdown
  const squadOverview = useMemo(() => {
    return teams.map((team) => {
      const members = team.teamMembers || [];
      const leadMember = members.find(
        (m) =>
          m.role?.toLowerCase() === "lead" ||
          m.roleInTeam?.toLowerCase() === "lead" ||
          m.user?.roleAssignments?.[0]?.role?.name === "team_lead" ||
          m.user?.roleAssignments?.[0]?.role?.name === "team_leader"
      );
      const leadName = leadMember?.user?.fullName || null;
      const projectCount = team.projects?.length || 0;

      return {
        id: team.id,
        name: team.name,
        branchName: team.branch?.name || "Corporate",
        memberCount: members.length,
        leadName,
        projectCount,
      };
    });
  }, [teams]);

  // Branch Headcount Breakdown
  const branchOverview = useMemo(() => {
    if (!branches.length || !normalizedEmployees.length) return [];
    return branches
      .map((b) => {
        const count = normalizedEmployees.filter(
          (e) => e.branchId === b.id || e.branchName === b.name
        ).length;
        const pct =
          normalizedEmployees.length > 0
            ? Math.round((count / normalizedEmployees.length) * 100)
            : 0;
        const squadCount = teams.filter((t) => t.branchId === b.id).length;
        return {
          id: b.id,
          name: b.name,
          code: b.code || "HUB",
          count,
          pct,
          squadCount,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [branches, normalizedEmployees, teams]);

  // Recent Employees Columns
  const recentUserColumns = [
    {
      header: "Employee",
      accessor: "name",
      className: "w-[24%]",
      render: (row) => (
        <div className="py-0.5">
          <Link
            to={PATHS.HR.USER_DETAIL.replace(":id", row.id)}
            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block text-[13.5px] leading-snug whitespace-nowrap"
          >
            {row.name}
          </Link>
          <div className="text-[11.5px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">{row.email}</div>
        </div>
      ),
    },
    {
      header: "Job Title",
      className: "w-[16%]",
      render: (row) => (
        <span className="text-[13px] font-medium text-slate-700 whitespace-nowrap">
          {row.jobTitle}
        </span>
      ),
    },
    {
      header: "Role",
      className: "w-[14%]",
      render: (row) => {
        const isElevated = ["company_owner", "system_admin", "superuser", "access_governance", "hr_manager"].includes(row.roleSlug);

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
              isElevated ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            {row.roleLevel || "Member"}
          </span>
        );
      },
    },
    {
      header: "Squad",
      className: "w-[16%]",
      render: (row) => {
        if (row.teamName) {
          return (
            <Link
              to={`${PATHS.HR.TEAMS}?view=table`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800 hover:text-blue-600 transition-colors whitespace-nowrap"
              title="View Squad in Squads Directory"
            >
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{row.teamName}</span>
            </Link>
          );
        }
        return (
          <Link
            to={`${PATHS.HR.TEAMS}?view=table`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-medium border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors whitespace-nowrap"
            title="Click to assign to a delivery squad"
          >
            + Assign Squad
          </Link>
        );
      },
    },
    {
      header: "Branch",
      className: "w-[16%]",
      render: (row) => {
        if (row.branchName) {
          return (
            <Link
              to={PATHS.HR.BRANCHES}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800 hover:text-blue-600 transition-colors whitespace-nowrap"
              title="View Regional Branches"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{row.branchName}</span>
            </Link>
          );
        }
        return (
          <Link
            to={PATHS.HR.BRANCHES}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-medium border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors whitespace-nowrap"
            title="Click to assign to a branch office"
          >
            + Assign Branch
          </Link>
        );
      },
    },
    {
      header: "Reports To",
      className: "w-[14%]",
      render: (row) => {
        if (!row.managerId) {
          return (
            <span className="text-xs text-slate-400 font-medium italic whitespace-nowrap">
              Executive / Board
            </span>
          );
        }
        const manager = normalizedEmployees.find((e) => e.id === row.managerId);
        if (!manager) {
          return <span className="text-xs text-slate-400 whitespace-nowrap">Designated Lead</span>;
        }
        return (
          <Link
            to={PATHS.HR.USER_DETAIL.replace(":id", manager.id)}
            className="text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors whitespace-nowrap"
          >
            {manager.name}
          </Link>
        );
      },
    },
    {
      header: "Status",
      className: "w-[75px] text-center",
      align: "center",
      render: (row) => (
        <Badge
          variant={row.isActive ? "active" : "inactive"}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-12">
        <Loader className="mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading workforce overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Workforce Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Company headcount, functional squad staffing, and regional office locations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => fetchDashboardData()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(PATHS.HR.USERS)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Onboard Employee
          </Button>
        </div>
      </div>

      {/* Error Fallback Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => fetchDashboardData()}>
            Retry
          </Button>
        </div>
      )}

      {/* 4 Core Workforce KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={workforce.total}
          hint={`${workforce.active} active personnel, ${workforce.inactive} inactive`}
          icon={Users}
        />
        <StatCard
          label="Functional Squads"
          value={teams.length}
          hint={`Operating across ${branches.length} branches`}
          icon={Network}
        />
        <StatCard
          label="Branch Offices"
          value={branches.length}
          hint="Regional office locations"
          icon={Building2}
        />
        <StatCard
          label="Defined Roles"
          value={roles.length}
          hint="System & custom role tiers"
          icon={ShieldCheck}
        />
      </div>

      {/* Operational Health & Action Items */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Operational Status
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              • Team assignments & account checks
            </span>
          </div>
          {attentionItems.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              All records up to date
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {attentionItems.length} {attentionItems.length === 1 ? "item requires attention" : "items require attention"}
            </span>
          )}
        </div>

        {attentionItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">
            All personnel have designated reporting lines, all active squads have assigned leads, and accounts are in healthy status.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-amber-200/70 bg-amber-50/40 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {item.description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(item.actionPath)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 inline-flex items-center gap-1 mt-0.5"
                >
                  {item.actionLabel} &rarr;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workforce Breakdown: Squads and Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Squad Staffing Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Squad Staffing
                </h2>
                <p className="text-[11px] text-slate-500">
                  Personnel distribution across delivery teams
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(PATHS.HR.TEAMS)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Manage Squads &rarr;
              </button>
            </div>

            {squadOverview.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No teams or squads created yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {squadOverview.slice(0, 5).map((squad) => (
                  <div
                    key={squad.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900">
                        {squad.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Lead: {squad.leadName || <span className="text-amber-600">Unassigned</span>} • {squad.branchName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                        {squad.memberCount} {squad.memberCount === 1 ? "member" : "members"}
                      </span>
                      {squad.projectCount > 0 && (
                        <span className="text-[11px] text-slate-500">
                          {squad.projectCount} {squad.projectCount === 1 ? "proj" : "projs"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Branch Offices & Regional Headcount */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Branch Offices
                </h2>
                <p className="text-[11px] text-slate-500">
                  Headcount distribution by regional location
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(PATHS.HR.BRANCHES)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Manage Branches &rarr;
              </button>
            </div>

            {branchOverview.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No branch offices registered yet.
              </div>
            ) : (
              <div className="space-y-3.5">
                {branchOverview.map((branch) => (
                  <div key={branch.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {branch.name}
                        <span className="ml-1.5 font-mono text-[10px] text-slate-400 font-normal">
                          ({branch.code})
                        </span>
                      </span>
                      <span className="font-medium text-slate-600">
                        {branch.count} {branch.count === 1 ? "employee" : "employees"} ({branch.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(branch.pct, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">
              Employee Directory Roster
            </h2>
            <p className="text-xs text-slate-500">
              Company personnel records, job titles, and reporting structures
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(PATHS.HR.USERS)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            View Full Directory ({normalizedEmployees.length}) &rarr;
          </button>
        </div>

        {normalizedEmployees.length === 0 ? (
          <EmptyState
            preset="inbox"
            message="No Employees Registered"
            description="The company employee directory has not been populated yet."
          />
        ) : (
          <Table
            columns={recentUserColumns}
            data={normalizedEmployees.slice(0, 7)}
            emptyMessage="No personnel records found."
            borderless
            noSlider
          />
        )}
      </div>
    </div>
  );
}
