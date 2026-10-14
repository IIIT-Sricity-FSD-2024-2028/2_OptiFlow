import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Users,
  User,
  CheckSquare,
  Shield,
  Building,
  Building2,
  Network,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import {
  ROLE_BADGE_STYLES,
  ROLE_LEVEL_LABELS,
} from "../components/orgTreeUtils";

// WHY: HrUserDetail provides a 360-degree profile view of any individual employee.
// It exposes organizational reporting lines, assigned roles & permissions, active operational tasks,
// and direct subordinates, with full Zero-Clutter action suppression for profile mutations.
export default function HrUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const toast = useToast();

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

  // Initial load
  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

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

  const directReports = employee.reports || [];
  const assignedTasks = employee.assignedTasks || [];
  const roleAssignments = employee.roleAssignments || [];
  const teamMemberships = employee.teamMembers || [];

  const primaryRole = employee.roleAssignments?.[0]?.role;
  const rawRole = primaryRole?.name || employee.role || "team_member";
  const roleSlug = rawRole.toLowerCase().replace(/[\s-]+/g, "_");
  const resolvedRoleLabel = primaryRole?.label || ROLE_LEVEL_LABELS[roleSlug] || "Team Member";
  const resolvedRoleBadgeClass =
    ROLE_BADGE_STYLES[roleSlug] || "bg-slate-100 text-slate-700 border-slate-200/80";

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
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {employee.fullName}
                </h1>
                <Badge
                  variant={employee.isActive !== false ? "active" : "inactive"}
                >
                  {employee.isActive !== false ? "Active" : "Inactive"}
                </Badge>
                {resolvedRoleLabel && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${resolvedRoleBadgeClass}`}
                  >
                    <Shield className="w-3.5 h-3.5 opacity-60" />
                    {resolvedRoleLabel}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                <span>{employee.email}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-700">
                  {employee.jobTitle || "No designation specified"}
                </span>
              </p>

              {/* Quick Squad & Branch Affiliation Links */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {teamMemberships.length > 0 ? (
                  <Link
                    to={`${PATHS.HR.TEAMS}?view=table`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50/70 hover:bg-blue-100 text-blue-700 border border-blue-200/70 transition-colors"
                    title="View Squad in Squads Directory"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    {teamMemberships.map((tm) => tm.team?.name).filter(Boolean).join(", ")}
                  </Link>
                ) : (
                  <Link
                    to={`${PATHS.HR.TEAMS}?view=table`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                    title="Click to assign to a delivery squad"
                  >
                    + Assign Squad
                  </Link>
                )}

                {employee.branch?.name ? (
                  <Link
                    to={PATHS.HR.BRANCHES}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100/80 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-colors"
                    title="View Regional Branches"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {employee.branch.name}
                  </Link>
                ) : (
                  <Link
                    to={PATHS.HR.BRANCHES}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                    title="Click to assign to a branch office"
                  >
                    + Assign Branch
                  </Link>
                )}
              </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Direct Subordinates"
          value={directReports.length}
          hint="Team members reporting directly"
          icon={<Users className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="Assigned Tasks"
          value={assignedTasks.length}
          hint="Active operational workload"
          icon={<CheckSquare className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          label="Functional Teams"
          value={teamMemberships.length}
          hint="Delivery squads allocated"
          icon={<Network className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Assigned Roles"
          value={roleAssignments.length}
          hint="System & custom role scopes"
          icon={<Shield className="w-5 h-5 text-amber-600" />}
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

          {/* Card: Functional Teams & Delivery Squads (HR + Project Integration) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Assigned Teams & Delivery Squads
                </h2>
              </div>
              <Badge variant="info" value={`${teamMemberships.length} Teams`} />
            </div>

            {teamMemberships.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-sm font-semibold text-slate-800 block">
                    No Functional Squad Assigned
                  </span>
                  <span className="text-xs text-slate-500">
                    This contributor is not currently placed in any delivery squad roster.
                  </span>
                </div>
                {canManageUsers && (
                  <Link
                    to={`${PATHS.HR.TEAMS}?view=table`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shrink-0"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Assign to Squad &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamMemberships.map((tm) => (
                  <div
                    key={tm.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-semibold text-slate-900 block">
                        {tm.team?.name || "Unnamed Team"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {tm.team?.branch?.name ? `Branch: ${tm.team.branch.name}` : "Branch unassigned"}
                      </span>
                    </div>
                    <Link
                      to={PATHS.HR.TEAMS}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View Team &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Active Operational Tasks (Project Module Integration) */}
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
                  {
                    header: "Action",
                    render: (row) => (
                      <Link
                        to={`/pm/tasks/${row.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
                      >
                        Open &rarr;
                      </Link>
                    ),
                  },
                ]}
                data={assignedTasks}
              />
            )}
          </div>
        </div>

        {/* Right 1 Column: Roles & Scopes + Compliance Context */}
        <div className="space-y-6">
          {/* Card: Employment Profile */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Employment Profile
              </h2>
              <Badge
                type="status"
                value={employee.isActive ? "active" : "inactive"}
              >
                {employee.isActive ? "Active" : "Deactivated"}
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Job Title</span>
                <span className="font-semibold text-slate-900 text-xs">
                  {employee.jobTitle || "Not specified"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Primary Role</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${resolvedRoleBadgeClass}`}>
                  <Shield className="w-3 h-3 opacity-60" />
                  {resolvedRoleLabel}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Regional Branch</span>
                <span className="font-semibold text-slate-800">
                  {employee.branch?.name ? (
                    <Link to={PATHS.HR.BRANCHES} className="text-blue-600 hover:text-blue-800 transition-colors">
                      {employee.branch.name}
                    </Link>
                  ) : (
                    <Link
                      to={PATHS.HR.BRANCHES}
                      className="text-xs font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-0.5"
                    >
                      Unassigned (Assign &rarr;)
                    </Link>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Assigned Squad</span>
                <span className="font-semibold text-slate-800">
                  {teamMemberships.length > 0 ? (
                    <Link to={`${PATHS.HR.TEAMS}?view=table`} className="text-blue-600 hover:text-blue-800 transition-colors">
                      {teamMemberships.map((tm) => tm.team?.name).filter(Boolean).join(", ")}
                    </Link>
                  ) : (
                    <Link
                      to={`${PATHS.HR.TEAMS}?view=table`}
                      className="text-xs font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-0.5"
                    >
                      Unassigned (Assign &rarr;)
                    </Link>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Reporting Line</span>
                <span className="font-semibold text-slate-800">
                  {employee.manager ? (
                    <Link
                      to={PATHS.HR.USER_DETAIL.replace(":id", employee.manager.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {employee.manager.fullName}
                    </Link>
                  ) : (
                    <span className="text-slate-400 italic">Executive / Direct</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Direct Reports</span>
                <span className="font-semibold text-slate-800">
                  {directReports.length} {directReports.length === 1 ? "person" : "personnel"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500 font-medium">Account Created</span>
                <span className="font-semibold text-slate-800">
                  {employee.createdAt ? formatDate(employee.createdAt) : "—"}
                </span>
              </div>
            </div>
          </div>
          {/* Card: Role Assignments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Role Assignments
              </h2>
              {canManageUsers && (
                <Link
                  to={`${PATHS.HR.USERS}?tab=access`}
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