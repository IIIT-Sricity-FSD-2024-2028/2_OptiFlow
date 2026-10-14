import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import { PATHS } from "../../../app/paths";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { Loader } from "../../../shared/components/Loader";
import { Modal } from "../../../shared/components/Modal";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { FormField, Input, Textarea, Select } from "../../../shared/components/FormField";
import styles from "./Roles.module.css";
import {
  ShieldCheck,
  Shield,
  KeyRound,
  Plus,
  RotateCw,
  Search,
  Check,
  UserPlus,
  Trash2,
  Copy,
  ExternalLink,
  Users,
} from "lucide-react";

// Categorized permissions standard matrix for OptiFlow
const PERMISSION_DOMAINS = {
  "Work Delivery & Tasks": [
    { slug: "task:create", label: "Create Parent Tasks", description: "Design and delegate parent project tasks" },
    { slug: "task:subtask:create", label: "Create Subtasks", description: "Decompose tasks into granular subtasks" },
    { slug: "task:execute", label: "Execute Subtasks", description: "Update progress, submit deliverables and hours" },
    { slug: "task:review", label: "Review Subtasks", description: "First-line review and approval of deliverables" },
    { slug: "task:change_request", label: "Submit Change Requests", description: "Petition upward baseline modifications" },
  ],
  "Company Governance & HR": [
    { slug: "hr:user:create", label: "Onboard Employees", description: "Create user profiles and assign primary roles" },
    { slug: "hr:user:manage", label: "Manage Personnel", description: "Edit employee profiles, job titles, and status" },
    { slug: "hr:branch:manage", label: "Manage Branches", description: "Create and administer regional branch hubs" },
    { slug: "hr:team:manage", label: "Manage Teams", description: "Organize functional pods and assign members" },
    { slug: "hr:role:architect", label: "Architect Roles", description: "Define dynamic custom roles & permissions" },
  ],
  "Compliance & Auditing": [
    { slug: "compliance:rule:manage", label: "Manage Rules", description: "Establish compliance policies and categories" },
    { slug: "compliance:evidence:audit", label: "Audit Evidence", description: "Inspect deliverables and cryptographic hashes" },
    { slug: "compliance:violation:adjudicate", label: "Adjudicate Violations", description: "Issue and resolve compliance penalties" },
  ],
  "Workflow & Process": [
    { slug: "process:template:design", label: "Design Templates", description: "Author reusable multi-stage workflows" },
    { slug: "executive:telemetry:view", label: "View Executive Telemetry", description: "Access cross-branch financial KPIs" },
  ],
};

const AVATAR_PALETTE = [
  "#2563eb", "#0f172a", "#059669", "#7c3aed", "#0891b2", "#d97706", "#475569", "#dc2626"
];

function getAvatarColor(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name = "") {
  return name.split(" ").map((n) => n[0] || "").join("").substring(0, 2).toUpperCase() || "??";
}

