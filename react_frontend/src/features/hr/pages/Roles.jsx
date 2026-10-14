import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import { StatCard } from "../../../shared/components/StatCard";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { Loader } from "../../../shared/components/Loader";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Table } from "../../../shared/components/Table";
import { Modal } from "../../../shared/components/Modal";
import { FormField, Input, Textarea, Select } from "../../../shared/components/FormField";

// Default system permission definitions grouped by functional domain
// Used as fallback / categorization matrix for the Dynamic Role Architect
const PERMISSION_DOMAINS = {
  "Work Delivery & Tasks": [
    { code: "task:create", label: "Create Parent Tasks", description: "Design and delegate parent project tasks" },
    { code: "task:subtask:create", label: "Create Subtasks", description: "Decompose tasks into granular subtasks" },
    { code: "task:execute", label: "Execute Subtasks", description: "Update progress, submit deliverables and hours" },
    { code: "task:review", label: "Review Subtasks", description: "First-line review and approval of deliverables" },
    { code: "task:change_request", label: "Submit Change Requests", description: "Petition upward baseline modifications" },
  ],
  "Company Governance & HR": [
    { code: "hr:user:create", label: "Onboard Employees", description: "Create user profiles and assign primary roles" },
    { code: "hr:user:manage", label: "Manage Personnel", description: "Edit employee profiles, job titles, and status" },
    { code: "hr:branch:manage", label: "Manage Branches", description: "Create and administer regional branch hubs" },
    { code: "hr:team:manage", label: "Manage Teams", description: "Organize functional pods and assign members" },
    { code: "hr:role:architect", label: "Architect Roles", description: "Define dynamic custom roles & permissions" },
  ],
  "Compliance & Auditing": [
    { code: "compliance:rule:manage", label: "Manage Rules", description: "Establish compliance policies and categories" },
    { code: "compliance:evidence:audit", label: "Audit Evidence", description: "Inspect deliverables and SHA-256 hashes" },
    { code: "compliance:violation:adjudicate", label: "Adjudicate Violations", description: "Issue and resolve compliance penalties" },
  ],
  "Executive & Process": [
    { code: "process:template:design", label: "Design Templates", description: "Author reusable multi-stage workflows" },
    { code: "executive:telemetry:view", label: "View Executive Telemetry", description: "Access cross-branch financial KPIs" },
  ],
};

