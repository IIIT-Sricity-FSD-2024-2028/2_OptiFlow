// roles-store.js
// ═══════════════════════════════════════════════════════════════
// Persistent roles & permissions store for OfficeSync HR module.
// Uses localStorage so data survives tab closes and full refreshes.
//
// Exports global: RolesStore
//
// Public API
// ───────────────────────────────────────────────────────────────
//  RolesStore.getAllSystemRoles()           → RoleConfig[]
//  RolesStore.getSystemRole(roleKey)        → RoleConfig
//  RolesStore.saveSystemRole(roleKey, perms)→ void
//  RolesStore.getPermissionGroups()         → PermissionGroup[]
//  RolesStore.getEmployeePermissions(empId) → PermissionMap  (effective)
//  RolesStore.getEmployeeOverrides(empId)   → PermissionMap  (delta only)
//  RolesStore.saveEmployeeOverrides(empId, perms) → void
//  RolesStore.resetEmployee(empId)          → void
//  RolesStore.reset()                       → void
// ═══════════════════════════════════════════════════════════════

(function (global) {
  "use strict";

  const LS_KEY = "officesync_roles_v1";

  // ─── Permission Groups (UI structure, matches Figma exactly) ──
  const PERMISSION_GROUPS = [
    {
      id: "tasks", label: "TASKS",
      type: "checkbox",
      columns: [
        [
          { id: "view_assigned_tasks",       label: "View assigned tasks" },
          { id: "assign_subtasks",           label: "Assign subtasks to members" },
          { id: "review_member_submissions", label: "Review member submissions" },
        ],
        [
          { id: "create_subtasks",           label: "Create subtasks" },
          { id: "create_top_level_tasks",    label: "Create top-level tasks" },
          { id: "delete_tasks",              label: "Delete tasks" },
        ],
      ],
    },
    {
      id: "escalation", label: "ESCALATION",
      type: "checkbox",
      columns: [
        [{ id: "escalate_to_pm",      label: "Escalate to PM" }],
        [{ id: "resolve_escalations", label: "Resolve escalations" }],
      ],
    },
    {
      id: "projects", label: "PROJECTS & PROCESSES",
      type: "checkbox",
      columns: [
        [
          { id: "view_assigned_projects", label: "View assigned projects" },
          { id: "view_process_stages",    label: "View process stages" },
        ],
        [
          { id: "create_projects", label: "Create projects" },
          { id: "edit_processes",  label: "Edit processes" },
        ],
      ],
    },
    {
      id: "compliance", label: "COMPLIANCE",
      type: "checkbox",
      columns: [
        [
          { id: "submit_evidence",        label: "Submit evidence" },
          { id: "view_compliance_status", label: "View compliance status" },
        ],
        [
          { id: "approve_evidence",        label: "Approve evidence" },
          { id: "manage_compliance_rules", label: "Manage compliance rules" },
        ],
      ],
    },
    {
      id: "settings", label: "SETTINGS",
      type: "toggle",
      items: [
        { id: "change_own_password",   label: "Can change own password" },
        { id: "manage_team_members",   label: "Can manage team members" },
      ],
    },
  ];

  // ─── Helper: all permission IDs as a flat array ────────────────
  function _allPermIds() {
    const ids = [];
    PERMISSION_GROUPS.forEach(g => {
      if (g.type === "checkbox") {
        g.columns.forEach(col => col.forEach(p => ids.push(p.id)));
      } else {
        g.items.forEach(p => ids.push(p.id));
      }
    });
    return ids;
  }

  // ─── Default permissions per system role ───────────────────────
  // Keys map to HRStore employee.role values.
  const DEFAULT_ROLE_PERMISSIONS = {
    "Team Member": {
      view_assigned_tasks: true,  assign_subtasks: false,
      review_member_submissions: false, create_subtasks: false,
      create_top_level_tasks: false, delete_tasks: false,
      escalate_to_pm: true, resolve_escalations: false,
      view_assigned_projects: true, view_process_stages: false,
      create_projects: false, edit_processes: false,
      submit_evidence: true, view_compliance_status: true,
      approve_evidence: false, manage_compliance_rules: false,
      change_own_password: true, manage_team_members: false,
    },
    "Team Leader": {
      view_assigned_tasks: true,  assign_subtasks: true,
      review_member_submissions: true, create_subtasks: true,
      create_top_level_tasks: false, delete_tasks: false,
      escalate_to_pm: true, resolve_escalations: false,
      view_assigned_projects: true, view_process_stages: true,
      create_projects: false, edit_processes: false,
      submit_evidence: true, view_compliance_status: true,
      approve_evidence: false, manage_compliance_rules: false,
      change_own_password: false, manage_team_members: false,
    },
    "Project Manager": {
      view_assigned_tasks: true,  assign_subtasks: true,
      review_member_submissions: true, create_subtasks: true,
      create_top_level_tasks: true, delete_tasks: true,
      escalate_to_pm: false, resolve_escalations: true,
      view_assigned_projects: true, view_process_stages: true,
      create_projects: true, edit_processes: true,
      submit_evidence: true, view_compliance_status: true,
      approve_evidence: false, manage_compliance_rules: false,
      change_own_password: true, manage_team_members: true,
    },
    "Process Admin": {
      view_assigned_tasks: true,  assign_subtasks: false,
      review_member_submissions: false, create_subtasks: false,
      create_top_level_tasks: false, delete_tasks: false,
      escalate_to_pm: true, resolve_escalations: false,
      view_assigned_projects: true, view_process_stages: true,
      create_projects: true, edit_processes: true,
      submit_evidence: false, view_compliance_status: true,
      approve_evidence: false, manage_compliance_rules: false,
      change_own_password: true, manage_team_members: false,
    },
    "Compliance Officer": {
      view_assigned_tasks: false, assign_subtasks: false,
      review_member_submissions: false, create_subtasks: false,
      create_top_level_tasks: false, delete_tasks: false,
      escalate_to_pm: true, resolve_escalations: false,
      view_assigned_projects: false, view_process_stages: false,
      create_projects: false, edit_processes: false,
      submit_evidence: true, view_compliance_status: true,
      approve_evidence: true, manage_compliance_rules: true,
      change_own_password: true, manage_team_members: false,
    },
    "HR Manager": {
      view_assigned_tasks: false, assign_subtasks: false,
      review_member_submissions: false, create_subtasks: false,
      create_top_level_tasks: false, delete_tasks: false,
      escalate_to_pm: false, resolve_escalations: false,
      view_assigned_projects: false, view_process_stages: false,
      create_projects: false, edit_processes: false,
      submit_evidence: false, view_compliance_status: false,
      approve_evidence: false, manage_compliance_rules: false,
      change_own_password: true, manage_team_members: true,
    },
    "HR Ops": {
      view_assigned_tasks: false, assign_subtasks: false,
      review_member_submissions: false, create_subtasks: false,
      create_top_level_tasks: false, delete_tasks: false,
      escalate_to_pm: false, resolve_escalations: false,
      view_assigned_projects: false, view_process_stages: false,
      create_projects: false, edit_processes: false,
      submit_evidence: false, view_compliance_status: false,
      approve_evidence: false, manage_compliance_rules: false,
      change_own_password: true, manage_team_members: false,
    },
  };

  // ─── Role metadata (dot colour, display order) ─────────────────
  const ROLE_META = [
    { key: "Team Member",        color: "#64748b", dotColor: "#94a3b8" },
    { key: "Team Leader",        color: "#2563eb", dotColor: "#2563eb" },
    { key: "Project Manager",    color: "#7c3aed", dotColor: "#7c3aed" },
    { key: "Process Admin",      color: "#d97706", dotColor: "#d97706" },
    { key: "Compliance Officer", color: "#e11d48", dotColor: "#e11d48" },
    { key: "HR Manager",         color: "#16a34a", dotColor: "#16a34a" },
    { key: "HR Ops",             color: "#16a34a", dotColor: "#16a34a" },
  ];

  // ─── Dept hierarchy: which roles are "superior" to a given role ─
  // Used by individual-roles page to limit what can be granted.
  const DEPT_HIERARCHY = {
    Operations: ["Project Manager", "Process Admin", "Team Leader", "Team Member"],
    Finance:    ["Project Manager", "Team Leader", "Team Member"],
    IT:         ["Project Manager", "Team Leader", "Team Member"],
    HR:         ["HR Manager", "HR Ops"],
    Compliance: ["Compliance Officer", "Team Member"],
  };

  // ─── localStorage helpers ──────────────────────────────────────
  function _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function _save(store) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); }
    catch (e) { console.warn("RolesStore: localStorage write failed.", e); }
  }

  // Bootstrap: merge stored data with defaults (new roles added later get defaults)
  function _getStore() {
    const stored = _load() || {};
    // System roles: fill any missing role from defaults
    const systemRoles = stored.systemRoles || {};
    Object.keys(DEFAULT_ROLE_PERMISSIONS).forEach(roleKey => {
      if (!systemRoles[roleKey]) {
        systemRoles[roleKey] = { ...DEFAULT_ROLE_PERMISSIONS[roleKey] };
      }
    });
    return {
      systemRoles,
      individualOverrides: stored.individualOverrides || {},
    };
  }

  // ─── Public API ────────────────────────────────────────────────
  const RolesStore = {

    /** Ordered list of role keys with metadata */
    getAllSystemRoles() {
      const store = _getStore();
      return ROLE_META.map(meta => ({
        key:         meta.key,
        color:       meta.color,
        dotColor:    meta.dotColor,
        permissions: { ...store.systemRoles[meta.key] },
      }));
    },

    /** Single system role config */
    getSystemRole(roleKey) {
      const store = _getStore();
      const meta  = ROLE_META.find(m => m.key === roleKey) || { color:"#64748b", dotColor:"#94a3b8" };
      return {
        key:         roleKey,
        color:       meta.color,
        dotColor:    meta.dotColor,
        permissions: { ...(store.systemRoles[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey] || {}) },
      };
    },

    /** Persist updated permissions for a system role */
    saveSystemRole(roleKey, permissions) {
      const store = _getStore();
      store.systemRoles[roleKey] = { ...permissions };
      _save(store);
      console.log(`[RolesStore] Saved system role "${roleKey}":`, permissions);
    },

    /** UI permission group structure */
    getPermissionGroups() {
      return PERMISSION_GROUPS;
    },

    /** Role display metadata array */
    getRoleMeta() {
      return ROLE_META;
    },

    /** Dept hierarchy map */
    getDeptHierarchy() {
      return DEPT_HIERARCHY;
    },

    /**
     * Effective permissions for a specific employee.
     * = their system role defaults merged with any individual overrides.
     * Individual overrides take full precedence over system role.
     */
    getEmployeePermissions(empId, roleKey) {
      const store    = _getStore();
      const base     = { ...(store.systemRoles[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey] || {}) };
      const overrides = store.individualOverrides[empId];
      if (!overrides) return base;
      // Overrides are a full permission map; merge over base
      return { ...base, ...overrides };
    },

    /**
     * Returns the individual override map for an employee (or null if none).
     * This is the DELTA stored, not the effective permissions.
     */
    getEmployeeOverrides(empId) {
      const store = _getStore();
      return store.individualOverrides[empId] || null;
    },

    /**
     * Save a full permission map as the individual override for an employee.
     * Pass null to clear overrides (reset to role defaults).
     */
    saveEmployeeOverrides(empId, permissions) {
      const store = _getStore();
      if (permissions === null) {
        delete store.individualOverrides[empId];
      } else {
        store.individualOverrides[empId] = { ...permissions };
      }
      _save(store);
      console.log(`[RolesStore] Saved overrides for ${empId}:`, permissions);
    },

    /** Remove all individual overrides for an employee */
    resetEmployee(empId) {
      this.saveEmployeeOverrides(empId, null);
    },

    /** Wipe everything back to defaults */
    reset() {
      localStorage.removeItem(LS_KEY);
      console.log("[RolesStore] Reset to defaults.");
    },

    // Expose constants for use by page scripts
    DEFAULT_ROLE_PERMISSIONS,
    DEPT_HIERARCHY,
  };

  global.RolesStore = RolesStore;

}(window));
