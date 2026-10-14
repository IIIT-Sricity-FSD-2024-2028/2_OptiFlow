import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

// WHY: HrUsers provides the master workforce directory and personnel administration hub.
// It allows the Company Role Administrator (HR) to onboard employees, inspect organizational
// reporting lines, monitor active/deactivated headcount, and navigate to detailed employee profiles.
export default function HrUsers() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Core state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [managerUserId, setManagerUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivate User Confirm Dialog
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // WHY: Zero-Clutter Hard Action Suppression dictates that only HR managers,
  // company owners, and platform administrators see creation and deactivation actions.
  const canManageUsers = [
    "company_owner",
    "system_admin",
    "superuser",
    "hr_manager",
  ].includes(currentUser?.role);

  // 1. DATA HYDRATION
  // WHY: Fetching users and roles in parallel ensures full directory and role labels
  // are loaded together without sequential waiting against PostgreSQL.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersData, rolesData] = await Promise.all([
        apiClient("/users"),
        apiClient("/roles"),
      ]);

      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (err) {
      console.error("[HrUsers] Failed to load directory data:", err);
      setError(err.message || "Failed to load employee directory from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load without synchronous setState in effect body
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const [usersData, rolesData] = await Promise.all([
          apiClient("/users"),
          apiClient("/roles"),
        ]);
        if (isMounted) {
          setUsers(Array.isArray(usersData) ? usersData : []);
          setRoles(Array.isArray(rolesData) ? rolesData : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[HrUsers] Failed to load directory data:", err);
          setError(err.message || "Failed to load employee directory from server.");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derived Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
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

  // Derived Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const inactive = total - active;
    const distinctRoles = new Set(
      users.flatMap((u) => (u.roleAssignments || []).map((ra) => ra.role?.label)).filter(Boolean)
    ).size;

    return { total, active, inactive, distinctRoles };
  }, [users]);

  // 2. CREATE USER HANDLER
  // WHY: Enforces client-side validation before sending payload to POST /users.
  // Handles plan limits gracefully if returned by backend middleware.
  const handleCreateUser = async (e) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      setFormError("Full name, email address, and password are required.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  // 3. DEACTIVATE / REACTIVATE USER HANDLER
  const handleToggleDeactivate = async () => {
    if (!deactivateTarget) return;

    setIsDeactivating(true);
    const willDeactivate = deactivateTarget.isActive !== false;

    try {
      if (willDeactivate) {
        // Backend DELETE /users/:id performs soft deactivation
        await apiClient(`/users/${deactivateTarget.id}`, {
          method: "DELETE",
        });
        toast.success(`User "${deactivateTarget.fullName}" deactivated.`);
      } else {
        // PATCH /users/:id to reactivate
        await apiClient(`/users/${deactivateTarget.id}`, {
          method: "PATCH",
          body: { isActive: true },
        });
        toast.success(`User "${deactivateTarget.fullName}" reactivated.`);
      }

      setDeactivateTarget(null);
      await fetchData();
    } catch (err) {
      console.error("[HrUsers] Status toggle failed:", err);
      toast.error(err.message || "Failed to update employee status.");
    } finally {
      setIsDeactivating(false);
    }
  };

  // 4. TABLE COLUMNS
  const columns = [
    {
      header: "Employee",
      accessor: "fullName",
      render: (row) => {
        const initials = row.fullName
          ? row.fullName
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
              <span className="font-medium text-slate-900 block leading-tight">
                {row.fullName}
              </span>
              <span className="text-xs text-slate-400">{row.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Job Title",
      accessor: "jobTitle",
      render: (row) => (
        <span className="text-sm text-slate-700">{row.jobTitle || "—"}</span>
      ),
    },
    {
      header: "Assigned Roles",
      accessor: "roleAssignments",
      render: (row) => {
        const assignments = row.roleAssignments || [];
        if (assignments.length === 0) {
          return <span className="text-xs text-slate-400">No role assigned</span>;
        }

        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {assignments.map((ra) => (
              <Badge
                key={ra.id || ra.role?.id}
                variant="info"
                value={ra.role?.label || "Role"}
              />
            ))}
          </div>
        );
      },
    },
    {
      header: "Reporting Manager",
      accessor: "manager",
      render: (row) => (
        <span className="text-sm text-slate-600">
          {row.manager?.fullName || <span className="text-slate-400">Top-Level / None</span>}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (row) => (
        <Badge
          variant={row.isActive !== false ? "active" : "failed"}
          value={row.isActive !== false ? "ACTIVE" : "INACTIVE"}
        />
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(PATHS.HR.USER_DETAIL.replace(":id", row.id))}
          >
            Profile
          </Button>

          {/* Zero-Clutter Gating: Only render status toggle for authorized HR/Admins */}
          {canManageUsers && row.id !== currentUser?.id && (
            <Button
              variant={row.isActive !== false ? "ghost" : "primary"}
              size="sm"
              onClick={() => setDeactivateTarget(row)}
            >
              {row.isActive !== false ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <Loader fullScreen={false} message="Loading employee directory..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Employee Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, onboard, and manage company personnel, reporting lines, and permissions
          </p>
        </div>

        {/* Zero-Clutter Gating: Unrendered if ungranted */}
        {canManageUsers && (
          <Button
            variant="primary"
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
            + Onboard Employee
          </Button>
        )}
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
          label="Total Personnel"
          value={metrics.total}
          hint="Enrolled user accounts"
        />
        <StatCard
          label="Active Employees"
          value={metrics.active}
          hint="Operational access granted"
        />
        <StatCard
          label="Inactive / Suspended"
          value={metrics.inactive}
          hint="Deactivated accounts"
        />
        <StatCard
          label="Assigned Roles"
          value={metrics.distinctRoles}
          hint="Distinct roles active"
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by name, email, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status:
            </span>
            <select
              className="px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <EmptyState
            preset="inbox"
            message={searchQuery ? "No matching personnel found" : "No Employees Found"}
            description={
              searchQuery
                ? "Try clearing filters or searching with a different keyword."
                : "Get started by onboarding your company's first employee."
            }
            action={
              canManageUsers && !searchQuery ? (
                <Button
                  variant="primary"
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
                  Onboard Employee
                </Button>
              ) : null
            }
          />
        ) : (
          <Table
            columns={columns}
            data={filteredUsers}
            onRowClick={(row) => navigate(PATHS.HR.USER_DETAIL.replace(":id", row.id))}
          />
        )}
      </div>

      {/* ONBOARD EMPLOYEE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        title="Onboard New Employee"
      >
        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 leading-relaxed">
              {formError}
            </div>
          )}

          <FormField label="Full Name" required>
            <Input
              placeholder="e.g. Maya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </FormField>

          <FormField label="Work Email Address" required>
            <Input
              type="email"
              placeholder="maya.sharma@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField
            label="Initial Password"
            required
            hint="Must be at least 8 characters long."
          >
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Job Title" hint="Designation / Position">
            <Input
              placeholder="e.g. Senior Frontend Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Reporting Manager" hint="Optional manager in reporting line">
            <Select
              value={managerUserId}
              onChange={(e) => setManagerUserId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">None (Top-Level Executive / Unassigned)</option>
              {users
                .filter((u) => u.isActive !== false)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.jobTitle || u.email})
                  </option>
                ))}
            </Select>
          </FormField>

          <FormField label="Assigned System Role">
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select a default role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label} {r.isSystem ? "(System)" : "(Custom)"}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Onboarding..." : "Onboard Employee"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DEACTIVATE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        title={
          deactivateTarget?.isActive !== false
            ? "Deactivate Employee Account"
            : "Reactivate Employee Account"
        }
        message={
          deactivateTarget?.isActive !== false
            ? `Are you sure you want to deactivate "${deactivateTarget?.fullName}"? They will be immediately blocked from signing into the system.`
            : `Are you sure you want to reactivate "${deactivateTarget?.fullName}"? Their access to company features will be restored.`
        }
        confirmLabel={
          isDeactivating
            ? "Updating..."
            : deactivateTarget?.isActive !== false
            ? "Deactivate Account"
            : "Reactivate Account"
        }
        confirmVariant={deactivateTarget?.isActive !== false ? "danger" : "primary"}
        onConfirm={handleToggleDeactivate}
        onCancel={() => !isDeactivating && setDeactivateTarget(null)}
      />
    </div>
  );
}