// WHY: HrRoles houses the Role Templates Catalog and the Tier 3 Specialized Component:
// DynamicRoleAndPermissionArchitect. It allows HR Administrators to inspect platform role baselines
// and configure customized corporate roles with live preview of Hard Action Suppression.
export default function HrRoles() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Core state
  const [roles, setRoles] = useState([]);
  const [roleTemplates, setRoleTemplates] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'system' | 'custom'

  // Permission Inspector Modal
  const [inspectingRole, setInspectingRole] = useState(null);

  // Dynamic Role Architect Modal State
  const [isArchitectOpen, setIsArchitectOpen] = useState(false);
  const [architectLabel, setArchitectLabel] = useState("");
  const [architectDescription, setArchitectDescription] = useState("");
  const [selectedTemplateBase, setSelectedTemplateBase] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [architectError, setArchitectError] = useState("");
  const [isSavingRole, setIsSavingRole] = useState(false);

  // WHY: Zero-Clutter Hard Action Suppression restricts role creation to HR & Admins
  const canManageRoles = [
    "company_owner",
    "system_admin",
    "superuser",
    "hr_manager",
  ].includes(currentUser?.role);

  // 1. DATA HYDRATION
  // WHY: Parallel fetching of roles, templates, and permissions ensures immediate
  // configuration matrix display without sequential latency.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesData, templatesData, permissionsData] = await Promise.all([
        apiClient("/roles"),
        apiClient("/role-templates").catch(() => []),
        apiClient("/permissions").catch(() => []),
      ]);

      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setRoleTemplates(Array.isArray(templatesData) ? templatesData : []);
      setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
    } catch (err) {
      console.error("[HrRoles] Failed to load role telemetry:", err);
      setError(err.message || "Failed to load role templates from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load without synchronous setState in effect body
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const [rolesData, templatesData, permissionsData] = await Promise.all([
          apiClient("/roles"),
          apiClient("/role-templates").catch(() => []),
          apiClient("/permissions").catch(() => []),
        ]);
        if (isMounted) {
          setRoles(Array.isArray(rolesData) ? rolesData : []);
          setRoleTemplates(Array.isArray(templatesData) ? templatesData : []);
          setPermissions(Array.isArray(permissionsData) ? permissionsData : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[HrRoles] Failed to load role telemetry:", err);
          setError(err.message || "Failed to load role templates from server.");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derived Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        role.label?.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query);

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "system" && role.isSystem) ||
        (typeFilter === "custom" && !role.isSystem);

      return matchesSearch && matchesType;
    });
  }, [roles, searchQuery, typeFilter]);

  // Derived KPI Telemetry
  const metrics = useMemo(() => {
    const total = roles.length;
    const system = roles.filter((r) => r.isSystem).length;
    const custom = total - system;
    const totalPerms = permissions.length || Object.values(PERMISSION_DOMAINS).flat().length;

    return { total, system, custom, totalPerms };
  }, [roles, permissions]);

  // 2. TEMPLATE SELECTION IN ARCHITECT
  // When user selects a base template, pre-populate standard permissions
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateBase(templateId);
    if (!templateId) return;

    const template = roleTemplates.find((t) => t.id === templateId);
    if (template) {
      if (!architectLabel) setArchitectLabel(`Custom ${template.label || "Role"}`);
      if (!architectDescription) setArchitectDescription(template.description || "");

      // Pre-select default permissions if provided
      const newPerms = new Set();
      if (template.defaultPermissions) {
        template.defaultPermissions.forEach((dp) => {
          if (dp.permission?.code) newPerms.add(dp.permission.code);
        });
      }
      setSelectedPermissions(newPerms);
    }
  };

  // Toggle permission checkbox in architect
  const handleTogglePermission = (code) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // 3. SAVE CUSTOM ROLE HANDLER
  const handleSaveRole = async (e) => {
    e.preventDefault();
    const trimmedLabel = architectLabel.trim();
    if (!trimmedLabel) {
      setArchitectError("Role label is required.");
      return;
    }

    setIsSavingRole(true);
    setArchitectError("");

    try {
      // OptiFlow backend custom role creation payload
      await apiClient("/roles", {
        method: "POST",
        body: {
          label: trimmedLabel,
          description: architectDescription.trim() || undefined,
          roleTemplateId: selectedTemplateBase || undefined,
          permissionCodes: Array.from(selectedPermissions),
        },
      }).catch(async (postErr) => {
        // If POST /roles isn't implemented as a standalone route, fallback to role-templates or simulate
        console.warn("[HrRoles] Standalone POST /roles notice:", postErr.message);
        throw postErr;
      });

      toast.success(`Custom role "${trimmedLabel}" registered successfully!`);
      setIsArchitectOpen(false);
      setArchitectLabel("");
      setArchitectDescription("");
      setSelectedTemplateBase("");
      setSelectedPermissions(new Set());
      await fetchData();
    } catch (err) {
      console.error("[HrRoles] Role architect save error:", err);
      setArchitectError(err.message || "Failed to register custom role template.");
    } finally {
      setIsSavingRole(false);
    }
  };

  // 4. TABLE COLUMNS CONFIGURATION
  const columns = [
    {
      header: "Role Definition",
      accessor: "label",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
              row.isSystem
                ? "bg-slate-100 text-slate-700 border border-slate-200"
                : "bg-purple-100 text-purple-700 border border-purple-200"
            }`}
          >
            {row.label.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block leading-tight">
              {row.label}
            </span>
            <span className="text-xs text-slate-400">
              {row.description || "No description provided"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Origin & Governance",
      accessor: "isSystem",
      render: (row) => (
        <Badge
          variant={row.isSystem ? "draft" : "info"}
          value={row.isSystem ? "SYSTEM BASELINE" : "CUSTOM ROLE"}
        />
      ),
    },
    {
      header: "Permissions Included",
      accessor: "permissions",
      render: (row) => {
        const count = row.permissions?.length || 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">
              {count > 0 ? `${count} Granted` : "Baseline Standard"}
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectingRole(row);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline font-medium"
              >
                Inspect
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setInspectingRole(row)}
          >
            View Permissions
          </Button>

          {/* Zero-Clutter Gating: Only render custom role duplication/edit for HR */}
          {canManageRoles && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setArchitectLabel(`Copy of ${row.label}`);
                setArchitectDescription(row.description || "");
                setSelectedTemplateBase(row.roleTemplateId || "");
                setSelectedPermissions(
                  new Set((row.permissions || []).map((p) => p.permission?.code || p.code).filter(Boolean))
                );
                setIsArchitectOpen(true);
              }}
            >
              Duplicate
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <Loader fullScreen={false} message="Loading role governance matrix..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Role Architecture & Permissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Govern system authority boundaries, inspect permission grants, and architect custom roles
          </p>
        </div>

        {/* Zero-Clutter Gating: Suppressed completely from React DOM if ungranted */}
        {canManageRoles && (
          <Button
            variant="primary"
            onClick={() => {
              setArchitectLabel("");
              setArchitectDescription("");
              setSelectedTemplateBase("");
              setSelectedPermissions(new Set(["task:execute", "task:change_request"]));
              setArchitectError("");
              setIsArchitectOpen(true);
            }}
          >
            + Architect Custom Role
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
          label="Total Roles"
          value={metrics.total}
          hint="System & custom roles"
        />
        <StatCard
          label="System Baselines"
          value={metrics.system}
          hint="Immutable platform roles"
        />
        <StatCard
          label="Custom Architected"
          value={metrics.custom}
          hint="Company defined roles"
        />
        <StatCard
          label="Governance Gates"
          value={metrics.totalPerms}
          hint="Action suppression points"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search roles by label or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Origin:
          </label>
          <select
            className="px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Roles ({roles.length})</option>
            <option value="system">System Baselines ({metrics.system})</option>
            <option value="custom">Custom Roles ({metrics.custom})</option>
          </select>
        </div>
      </div>

      {/* Main Roles Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredRoles.length === 0 ? (
          <EmptyState
            preset="inbox"
            message={searchQuery ? "No matching roles found" : "No Roles Configured"}
            description={
              searchQuery
                ? "Try searching with a different term."
                : "No role definitions are available in this company environment."
            }
          />
        ) : (
          <Table columns={columns} data={filteredRoles} />
        )}
      </div>

      {/* PERMISSION INSPECTOR MODAL */}
      <Modal
        isOpen={Boolean(inspectingRole)}
        onClose={() => setInspectingRole(null)}
        title={`Permissions: ${inspectingRole?.label || "Role"}`}
        className="max-w-[620px]"
      >
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-900 text-sm">
                {inspectingRole?.label}
              </span>
              <Badge
                variant={inspectingRole?.isSystem ? "draft" : "info"}
                value={inspectingRole?.isSystem ? "SYSTEM BASELINE" : "CUSTOM ROLE"}
              />
            </div>
            <p className="text-xs text-slate-500">
              {inspectingRole?.description || "No specific description available."}
            </p>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Assigned Permissions & Gating Rules
            </h4>

            {inspectingRole?.permissions && inspectingRole.permissions.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {inspectingRole.permissions.map((p, idx) => {
                  const perm = p.permission || p;
                  return (
                    <div
                      key={perm.id || idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-900 block">
                          {perm.label || perm.name || perm.code}
                        </span>
                        {perm.description && (
                          <span className="text-xs text-slate-400">{perm.description}</span>
                        )}
                      </div>
                      <Badge variant="active" value="GRANTED" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                This system baseline inherits standardized default operational permissions.
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end border-t border-slate-100">
            <Button variant="secondary" onClick={() => setInspectingRole(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* DYNAMIC ROLE ARCHITECT MODAL (Tier 3 Specialized HR Component) */}
      <Modal
        isOpen={isArchitectOpen}
        onClose={() => !isSavingRole && setIsArchitectOpen(false)}
        title="Dynamic Role & Permission Architect"
        className="max-w-[760px]"
      >
        <form onSubmit={handleSaveRole} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          {architectError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {architectError}
            </div>
          )}

          {/* Section: Basic Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Role Label" required>
              <Input
                placeholder="e.g. Lead QA Specialist, Regional Pod Lead"
                value={architectLabel}
                onChange={(e) => setArchitectLabel(e.target.value)}
                disabled={isSavingRole}
                autoFocus
              />
            </FormField>

            <FormField label="Base Template (Optional)">
              <Select
                value={selectedTemplateBase}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                disabled={isSavingRole}
              >
                <option value="">Start from scratch (Custom)</option>
                {roleTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.origin})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Role Scope & Description">
            <Textarea
              rows={2}
              placeholder="Describe the operational responsibilities and authority boundary of this role..."
              value={architectDescription}
              onChange={(e) => setArchitectDescription(e.target.value)}
              disabled={isSavingRole}
            />
          </FormField>

          {/* Section: Granular Permissions Matrix */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Granular Feature Permissions Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Select capabilities. OptiFlow enforces Hard Action Suppression on ungranted capabilities.
                </p>
              </div>
              <Badge
                variant="info"
                value={`${selectedPermissions.size} Selected`}
              />
            </div>

            <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
              {Object.entries(PERMISSION_DOMAINS).map(([domain, perms]) => (
                <div key={domain} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {domain}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => {
                      const isChecked = selectedPermissions.has(p.code);
                      return (
                        <label
                          key={p.code}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                            isChecked
                              ? "bg-blue-50/60 border-blue-300"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(p.code)}
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-900 block leading-tight">
                              {p.label}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {p.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Live Hard Action Suppression Simulator */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Zero-Clutter Hard Action Suppression Preview
              </span>
              <Badge variant="active" value="ACTIVE SIMULATION" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Below is how buttons dynamically evaluate for this role. Notice that ungranted actions evaluate to{" "}
              <code className="text-amber-300 font-mono">null</code> and are completely excluded from the DOM:
            </p>

            <div className="p-3 bg-slate-800/80 rounded-lg flex flex-wrap items-center gap-3 border border-slate-700/60">
              {selectedPermissions.has("task:create") ? (
                <span className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-medium">
                  ✓ "+ Create Parent Task" (Rendered)
                </span>
              ) : (
                <span className="text-slate-500 text-xs italic">
                  [Create Parent Task unrendered]
                </span>
              )}

              {selectedPermissions.has("task:subtask:create") ? (
                <span className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-medium">
                  ✓ "+ Decompose Subtask" (Rendered)
                </span>
              ) : (
                <span className="text-slate-500 text-xs italic">
                  [Decompose Subtask unrendered]
                </span>
              )}

              {selectedPermissions.has("compliance:violation:adjudicate") ? (
                <span className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-medium">
                  ✓ "Issue Violation Penalty" (Rendered)
                </span>
              ) : (
                <span className="text-slate-500 text-xs italic">
                  [Issue Violation unrendered]
                </span>
              )}

              {selectedPermissions.has("hr:user:create") ? (
                <span className="px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-medium">
                  ✓ "Onboard Employee" (Rendered)
                </span>
              ) : (
                <span className="text-slate-500 text-xs italic">
                  [Onboard Employee unrendered]
                </span>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsArchitectOpen(false)}
              disabled={isSavingRole}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSavingRole}>
              {isSavingRole ? "Registering..." : "Register Custom Role"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}