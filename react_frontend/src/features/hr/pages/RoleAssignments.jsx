import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
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
  ShieldCheck,
  Building2,
  KeyRound,
  ShieldAlert,
  Plus,
  RotateCw,
  ExternalLink,
} from "lucide-react";

const PAGE_SIZE = 10;

// WHY: HrRoleAssignments provides the scoped access administration console.
// It allows HR Administrators and Platform Admins to bind users to specific operational roles
// across Company-wide or Branch-specific scopes, and promptly revoke elevated permissions.
export default function HrRoleAssignments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const toast = useToast();

  // Core state
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const urlUserParam = searchParams.get("userId");
  const [prevUrlUser, setPrevUrlUser] = useState(urlUserParam);
  const [userFilter, setUserFilter] = useState(urlUserParam || "all");

  // Adjust state during render when URL query parameter changes
  if (urlUserParam !== prevUrlUser) {
    setPrevUrlUser(urlUserParam);
    if (urlUserParam) {
      setUserFilter(urlUserParam);
    }
  }

  // Assign Role Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedScopeType, setSelectedScopeType] = useState("Company");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Revoke Role Confirm Dialog
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // WHY: Zero-Clutter Hard Action Suppression dictates that only HR managers,
  // company owners, and platform administrators see assignment mutation buttons.
  const canManageAssignments = [
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
      const [assignmentsData, usersData, rolesData, branchesData] = await Promise.all([
        apiClient("/role-assignments"),
        apiClient("/users").catch(() => []),
        apiClient("/roles").catch(() => []),
        apiClient("/branches").catch(() => []),
      ]);

      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err) {
      console.error("[HrRoleAssignments] Failed to load assignments telemetry:", err);
      setError(err.message || "Failed to load role assignments from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, scopeFilter, userFilter]);

  // Derived Filtered Role Assignments
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
      const matchesUser = userFilter === "all" || item.userId === userFilter;

      return matchesSearch && matchesRole && matchesScope && matchesUser;
    });
  }, [assignments, searchQuery, roleFilter, scopeFilter, userFilter]);

  const paginatedAssignments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssignments.slice(start, start + PAGE_SIZE);
  }, [filteredAssignments, currentPage]);

  // Derived KPI Telemetry
  const metrics = useMemo(() => {
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

  // 2. ASSIGN ROLE HANDLER
  const handleAssignRole = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setModalError("Please select an employee.");
      return;
    }
    if (!selectedRoleId) {
      setModalError("Please select a role to assign.");
      return;
    }
    if (selectedScopeType === "Branch" && !selectedBranchId) {
      setModalError("Please select a branch for this scoped assignment.");
      return;
    }

    setIsSubmitting(true);
    setModalError("");

    try {
      const scopeId =
        selectedScopeType === "Branch" ? selectedBranchId : currentUser?.companyId;

      await apiClient("/role-assignments", {
        method: "POST",
        body: {
          userId: selectedUserId,
          roleId: selectedRoleId,
          scopeType: selectedScopeType,
          scopeId,
        },
      });

      toast.success("Role assigned successfully!");
      setIsAssignModalOpen(false);
      setSelectedUserId("");
      setSelectedRoleId("");
      setSelectedScopeType("Company");
      setSelectedBranchId("");
      await fetchData();
    } catch (err) {
      console.error("[HrRoleAssignments] Creation failed:", err);
      setModalError(err.message || "Failed to assign role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. REVOKE ROLE HANDLER
  const handleRevokeRole = async () => {
    if (!revokeTarget) return;

    setIsRevoking(true);
    try {
      await apiClient(`/role-assignments/${revokeTarget.id}`, {
        method: "DELETE",
      });

      toast.success(
        `Role "${revokeTarget.role?.label}" revoked from ${revokeTarget.user?.fullName}.`
      );
      setRevokeTarget(null);
      await fetchData();
    } catch (err) {
      console.error("[HrRoleAssignments] Revocation failed:", err);
      toast.error(err.message || "Failed to revoke role assignment.");
    } finally {
      setIsRevoking(false);
    }
  };

  // 4. TABLE COLUMNS CONFIGURATION
  const columns = [
    {
      header: "Employee",
      accessor: "user",
      render: (row) => {
        const initials = row.user?.fullName
          ? row.user.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "U";

        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-semibold text-xs">
              {initials}
            </div>
            <div>
              <Link
                to={PATHS.HR.USER_DETAIL.replace(":id", row.userId)}
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors block leading-tight"
                onClick={(e) => e.stopPropagation()}
              >
                {row.user?.fullName || "Unknown User"}
              </Link>
              <span className="text-xs text-slate-400">{row.user?.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Assigned Role",
      accessor: "role",
      render: (row) => (
        <Badge
          variant="info"
          value={row.role?.label || "Unknown Role"}
        />
      ),
    },
    {
      header: "Governance Scope",
      accessor: "scopeType",
      render: (row) => {
        const branchMatch =
          row.scopeType === "Branch"
            ? branches.find((b) => b.id === row.scopeId)?.name || `Branch (${row.scopeId?.substring(0, 8)}...)`
            : null;

        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={row.scopeType === "Company" ? "active" : "draft"}
              value={row.scopeType || "Company"}
            />
            {branchMatch && (
              <span className="text-xs text-slate-500 font-medium">({branchMatch})</span>
            )}
            <Link
              to={row.scopeType === "Branch" ? `/compliance/bindings?scopeType=Branch&scopeId=${row.scopeId}` : PATHS.COMPLIANCE.BINDINGS}
              className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800"
              title="View compliance rules for this scope"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3 ml-0.5 text-indigo-400" />
            </Link>
          </div>
        );
      },
    },
    {
      header: "Granted By",
      accessor: "grantedByUser",
      render: (row) => (
        <span className="text-sm text-slate-600">
          {row.grantedByUser?.fullName || <span className="text-slate-400">System Provisioning</span>}
        </span>
      ),
    },
    {
      header: "Granted Date",
      accessor: "grantedAt",
      render: (row) => (
        <span className="text-sm text-slate-500">{formatDate(row.grantedAt)}</span>
      ),
    },
    ...(canManageAssignments
      ? [
          {
            header: "Actions",
            key: "actions",
            render: (row) => (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRevokeTarget(row)}
                >
                  Revoke
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (loading) {
    return <Loader fullScreen={false} message="Loading role assignments..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Scoped Role Assignments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorize operational roles, govern scope boundaries, and review access privileges across projects and compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchData}>
            <RotateCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>

          {/* Zero-Clutter Gating: Completely unrendered from React DOM if ungranted */}
          {canManageAssignments && (
            <Button
              variant="primary"
              onClick={() => {
                setSelectedUserId(users[0]?.id || "");
                setSelectedRoleId(roles[0]?.id || "");
                setSelectedScopeType("Company");
                setSelectedBranchId(branches[0]?.id || "");
                setModalError("");
                setIsAssignModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Assign Role
            </Button>
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

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <StatCard
          label="Total Grants"
          value={metrics.total}
          hint="Active role bindings"
          icon={KeyRound}
        />
        <StatCard
          label="Company-Scoped"
          value={metrics.companyScoped}
          hint="Organization-wide access"
          icon={Building2}
        />
        <StatCard
          label="Branch-Scoped"
          value={metrics.branchScoped}
          hint="Office-specific boundary"
          icon={ShieldCheck}
        />
        <StatCard
          label="Elevated Privileges"
          value={metrics.elevated}
          hint="Admin & governance roles"
          icon={ShieldAlert}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by user or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* User Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              User:
            </span>
            <select
              className="px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer max-w-[180px]"
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                if (e.target.value === "all") {
                  searchParams.delete("userId");
                } else {
                  searchParams.set("userId", e.target.value);
                }
                setSearchParams(searchParams);
              }}
            >
              <option value="all">All Users ({users.length})</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Role:
            </span>
            <select
              className="px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles ({roles.length})</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Scope:
            </span>
            <select
              className="px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            >
              <option value="all">All Scopes</option>
              <option value="Company">Company</option>
              <option value="Branch">Branch</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredAssignments.length === 0 ? (
          <EmptyState
            preset="inbox"
            message={
              searchQuery || userFilter !== "all"
                ? "No matching role assignments found"
                : "No Role Assignments Configured"
            }
            description={
              searchQuery || userFilter !== "all"
                ? "Try clearing filters to see all assigned roles."
                : "Assign roles to company personnel to delegate responsibilities."
            }
            action={
              canManageAssignments && userFilter === "all" ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedUserId(users[0]?.id || "");
                    setSelectedRoleId(roles[0]?.id || "");
                    setSelectedScopeType("Company");
                    setSelectedBranchId(branches[0]?.id || "");
                    setModalError("");
                    setIsAssignModalOpen(true);
                  }}
                >
                  Assign Role
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedAssignments}
              onRowClick={(row) =>
                row.userId && navigate(PATHS.HR.USER_DETAIL.replace(":id", row.userId))
              }
            />
            {filteredAssignments.length > PAGE_SIZE && (
              <div className="border-t border-slate-200/80 px-4 py-3 bg-slate-50/50">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredAssignments.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ASSIGN ROLE MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => !isSubmitting && setIsAssignModalOpen(false)}
        title="Assign Role to Personnel"
      >
        <form onSubmit={handleAssignRole} className="p-6 space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {modalError}
            </div>
          )}

          <FormField label="Select Employee" required>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="" disabled>Choose an employee...</option>
              {users
                .filter((u) => u.isActive !== false)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.jobTitle || u.email})
                  </option>
                ))}
            </Select>
          </FormField>

          <FormField label="Select Role" required>
            <Select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="" disabled>Choose a role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} {r.isSystem ? "(System)" : "(Custom)"}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Governance Scope Type" required>
            <Select
              value={selectedScopeType}
              onChange={(e) => setSelectedScopeType(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="Company">Company (Entire Organization)</option>
              <option value="Branch">Branch (Restricted to Specific Office)</option>
            </Select>
          </FormField>

          {selectedScopeType === "Branch" && (
            <FormField label="Select Regional Branch" required>
              <Select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="" disabled>Choose a branch office...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Assigning..." : "Assign Role"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* REVOKE ROLE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(revokeTarget)}
        title="Confirm Role Revocation"
        message={`Are you sure you want to revoke the "${revokeTarget?.role?.label}" role from ${revokeTarget?.user?.fullName}? Their authority for this role scope will be immediately terminated.`}
        confirmText="Revoke Role"
        cancelText="Cancel"
        variant="danger"
        loading={isRevoking}
        onConfirm={handleRevokeRole}
        onCancel={() => !isRevoking && setRevokeTarget(null)}
      />
    </div>
  );
}