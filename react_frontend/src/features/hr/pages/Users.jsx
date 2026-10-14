import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import { PATHS } from "../../../app/paths";
import { StatCard } from "../../../shared/components/StatCard";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { Loader } from "../../../shared/components/Loader";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Table } from "../../../shared/components/Table";
import { Modal } from "../../../shared/components/Modal";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { FormField, Input, Select } from "../../../shared/components/FormField";
import { Pagination } from "../../../shared/components/Pagination";
import { formatDate } from "../../../shared/utils/formatDate";
import {
  Users,
  User,
  UserX,
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Globe,
  KeyRound,
  RefreshCw,
  Ban,
} from "lucide-react";
import {
  resolveFunctionalTitle,
  ROLE_LEVEL_LABELS,
  ROLE_BADGE_STYLES,
} from "../components/orgTreeUtils";

const PAGE_SIZE = 10;

/**
 * HrUsers (Users & Access Hub)
 * Unified workforce administration center combining:
 * 1. Personnel Directory (Employee records, job titles, reporting hierarchy, and account lifecycle)
 * 2. Role & Access Bindings (RBAC permissions, company/branch governance scopes, and grant/revoke actions)
 */
export default function HrUsers() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Active Tab: "directory" (Personnel Directory) or "access" (Role & Access Bindings)
  const initialTab = searchParams.get("tab") === "access" ? "access" : "directory";
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "access" ? { tab: "access" } : {});
    setCurrentPage(1);
  };

  // Core Data
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [managerUserId, setManagerUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Deactivate User Confirm Dialog
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Assign Role Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");
  const [assignScopeType, setAssignScopeType] = useState("Company");
  const [assignBranchId, setAssignBranchId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Revoke Role Confirm Dialog
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const canManage = [
    "company_owner",
    "system_admin",
    "superuser",
    "hr_manager",
  ].includes(currentUser?.role);

  // 1. DATA HYDRATION
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersData, rolesData, branchesData, assignmentsData] = await Promise.all([
        apiClient("/users").catch((err) => {
          console.warn("[HrUsers] Failed to fetch users:", err.message);
          return [];
        }),
        apiClient("/roles").catch((err) => {
          console.warn("[HrUsers] Failed to fetch roles:", err.message);
          return [];
        }),
        apiClient("/branches").catch((err) => {
          console.warn("[HrUsers] Failed to fetch branches:", err.message);
          return [];
        }),
        apiClient("/role-assignments").catch((err) => {
          console.warn("[HrUsers] Failed to fetch role assignments:", err.message);
          return [];
        }),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (err) {
      console.error("[HrUsers] Hydration failure:", err);
      setError(err.message || "Failed to load directory telemetry from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, scopeFilter, activeTab]);

  // 2. DERIVED DATA FOR PERSONNEL DIRECTORY
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        u.fullName?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive !== false) ||
        (statusFilter === "inactive" && u.isActive === false);

      const matchesRole =
        roleFilter === "all" ||
        u.roleAssignments?.some(
          (ra) => ra.role?.id === roleFilter || ra.role?.label === roleFilter
        );

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  const directoryMetrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const inactive = total - active;
    const distinctRoles = new Set(
      users.flatMap((u) => (u.roleAssignments || []).map((ra) => ra.role?.label)).filter(Boolean)
    ).size;
    return { total, active, inactive, distinctRoles };
  }, [users]);

  // 3. DERIVED DATA FOR ROLE & ACCESS BINDINGS
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      const userName = item.user?.fullName?.toLowerCase() || "";
      const userEmail = item.user?.email?.toLowerCase() || "";
      const roleLabel = item.role?.label?.toLowerCase() || "";

      const matchesSearch =
        !query ||
        userName.includes(query) ||
        userEmail.includes(query) ||
        roleLabel.includes(query);

      const matchesRole = roleFilter === "all" || item.roleId === roleFilter;
      const matchesScope = scopeFilter === "all" || item.scopeType === scopeFilter;

      return matchesSearch && matchesRole && matchesScope;
    });
  }, [assignments, searchQuery, roleFilter, scopeFilter]);

  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssignments.slice(start, start + PAGE_SIZE);
  }, [filteredAssignments, currentPage]);

  const accessMetrics = useMemo(() => {
    const total = assignments.length;
    const companyScoped = assignments.filter((a) => a.scopeType === "Company").length;
    const branchScoped = assignments.filter((a) => a.scopeType === "Branch").length;
    const elevated = assignments.filter((a) => {
      const label = a.role?.label?.toLowerCase() || "";
      return (
        label.includes("owner") ||
        label.includes("admin") ||
        label.includes("compliance")
      );
    }).length;
    return { total, companyScoped, branchScoped, elevated };
  }, [assignments]);

  // 4. HANDLERS

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setFormError("Full name, email address, and temporary password are required.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmittingUser(true);
    setFormError("");

    try {
      await apiClient("/users", {
        method: "POST",
        body: {
          fullName: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          jobTitle: jobTitle.trim() || undefined,
          managerUserId: managerUserId || undefined,
          role: selectedRole || undefined,
        },
      });

      toast.success(`Employee "${trimmedName}" onboarded successfully!`);
      setIsCreateModalOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setJobTitle("");
      setManagerUserId("");
      setSelectedRole("");
      await fetchData();
    } catch (err) {
      console.error("[HrUsers] User creation failed:", err);
      setFormError(err.message || "Failed to onboard employee.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Toggle Deactivate User
  const handleToggleDeactivate = async () => {
    if (!deactivateTarget) return;

    setIsDeactivating(true);
    const willDeactivate = deactivateTarget.isActive !== false;

    try {
      if (willDeactivate) {
        await apiClient(`/users/${deactivateTarget.id}`, { method: "DELETE" });
        toast.success(`Employee account "${deactivateTarget.fullName}" deactivated.`);
      } else {
        try {
          await apiClient(`/users/${deactivateTarget.id}/reactivate`, { method: "PATCH" });
        } catch (patchErr) {
          // Graceful fallback to PATCH /users/:id with isActive: true
          await apiClient(`/users/${deactivateTarget.id}`, {
            method: "PATCH",
            body: { isActive: true },
          });
        }
        toast.success(`Employee account "${deactivateTarget.fullName}" reactivated.`);
      }

      setDeactivateTarget(null);
      await fetchData();
    } catch (err) {
      console.error("[HrUsers] Status mutation failed:", err);
      toast.error(err.message || "Failed to update employee account status.");
    } finally {
      setIsDeactivating(false);
    }
  };

  // Assign Role
  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!assignUserId) {
      setAssignError("Please select an employee.");
      return;
    }
    if (!assignRoleId) {
      setAssignError("Please select a role to assign.");
      return;
    }
    if (assignScopeType === "Branch" && !assignBranchId) {
      setAssignError("Please select a regional branch for this scoped assignment.");
      return;
    }

    setIsAssigning(true);
    setAssignError("");

    try {
      const scopeId =
        assignScopeType === "Branch" ? assignBranchId : currentUser?.companyId;

      await apiClient("/role-assignments", {
        method: "POST",
        body: {
          userId: assignUserId,
          roleId: assignRoleId,
          scopeType: assignScopeType,
          scopeId,
        },
      });

      toast.success("Role assignment successfully granted!");
      setIsAssignModalOpen(false);
      setAssignUserId("");
      setAssignRoleId("");
      setAssignScopeType("Company");
      setAssignBranchId("");
      await fetchData();
    } catch (err) {
      console.error("[HrUsers] Role assignment failed:", err);
      setAssignError(err.message || "Failed to assign role.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Revoke Role
  const handleRevokeRole = async () => {
    if (!revokeTarget) return;

    setIsRevoking(true);
    try {
      await apiClient(`/role-assignments/${revokeTarget.id}`, { method: "DELETE" });
      toast.success(
        `Role "${revokeTarget.role?.label || "Role"}" revoked from ${
          revokeTarget.user?.fullName || "user"
        }.`
      );
      setRevokeTarget(null);
      await fetchData();
    } catch (err) {
      console.error("[HrUsers] Role revoke failed:", err);
      toast.error(err.message || "Failed to revoke role assignment.");
    } finally {
      setIsRevoking(false);
    }
  };

  // 5. TABLE COLUMNS DEFINITIONS

  // Directory Columns
  const directoryColumns = [
    {
      header: "Employee",
      accessor: "fullName",
      className: "w-[23%]",
      render: (row) => (
        <div className="py-0.5">
          <Link
            to={PATHS.HR.USER_DETAIL.replace(":id", row.id)}
            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block text-[13.5px] leading-snug whitespace-nowrap"
          >
            {row.fullName}
          </Link>
          <span className="text-[11.5px] text-slate-400 font-mono block mt-0.5 whitespace-nowrap">{row.email}</span>
        </div>
      ),
    },
    {
      header: "Job Title",
      className: "w-[15%]",
      render: (row) => {
        const roleSlug = row.roleAssignments?.[0]?.role?.name || row.role || "team_member";
        const teamName = row.teamMembers?.[0]?.team?.name || null;
        const resolvedTitle = resolveFunctionalTitle(row, roleSlug, teamName);

        return (
          <span className="text-[13px] font-medium text-slate-700 whitespace-nowrap">
            {resolvedTitle}
          </span>
        );
      },
    },
    {
      header: "Primary Role",
      className: "w-[13%]",
      render: (row) => {
        const primaryRole = row.roleAssignments?.[0]?.role;
        const rawRole = primaryRole?.name || row.role || "team_member";
        const roleSlug = rawRole.toLowerCase().replace(/[\s-]+/g, "_");
        const roleLabel = primaryRole?.label || ROLE_LEVEL_LABELS[roleSlug] || "Team Member";
        const isElevated = ["company_owner", "system_admin", "superuser", "access_governance", "hr_manager"].includes(roleSlug);

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
              isElevated
                ? "bg-indigo-50 text-indigo-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {roleLabel}
          </span>
        );
      },
    },
    {
      header: "Squad",
      className: "w-[15%]",
      render: (row) => {
        const teamsList = row.teamMembers || [];

        if (teamsList.length > 0) {
          return (
            <Link
              to={`${PATHS.HR.TEAMS}?view=table`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800 hover:text-blue-600 transition-colors whitespace-nowrap"
              title="View Squad in Squads Directory"
            >
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{teamsList.map((tm) => tm.team?.name).filter(Boolean).join(", ")}</span>
            </Link>
          );
        }

        return (
          <Link
            to={`${PATHS.HR.TEAMS}?view=table`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-medium border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors whitespace-nowrap"
            title="Click to assign employee to a delivery squad"
          >
            + Assign Squad
          </Link>
        );
      },
    },
    {
      header: "Branch",
      className: "w-[14%]",
      render: (row) => {
        const teamsList = row.teamMembers || [];
        const branchName = row.branch?.name || teamsList[0]?.team?.branch?.name;

        if (branchName) {
          return (
            <Link
              to={PATHS.HR.BRANCHES}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800 hover:text-blue-600 transition-colors whitespace-nowrap"
              title="View Regional Branches"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{branchName}</span>
            </Link>
          );
        }

        return (
          <Link
            to={PATHS.HR.BRANCHES}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-medium border border-dashed border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors whitespace-nowrap"
            title="Click to assign employee to an office branch"
          >
            + Assign Branch
          </Link>
        );
      },
    },
    {
      header: "Reports To",
      className: "w-[13%]",
      render: (row) => {
        if (!row.manager && !row.managerUserId) {
          return <span className="text-xs text-slate-400 italic whitespace-nowrap">Executive / Direct</span>;
        }
        return (
          <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
            {row.manager?.fullName || "Designated Lead"}
          </span>
        );
      },
    },
    {
      header: "Status",
      className: "w-[75px] text-center",
      align: "center",
      render: (row) => (
        <Badge
          variant={row.isActive !== false ? "active" : "inactive"}
        >
          {row.isActive !== false ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      className: "w-[50px] text-center",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {canManage && row.id !== currentUser?.id && (
            row.isActive !== false ? (
              <button
                type="button"
                onClick={() => setDeactivateTarget(row)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Deactivate Account"
              >
                <Ban className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDeactivateTarget(row)}
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                title="Activate Account"
              >
                <UserCheck className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      ),
    },
  ];

  // Role & Access Bindings Columns
  const accessColumns = [
    {
      header: "User",
      className: "w-[25%]",
      render: (row) => (
        <div className="py-0.5">
          <Link
            to={PATHS.HR.USER_DETAIL.replace(":id", row.userId)}
            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block text-[13.5px] leading-snug whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            {row.user?.fullName || "Unknown User"}
          </Link>
          <span className="text-[11.5px] text-slate-400 font-mono block mt-0.5 whitespace-nowrap">{row.user?.email}</span>
        </div>
      ),
    },
    {
      header: "Assigned Role",
      className: "w-[18%]",
      render: (row) => {
        const roleSlug = row.role?.name?.toLowerCase().replace(/[\s-]+/g, "_") || "team_member";
        const isElevated = ["company_owner", "system_admin", "superuser", "access_governance", "hr_manager"].includes(roleSlug);

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
              isElevated ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            {row.role?.label || row.role?.name || "Role"}
          </span>
        );
      },
    },
    {
      header: "Governance Scope",
      className: "w-[22%]",
      render: (row) => {
        const isBranch = row.scopeType === "Branch";
        const branchMatch = isBranch
          ? branches.find((b) => b.id === row.scopeId)?.name || "Branch Scope"
          : null;

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {isBranch ? (
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[13px] font-medium text-slate-800">
              {isBranch ? `Branch (${branchMatch || "Regional"})` : "Company-Wide"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Granted By",
      className: "w-[18%]",
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
          {row.grantedByUser?.fullName || "System Provisioning"}
        </span>
      ),
    },
    {
      header: "Granted Date",
      className: "w-[12%]",
      render: (row) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {row.grantedAt ? formatDate(row.grantedAt) : "—"}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            header: "Actions",
            key: "actions",
            className: "w-[50px] text-center",
            align: "center",
            render: (row) => (
              <div className="flex items-center justify-center opacity-75 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setRevokeTarget(row)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  title="Revoke Role Assignment"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (loading) {
    return <Loader fullScreen={false} message="Loading company personnel and access telemetry..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Users & Access
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Company employee directory, reporting hierarchy, and scoped role permissions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          {canManage && (
            activeTab === "directory" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setJobTitle("");
                  setManagerUserId("");
                  setSelectedRole(roles[0]?.label || "");
                  setFormError("");
                  setIsCreateModalOpen(true);
                }}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Onboard Employee
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAssignUserId(users[0]?.id || "");
                  setAssignRoleId(roles[0]?.id || "");
                  setAssignScopeType("Company");
                  setAssignBranchId(branches[0]?.id || "");
                  setAssignError("");
                  setIsAssignModalOpen(true);
                }}
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Assign Role
              </Button>
            )
          )}
        </div>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* Tab Navigation: Directory vs Access Bindings */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleTabChange("directory")}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 mr-6 transition-colors ${
            activeTab === "directory"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Personnel Directory ({users.length})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("access")}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "access"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Role & Access Bindings ({assignments.length})
        </button>
      </div>

      {/* TAB 1: PERSONNEL DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-5">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Employees"
              value={directoryMetrics.total}
              hint="Enrolled personnel"
              icon={Users}
            />
            <StatCard
              label="Active Accounts"
              value={directoryMetrics.active}
              hint="Operational access active"
              icon={UserCheck}
            />
            <StatCard
              label="Inactive Accounts"
              value={directoryMetrics.inactive}
              hint="Deactivated accounts"
              icon={Building2}
            />
            <StatCard
              label="Distinct Roles"
              value={directoryMetrics.distinctRoles}
              hint="Tiers assigned across staff"
              icon={ShieldCheck}
            />
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search by name, email, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Role:
                </span>
                <select
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Status:
                </span>
                <select
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {paginatedUsers.length === 0 ? (
            <EmptyState
              preset="search"
              message="No Employees Found"
              description="No personnel records match your active search or filter criteria."
            />
          ) : (
            <div className="space-y-4">
              <Table
                columns={directoryColumns}
                data={paginatedUsers}
                emptyMessage="No personnel records match active filters."
                noSlider
              />

              <Pagination
                currentPage={currentPage}
                totalItems={filteredUsers.length}
                pageSize={PAGE_SIZE}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROLE & ACCESS BINDINGS */}
      {activeTab === "access" && (
        <div className="space-y-5">
          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Bindings"
              value={accessMetrics.total}
              hint="Active role assignments"
              icon={KeyRound}
            />
            <StatCard
              label="Company-wide"
              value={accessMetrics.companyScoped}
              hint="Tenant-level governance"
              icon={ShieldCheck}
            />
            <StatCard
              label="Branch-scoped"
              value={accessMetrics.branchScoped}
              hint="Limited to specific office hubs"
              icon={Building2}
            />
            <StatCard
              label="Elevated Privileges"
              value={accessMetrics.elevated}
              hint="Executive, Admin, or Compliance"
              icon={Users}
            />
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search by user or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Role:
                </span>
                <select
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  Scope:
                </span>
                <select
                  className="px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                >
                  <option value="all">All Scopes</option>
                  <option value="Company">Company Scope</option>
                  <option value="Branch">Branch Scope</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {paginatedAssignments.length === 0 ? (
            <EmptyState
              preset="search"
              message="No Role Assignments Found"
              description="No scoped role grants match your active search or filter criteria."
            />
          ) : (
            <div className="space-y-4">
              <Table
                columns={accessColumns}
                data={paginatedAssignments}
                emptyMessage="No role assignment records match active filters."
                noSlider
              />

              <Pagination
                currentPage={currentPage}
                totalItems={filteredAssignments.length}
                pageSize={PAGE_SIZE}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* ── MODALS & DIALOGS ── */}

      {/* Onboard Employee Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Onboard New Employee"
        subtitle="Create an employee profile, assign their initial role, and designate a manager"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}

          <FormField label="Full Name" required>
            <Input
              placeholder="e.g. Sarah Jenkins"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Email Address" required>
            <Input
              type="email"
              placeholder="sarah.jenkins@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Temporary Password" required hint="Minimum 8 characters">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Corporate Job Title">
            <Input
              placeholder="e.g. Senior Backend Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </FormField>

          <FormField label="Reporting Manager">
            <Select
              value={managerUserId}
              onChange={(e) => setManagerUserId(e.target.value)}
            >
              <option value="">No Manager (Executive / Direct to Board)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.jobTitle || u.role || "Member"})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Primary Role">
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Default Member Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmittingUser}
            >
              Onboard Employee
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        title={
          deactivateTarget?.isActive !== false
            ? `Deactivate ${deactivateTarget?.fullName}?`
            : `Reactivate ${deactivateTarget?.fullName}?`
        }
        message={
          deactivateTarget?.isActive !== false
            ? `Are you sure you want to suspend active access for ${deactivateTarget?.fullName}? They will be unable to log in until reactivated.`
            : `Reactivating ${deactivateTarget?.fullName} will restore their access privileges immediately.`
        }
        confirmLabel={
          deactivateTarget?.isActive !== false ? "Deactivate Account" : "Reactivate Account"
        }
        variant={deactivateTarget?.isActive !== false ? "danger" : "primary"}
        loading={isDeactivating}
        onConfirm={handleToggleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      {/* Assign Role Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Role & Scope"
        subtitle="Grant operational role permissions to an employee across Company or Branch scopes"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignRole} className="space-y-4">
          {assignError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {assignError}
            </div>
          )}

          <FormField label="Employee" required>
            <Select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              required
            >
              <option value="">Select Employee...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Role to Assign" required>
            <Select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              required
            >
              <option value="">Select Role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Governance Scope" required>
            <Select
              value={assignScopeType}
              onChange={(e) => setAssignScopeType(e.target.value)}
            >
              <option value="Company">Company (Full Organization)</option>
              <option value="Branch">Regional Branch Hub</option>
            </Select>
          </FormField>

          {assignScopeType === "Branch" && (
            <FormField label="Designated Branch" required>
              <Select
                value={assignBranchId}
                onChange={(e) => setAssignBranchId(e.target.value)}
                required
              >
                <option value="">Select Regional Branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code || "HUB"})
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isAssigning}
            >
              Grant Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Role Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(revokeTarget)}
        title={`Revoke Role: ${revokeTarget?.role?.label || "Role"}?`}
        message={`Are you sure you want to revoke the "${revokeTarget?.role?.label || "Role"}" role from ${revokeTarget?.user?.fullName || "this user"}? They will lose permissions associated with this role.`}
        confirmLabel="Revoke Permission"
        variant="danger"
        loading={isRevoking}
        onConfirm={handleRevokeRole}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}