export default function HrRoles() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();

  // Core Data
  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Role & Permissions Workspace
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [activePermissions, setActivePermissions] = useState(new Set());
  const [savedPermissions, setSavedPermissions] = useState(new Set());
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Filters
  const [roleSearch, setRoleSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  // Create Custom Role Modal State
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [createRoleError, setCreateRoleError] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Assign Employee to Role Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Revoke Assignment Dialog State
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const canManageRoles = [
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
      const [rolesData, assignmentsData, usersData] = await Promise.all([
        apiClient("/roles"),
        apiClient("/role-assignments").catch(() => []),
        apiClient("/users").catch(() => []),
      ]);

      const loadedRoles = Array.isArray(rolesData) ? rolesData : [];
      setRoles(loadedRoles);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Preserve active role or default to first role
      setSelectedRoleId((prev) => {
        if (prev && loadedRoles.some((r) => r.id === prev)) return prev;
        return loadedRoles[0]?.id || null;
      });
    } catch (err) {
      console.error("[HrRoles] Failed to load role telemetry:", err);
      setError(err.message || "Failed to load roles from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Active Role Record
  const activeRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  // Synchronize permissions state whenever active role switches
  useEffect(() => {
    if (!activeRole) return;
    const currentPerms = new Set();
    if (Array.isArray(activeRole.permissions)) {
      activeRole.permissions.forEach((p) => {
        const slug = p.permission?.slug || p.permission?.code || p.slug || p.code;
        if (slug) currentPerms.add(slug);
      });
    }
    setActivePermissions(new Set(currentPerms));
    setSavedPermissions(new Set(currentPerms));
  }, [activeRole]);

  // Employees assigned to active role
  const activeRoleEmployees = useMemo(() => {
    if (!activeRole) return [];
    return assignments.filter((a) => a.roleId === activeRole.id);
  }, [assignments, activeRole]);

  // Filtered lists
  const filteredRoles = useMemo(() => {
    const q = roleSearch.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.label?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);

  const filteredRoleEmployees = useMemo(() => {
    const q = empSearch.toLowerCase().trim();
    if (!q) return activeRoleEmployees;
    return activeRoleEmployees.filter(
      (a) =>
        a.user?.fullName?.toLowerCase().includes(q) ||
        a.user?.email?.toLowerCase().includes(q)
    );
  }, [activeRoleEmployees, empSearch]);

  // Track unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    if (activePermissions.size !== savedPermissions.size) return true;
    for (const p of activePermissions) {
      if (!savedPermissions.has(p)) return true;
    }
    return false;
  }, [activePermissions, savedPermissions]);

  // 2. TOGGLE PERMISSION
  const handleTogglePermission = (slug) => {
    setActivePermissions((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // 3. SAVE PERMISSION CHANGES
  const handleSavePermissions = async () => {
    if (!activeRole) return;
    setIsSavingPerms(true);

    try {
      const permissionSlugs = Array.from(activePermissions);
      await apiClient(`/roles/${activeRole.id}/permissions`, {
        method: "PUT",
        body: { permissionSlugs },
      });

      toast.success(`Permissions updated for role "${activeRole.label}".`);
      setSavedPermissions(new Set(activePermissions));
      await fetchData();
    } catch (err) {
      console.error("[HrRoles] Failed to save permissions:", err);
      toast.error(err.message || "Failed to update permissions.");
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleDiscardChanges = () => {
    setActivePermissions(new Set(savedPermissions));
  };

  // 4. CREATE CUSTOM ROLE
  const handleCreateRole = async (e) => {
    e.preventDefault();
    const trimmed = newRoleLabel.trim();
    if (!trimmed) {
      setCreateRoleError("Role label is required.");
      return;
    }

    setIsCreatingRole(true);
    setCreateRoleError("");

    try {
      const res = await apiClient("/roles", {
        method: "POST",
        body: {
          label: trimmed,
          description: newRoleDesc.trim() || undefined,
          permissionSlugs: Array.from(activePermissions),
        },
      });

      toast.success(`Custom role "${trimmed}" registered successfully.`);
      setIsCreateRoleOpen(false);
      setNewRoleLabel("");
      setNewRoleDesc("");
      await fetchData();
      if (res?.data?.id) {
        setSelectedRoleId(res.data.id);
      }
    } catch (err) {
      console.error("[HrRoles] Creation failed:", err);
      setCreateRoleError(err.message || "Failed to create role.");
    } finally {
      setIsCreatingRole(false);
    }
  };

  // 5. ASSIGN USER TO ROLE
  const handleAssignUser = async (e) => {
    e.preventDefault();
    if (!assignUserId) {
      setAssignError("Please choose an employee.");
      return;
    }

    setIsAssigning(true);
    setAssignError("");

    try {
      await apiClient("/role-assignments", {
        method: "POST",
        body: {
          userId: assignUserId,
          roleId: activeRole.id,
          scopeType: "Company",
          scopeId: currentUser?.companyId,
        },
      });

      toast.success("Employee assigned to role successfully.");
      setIsAssignModalOpen(false);
      setAssignUserId("");
      await fetchData();
    } catch (err) {
      console.error("[HrRoles] Role assignment failed:", err);
      setAssignError(err.message || "Failed to assign role.");
    } finally {
      setIsAssigning(false);
    }
  };

  // 6. REVOKE ASSIGNMENT
  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;

    setIsRevoking(true);
    try {
      await apiClient(`/role-assignments/${revokeTarget.id}`, {
        method: "DELETE",
      });

      toast.success(`Role revoked from ${revokeTarget.user?.fullName}.`);
      setRevokeTarget(null);
      await fetchData();
    } catch (err) {
      console.error("[HrRoles] Revocation failed:", err);
      toast.error(err.message || "Failed to revoke assignment.");
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return <Loader fullScreen={false} message="Loading Roles & Permissions Studio..." />;
  }

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Roles & Permissions Studio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage corporate authority, configure permission matrices, and review assigned personnel
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchData}>
            <RotateCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>

          {canManageRoles && (
            <Button
              variant="primary"
              onClick={() => {
                setNewRoleLabel("");
                setNewRoleDesc("");
                setCreateRoleError("");
                setIsCreateRoleOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Custom Role
            </Button>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* 3-PANEL STUDIO CONTAINER */}
      <div className={styles.studioContainer}>
        {/* ── PANEL 1: ROLES DIRECTORY (LEFT) ── */}
        <div className={styles.leftPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Roles Catalog</span>
            <span className="text-xs font-semibold text-slate-500">
              {roles.length} Roles
            </span>
          </div>

          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className={styles.leftListBody}>
            {filteredRoles.map((role) => {
              const isActive = role.id === selectedRoleId;
              const empCount = assignments.filter((a) => a.roleId === role.id).length;

              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`${styles.roleListItem} ${
                    isActive ? styles.roleListItemActive : ""
                  }`}
                >
                  <div className={styles.roleItemMeta}>
                    <div className="flex items-center gap-1.5">
                      <span className={styles.roleItemTitle}>{role.label}</span>
                    </div>
                    <div className={styles.roleItemDesc}>
                      {role.isSystem ? "System Baseline" : "Custom Corporate"}
                    </div>
                  </div>

                  <span
                    className={`${styles.roleCountBadge} ${
                      isActive ? styles.roleCountBadgeActive : ""
                    }`}
                    title={`${empCount} employees assigned`}
                  >
                    {empCount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PANEL 2: PERMISSIONS STUDIO (CENTER) ── */}
        <div className={styles.centerPanel}>
          {activeRole ? (
            <>
              <div className={styles.centerHeader}>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      {activeRole.label}
                    </h2>
                    <Badge
                      type="status"
                      value={activeRole.isSystem ? "neutral" : "operational"}
                    >
                      {activeRole.isSystem ? "SYSTEM BASELINE" : "CUSTOM ROLE"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeRole.description ||
                      "Standard corporate capability rules and access boundaries for this role."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {canManageRoles && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewRoleLabel(`Copy of ${activeRole.label}`);
                        setNewRoleDesc(activeRole.description || "");
                        setIsCreateRoleOpen(true);
                      }}
                      title="Duplicate this role template into a custom role"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Duplicate
                    </Button>
                  )}
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className={styles.centerBody}>
                {Object.entries(PERMISSION_DOMAINS).map(([domain, perms]) => (
                  <div key={domain} className={styles.permDomainCard}>
                    <div className={styles.permDomainHeader}>
                      <span>{domain}</span>
                      <span className="text-[11px] font-semibold text-slate-400 font-mono">
                        {perms.filter((p) => activePermissions.has(p.slug)).length} /{" "}
                        {perms.length} Enabled
                      </span>
                    </div>

                    <div className={styles.permGrid}>
                      {perms.map((p) => {
                        const isChecked = activePermissions.has(p.slug);
                        return (
                          <label
                            key={p.slug}
                            className={`${styles.permItem} ${
                              isChecked ? styles.permItemChecked : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.slug)}
                              className={styles.permCheckbox}
                            />
                            <div>
                              <div className={styles.permTextTitle}>{p.label}</div>
                              <div className={styles.permTextDesc}>{p.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save / Discard Bar */}
              {hasUnsavedChanges && (
                <div className={styles.saveBar}>
                  <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    You have unsaved capability changes for this role.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDiscardChanges}
                      disabled={isSavingPerms}
                    >
                      Discard
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSavePermissions}
                      disabled={isSavingPerms}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {isSavingPerms ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
              Select a role from the left catalog to inspect permissions.
            </div>
          )}
        </div>

        {/* ── PANEL 3: ASSIGNED PERSONNEL (RIGHT) ── */}
        <div className={styles.rightPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Assigned Staff</span>
            <span className={styles.roleCountBadge}>
              {activeRoleEmployees.length}
            </span>
          </div>

          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter staff..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            {canManageRoles && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setAssignUserId("");
                  setAssignError("");
                  setIsAssignModalOpen(true);
                }}
                title="Assign employee to this role"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className={styles.rightBody}>
            {filteredRoleEmployees.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 px-4">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No employees currently assigned to this role.
              </div>
            ) : (
              filteredRoleEmployees.map((a) => {
                const initials = getInitials(a.user?.fullName);
                const color = getAvatarColor(a.user?.id || a.user?.fullName);

                return (
                  <div key={a.id} className={styles.empRow}>
                    <div
                      className={styles.empAvatar}
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>

                    <div className={styles.empDetails}>
                      <Link
                        to={PATHS.HR.USER_DETAIL.replace(":id", a.user?.id)}
                        className={`${styles.empName} hover:text-blue-600 block`}
                        title="View employee profile"
                      >
                        {a.user?.fullName || "Unknown User"}
                      </Link>
                      <div className={styles.empSub}>{a.user?.email}</div>
                    </div>

                    {canManageRoles && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(a)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors ml-1"
                        title="Revoke role from employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* CREATE CUSTOM ROLE MODAL */}
      <Modal
        isOpen={isCreateRoleOpen}
        onClose={() => !isCreatingRole && setIsCreateRoleOpen(false)}
        title="Create Custom Corporate Role"
      >
        <form onSubmit={handleCreateRole} className="p-6 space-y-4">
          {createRoleError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {createRoleError}
            </div>
          )}

          <FormField label="Role Label" required>
            <Input
              placeholder="e.g. Lead QA Specialist, Regional Pod Lead"
              value={newRoleLabel}
              onChange={(e) => setNewRoleLabel(e.target.value)}
              disabled={isCreatingRole}
              autoFocus
            />
          </FormField>

          <FormField label="Role Description">
            <Textarea
              rows={2}
              placeholder="Describe the operational responsibilities and authority boundary..."
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              disabled={isCreatingRole}
            />
          </FormField>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateRoleOpen(false)}
              disabled={isCreatingRole}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isCreatingRole}>
              {isCreatingRole ? "Creating..." : "Create Role"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN EMPLOYEE MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => !isAssigning && setIsAssignModalOpen(false)}
        title={`Assign Employee to "${activeRole?.label}"`}
      >
        <form onSubmit={handleAssignUser} className="p-6 space-y-4">
          {assignError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {assignError}
            </div>
          )}

          <FormField label="Select Employee" required>
            <Select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              disabled={isAssigning}
            >
              <option value="" disabled>Choose an employee...</option>
              {users
                .filter(
                  (u) =>
                    u.isActive !== false &&
                    !activeRoleEmployees.some((a) => a.user?.id === u.id)
                )
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
              onClick={() => setIsAssignModalOpen(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isAssigning}>
              {isAssigning ? "Assigning..." : "Assign to Role"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM REVOCATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(revokeTarget)}
        title="Revoke Role Access"
        message={`Are you sure you want to revoke the "${activeRole?.label}" role from ${revokeTarget?.user?.fullName}?`}
        confirmText="Revoke Role"
        cancelText="Cancel"
        variant="danger"
        loading={isRevoking}
        onConfirm={handleRevokeConfirm}
        onCancel={() => !isRevoking && setRevokeTarget(null)}
      />
    </div>
  );
}