import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { formatDate } from "../../../shared/utils/formatDate";

// WHY: HrUserDetail provides a 360-degree profile view of any individual employee.
// It exposes organizational reporting lines, assigned roles & permissions, active operational tasks,
// and direct subordinates, with full Zero-Clutter action suppression for profile mutations.
export default function HrUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Employee details and related company personnel
  const [employee, setEmployee] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editError, setEditError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deactivate / Reactivate Dialog State
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // WHY: Zero-Clutter Hard Action Suppression ensures only HR Managers and Admins
  // can view and trigger administrative mutation actions.
  const canManageUsers = [
    "company_owner",
    "system_admin",
    "superuser",
    "hr_manager",
  ].includes(currentUser?.role);

  // 1. DATA HYDRATION
  // WHY: Fetches the targeted user profile (with reports and assigned tasks)
  // and all company users (to populate manager selection in edit modal).
  const fetchEmployeeData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [userData, usersList] = await Promise.all([
        apiClient(`/users/${id}`),
        apiClient("/users").catch(() => []),
      ]);

      if (!userData) {
        throw new Error("Employee record could not be found.");
      }

      setEmployee(userData);
      setAllUsers(Array.isArray(usersList) ? usersList : []);

      // Pre-fill edit modal form
      setEditFullName(userData.fullName || "");
      setEditJobTitle(userData.jobTitle || "");
      setEditManagerId(userData.managerUserId || "");
    } catch (err) {
      console.error("[HrUserDetail] Failed to load employee details:", err);
      setError(err.message || "Failed to load employee profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load without synchronous setState in effect body
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      if (!id) return;
      try {
        const [userData, usersList] = await Promise.all([
          apiClient(`/users/${id}`),
          apiClient("/users").catch(() => []),
        ]);

        if (isMounted) {
          if (!userData) {
            throw new Error("Employee record could not be found.");
          }
          setEmployee(userData);
          setAllUsers(Array.isArray(usersList) ? usersList : []);
          setEditFullName(userData.fullName || "");
          setEditJobTitle(userData.jobTitle || "");
          setEditManagerId(userData.managerUserId || "");
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[HrUserDetail] Failed to load employee details:", err);
          setError(err.message || "Failed to load employee profile.");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // 2. EDIT PROFILE HANDLER
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const trimmedName = editFullName.trim();
    if (!trimmedName) {
      setEditError("Full name is required.");
      return;
    }

    setIsSubmitting(true);
    setEditError("");

    try {
      await apiClient(`/users/${id}`, {
        method: "PATCH",
        body: {
          fullName: trimmedName,
          jobTitle: editJobTitle.trim() || null,
          managerUserId: editManagerId || null,
        },
      });

      toast.success("Employee profile updated successfully!");
      setIsEditModalOpen(false);
      await fetchEmployeeData();
    } catch (err) {
      console.error("[HrUserDetail] Update failed:", err);
      setEditError(err.message || "Failed to update employee details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. DEACTIVATE / REACTIVATE HANDLER
  const handleToggleStatus = async () => {
    if (!employee) return;
    setIsUpdatingStatus(true);
    const willDeactivate = employee.isActive !== false;

    try {
      if (willDeactivate) {
        await apiClient(`/users/${id}`, { method: "DELETE" });
        toast.success(`Employee "${employee.fullName}" deactivated.`);
      } else {
        await apiClient(`/users/${id}`, {
          method: "PATCH",
          body: { isActive: true },
        });
        toast.success(`Employee "${employee.fullName}" reactivated.`);
      }

      setIsDeactivateOpen(false);
      await fetchEmployeeData();
    } catch (err) {
      console.error("[HrUserDetail] Status toggle failed:", err);
      toast.error(err.message || "Failed to update employee status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return <Loader fullScreen={false} message="Loading employee profile..." />;
  }

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" size="sm" onClick={() => navigate(PATHS.HR.USERS)}>
          &larr; Back to Directory
        </Button>
        <EmptyState
          preset="inbox"
          message="Employee Not Found"
          description={error || "The requested user profile does not exist or has been removed."}
          action={
            <Button variant="primary" onClick={() => navigate(PATHS.HR.USERS)}>
              Return to Directory
            </Button>
          }
        />
      </div>
    );
  }

  const initials = employee.fullName
    ? employee.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  const directReports = employee.reports || [];
  const assignedTasks = employee.assignedTasks || [];
  const roleAssignments = employee.roleAssignments || [];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(PATHS.HR.USERS)}
          className="gap-2"
        >
          &larr; Back to Employee Directory
        </Button>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* User Identity Info */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 border border-blue-200/80 flex items-center justify-center text-blue-700 font-bold text-xl shadow-xs">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {employee.fullName}
                </h1>
                <Badge
                  variant={employee.isActive !== false ? "active" : "failed"}
                  value={employee.isActive !== false ? "ACTIVE" : "INACTIVE"}
                />
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <span>{employee.email}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">
                  {employee.jobTitle || "No designation specified"}
                </span>
              </p>
            </div>
          </div>

          {/* Zero-Clutter Administrative Actions */}
          {canManageUsers && (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditFullName(employee.fullName || "");
                  setEditJobTitle(employee.jobTitle || "");
                  setEditManagerId(employee.managerUserId || "");
                  setEditError("");
                  setIsEditModalOpen(true);
                }}
              >
                Edit Profile
              </Button>

              {employee.id !== currentUser?.id && (
                <Button
                  variant={employee.isActive !== false ? "danger" : "primary"}
                  onClick={() => setIsDeactivateOpen(true)}
                >
                  {employee.isActive !== false ? "Deactivate Account" : "Reactivate Account"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Direct Subordinates"
          value={directReports.length}
          hint="Team members reporting directly"
        />
        <StatCard
          label="Assigned Tasks"
          value={assignedTasks.length}
          hint="Active operational workload"
        />
        <StatCard
          label="Assigned Roles"
          value={roleAssignments.length}
          hint="System & custom role scopes"
        />
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Organizational Hierarchy & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Reporting Structure */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Organizational Hierarchy & Reporting
            </h2>

            {/* Reports To (Manager) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Reports To (Designated Manager)
              </span>
              {employee.manager ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 block text-sm">
                      {employee.manager.fullName}
                    </span>
                    <span className="text-xs text-slate-500">{employee.manager.email}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(PATHS.HR.USER_DETAIL.replace(":id", employee.manager.id))}
                  >
                    View Manager
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  Top-level executive reporting directly to company leadership.
                </p>
              )}
            </div>

            {/* Direct Reports */}
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                Direct Reports ({directReports.length})
              </span>
              {directReports.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No direct reports currently assigned.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {directReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition-colors flex items-center justify-between cursor-pointer"
                      onClick={() => navigate(PATHS.HR.USER_DETAIL.replace(":id", report.id))}
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-900 block">
                          {report.fullName}
                        </span>
                        <span className="text-xs text-slate-400">{report.email}</span>
                      </div>
                      <span className="text-slate-400 text-sm">&rarr;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card: Active Operational Tasks */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Assigned Operational Tasks
              </h2>
              <Badge variant="info" value={`${assignedTasks.length} Assigned`} />
            </div>

            {assignedTasks.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-2">
                No active tasks currently delegated to this employee.
              </p>
            ) : (
              <Table
                columns={[
                  {
                    header: "Task Title",
                    accessor: "title",
                    render: (row) => (
                      <span className="font-medium text-slate-900 text-sm">{row.title}</span>
                    ),
                  },
                  {
                    header: "Status",
                    accessor: "status",
                    render: (row) => <Badge variant={row.status} value={row.status} />,
                  },
                  {
                    header: "Priority",
                    accessor: "priority",
                    render: (row) => <Badge variant={row.priority} value={row.priority} />,
                  },
                  {
                    header: "Due Date",
                    accessor: "dueDate",
                    render: (row) => (
                      <span className="text-xs text-slate-500">{formatDate(row.dueDate)}</span>
                    ),
                  },
                ]}
                data={assignedTasks}
              />
            )}
          </div>
        </div>

        {/* Right 1 Column: Roles & Scopes + Metadata */}
        <div className="space-y-6">
          {/* Card: Role Assignments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Role Assignments
              </h2>
              {canManageUsers && (
                <Link
                  to={PATHS.HR.ROLE_ASSIGNMENTS}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Manage &rarr;
                </Link>
              )}
            </div>

            {roleAssignments.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No explicit roles assigned.</p>
            ) : (
              <div className="space-y-3">
                {roleAssignments.map((ra) => (
                  <div
                    key={ra.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="info" value={ra.role?.label || "Role"} />
                      <span className="text-xs text-slate-400">
                        {ra.role?.isSystem ? "System" : "Custom"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Scope: <span className="font-semibold">{ra.scopeType || "Company"}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Granted: {formatDate(ra.grantedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: System Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Account Metadata
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tenant Company:</span>
                <span className="font-medium text-slate-900">
                  {employee.company?.legalName || "OptiFlow Tenant"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Account Created:</span>
                <span className="font-medium text-slate-900">{formatDate(employee.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Last Profile Update:</span>
                <span className="font-medium text-slate-900">{formatDate(employee.updatedAt)}</span>
              </div>
              {employee.deactivatedAt && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                  <span>Deactivated On:</span>
                  <span className="font-medium">{formatDate(employee.deactivatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isSubmitting && setIsEditModalOpen(false)}
        title="Edit Employee Profile"
      >
        <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {editError}
            </div>
          )}

          <FormField label="Full Name" required>
            <Input
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </FormField>

          <FormField label="Job Title" hint="Designation / Position">
            <Input
              value={editJobTitle}
              onChange={(e) => setEditJobTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Reporting Manager" hint="Direct supervisor in hierarchy">
            <Select
              value={editManagerId}
              onChange={(e) => setEditManagerId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">None (Top-Level Executive / Unassigned)</option>
              {allUsers
                .filter((u) => u.id !== employee.id && u.isActive !== false)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.jobTitle || u.email})
                  </option>
                ))}
            </Select>
          </FormField>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DEACTIVATE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isDeactivateOpen}
        title={
          employee.isActive !== false
            ? "Deactivate Employee Account"
            : "Reactivate Employee Account"
        }
        message={
          employee.isActive !== false
            ? `Are you sure you want to deactivate "${employee.fullName}"? Their access will be immediately blocked.`
            : `Are you sure you want to reactivate "${employee.fullName}"? Their access will be restored.`
        }
        confirmLabel={
          isUpdatingStatus
            ? "Updating..."
            : employee.isActive !== false
            ? "Deactivate Account"
            : "Reactivate Account"
        }
        confirmVariant={employee.isActive !== false ? "danger" : "primary"}
        onConfirm={handleToggleStatus}
        onCancel={() => !isUpdatingStatus && setIsDeactivateOpen(false)}
      />
    </div>
  );
}