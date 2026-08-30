// roles-store.js
// ═══════════════════════════════════════════════════════════════
// Persistent roles & permissions store (API-backed)
//
// Exports global: RolesStore
// ═══════════════════════════════════════════════════════════════

(function (global) {
  "use strict";

  // ─── Permission Groups (UI structure) ──
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
    "Superuser": {
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

  const ROLE_META = [
    { key: "Team Member",        color: "#64748b", dotColor: "#94a3b8" },
    { key: "Team Leader",        color: "#2563eb", dotColor: "#2563eb" },
    { key: "Project Manager",    color: "#7c3aed", dotColor: "#7c3aed" },
    { key: "Superuser",          color: "#d97706", dotColor: "#d97706" },
    { key: "Compliance Officer", color: "#e11d48", dotColor: "#e11d48" },
    { key: "HR Manager",         color: "#16a34a", dotColor: "#16a34a" },
    { key: "HR Ops",             color: "#16a34a", dotColor: "#16a34a" },
  ];

  const DEPT_HIERARCHY = {
    Operations: ["Project Manager", "Superuser", "Team Leader", "Team Member"],
    Finance:    ["Project Manager", "Team Leader", "Team Member"],
    IT:         ["Project Manager", "Team Leader", "Team Member"],
    HR:         ["HR Manager", "HR Ops"],
    Compliance: ["Compliance Officer", "Team Member"],
  };

  function normalizeRoleKey(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s\-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "") || "team_member";
    return normalized === "process_admin" ? "superuser" : normalized;
  }

  function getRoleListFromServer(serverRoles) {
    if (Array.isArray(serverRoles)) return serverRoles;
    if (!serverRoles || typeof serverRoles !== "object") return [];
    if (Array.isArray(serverRoles.data)) return serverRoles.data;
    if (Array.isArray(serverRoles.roles)) return serverRoles.roles;
    return Object.values(serverRoles);
  }

  function normalizePermissions(role) {
    const permissions = {};
    const addPermission = (permission) => {
      if (!permission) return;
      const slug = permission.slug || permission.key || permission.id;
      if (slug) permissions[slug] = true;
    };

    const addCollection = (collection) => {
      if (!Array.isArray(collection)) return;
      collection.forEach((entry) => addPermission(entry.permission || entry));
    };

    if (role && typeof role.permissions === "object" && !Array.isArray(role.permissions)) {
      Object.entries(role.permissions).forEach(([key, value]) => {
        permissions[key] = Boolean(value);
      });
    } else {
      addCollection(role && role.permissions);
    }
    addCollection(role && role.roleTemplate && role.roleTemplate.defaultPermissions);
    addCollection(role && role.roleTemplate && role.roleTemplate.permissions);

    return permissions;
  }

  const RolesStore = {
    async getAllSystemRoles() {
      try {
        const serverRoles = await window.Helpers.api.request('/roles', 'GET');
        const roleList = getRoleListFromServer(serverRoles);
        const merged = [...ROLE_META.map(meta => ({
          id: null,
          key: meta.key,
          isSystem: true,
          color: meta.color,
          dotColor: meta.dotColor,
          permissions: { ...(DEFAULT_ROLE_PERMISSIONS[meta.key] || {}) },
        }))];

        roleList.forEach((role) => {
          const rawKey = role.key || role.name || role.label || role.slug || role.roleName || "";
          const key = normalizeRoleKey(rawKey) === "superuser"
            ? "Superuser"
            : String(rawKey || "").trim();
          if (!key) return;
          const normalized = normalizeRoleKey(key);
          const existingIndex = merged.findIndex(item => normalizeRoleKey(item.key) === normalized);
          const permissions = normalizePermissions(role);
          const entry = {
            id: role.id,
            key,
            isSystem: role.isSystem !== false,
            color: role.color || merged.find(item => normalizeRoleKey(item.key) === normalized)?.color || "#64748b",
            dotColor: role.dotColor || merged.find(item => normalizeRoleKey(item.key) === normalized)?.dotColor || "#94a3b8",
            permissions: Object.keys(permissions).length
              ? permissions
              : { ...(DEFAULT_ROLE_PERMISSIONS[key] || {}) },
          };

          if (existingIndex >= 0) {
            merged[existingIndex] = entry;
          } else {
            merged.push(entry);
          }
        });

        return merged;
      } catch {
        return ROLE_META.map(meta => ({
          key: meta.key,
          color: meta.color,
          dotColor: meta.dotColor,
          permissions: { ...(DEFAULT_ROLE_PERMISSIONS[meta.key] || {}) },
        }));
      }
    },

    async getSystemRole(roleKey) {
      try {
        const roles = await this.getAllSystemRoles();
        const normalizedKey = normalizeRoleKey(roleKey);
        const match = roles.find((item) => normalizeRoleKey(item.key) === normalizedKey);
        if (match) {
          return match;
        }

        const slug = String(roleKey).toLowerCase().replace(/ /g, '_');
        const sRole = await window.Helpers.api.request(`/roles/${encodeURIComponent(slug)}`, 'GET');
        const meta = ROLE_META.find(m => normalizeRoleKey(m.key) === normalizedKey) || { color:"#64748b", dotColor:"#94a3b8" };
        const permissions = normalizePermissions(sRole);
        return {
          key: roleKey,
          color: meta.color,
          dotColor: meta.dotColor,
          permissions: Object.keys(permissions).length
            ? permissions
            : { ...(DEFAULT_ROLE_PERMISSIONS[roleKey] || {}) },
        };
      } catch {
        const roles = await this.getAllSystemRoles();
        const normalizedKey = normalizeRoleKey(roleKey);
        const match = roles.find((item) => normalizeRoleKey(item.key) === normalizedKey);
        if (match) return match;

        const meta = ROLE_META.find(m => normalizeRoleKey(m.key) === normalizedKey) || { color:"#64748b", dotColor:"#94a3b8" };
        return {
          key: roleKey,
          color: meta.color,
          dotColor: meta.dotColor,
          permissions: { ...(DEFAULT_ROLE_PERMISSIONS[roleKey] || {}) },
        };
      }
    },

    async saveSystemRole(roleKey, permissions) {
      try {
        const roles = await this.getAllSystemRoles();
        const role = roles.find((item) => normalizeRoleKey(item.key) === normalizeRoleKey(roleKey));
        const identifier = role && role.id ? role.id : roleKey;
        await window.Helpers.api.request(`/roles/${encodeURIComponent(identifier)}`, 'PATCH', { permissions });
        return true;
      } catch (e) {
        console.error("RolesStore: API system role write failed.", e);
        throw e;
      }
    },

    async createSystemRole(label, permissions = {}) {
      if (!String(label || "").trim()) {
        throw new Error("Role name is required");
      }
      return window.Helpers.api.request("/roles", "POST", {
        role_name: String(label).trim(),
        is_system: false,
        permissions,
      });
    },

    async deleteSystemRole(role) {
      const roleId = typeof role === "object" ? role.id : role;
      if (!roleId) throw new Error("This system role cannot be deleted.");
      return window.Helpers.api.request(`/roles/${encodeURIComponent(roleId)}`, "DELETE");
    },

    getPermissionGroups() {
      return PERMISSION_GROUPS;
    },

    async assignUserRole(userId, roleId, scopeType = "Company", scopeId = null) {
      try {
        const state = await window.Helpers.getState();
        const companyId = state.companyId || "75bdae98-37a7-4c46-8b0e-74a4a531efbc";
        
        return await window.Helpers.api.request("/role-assignments", "POST", {
          userId: userId,
          roleId: roleId,
          scopeType: scopeType,
          scopeId: scopeId || companyId
        });
      } catch (e) {
        console.error("Failed to assign role to user:", e);
        throw e;
      }
    },

    getRoleMeta() {
      return ROLE_META;
    },

    getDeptHierarchy() {
      return DEPT_HIERARCHY;
    },

    async getEmployeePermissions(empId, roleKey) {
      try {
        const base = await this.getSystemRole(roleKey);
        const overrides = await this.getEmployeeOverrides(empId);
        if (!overrides) return base.permissions;
        return { ...base.permissions, ...overrides };
      } catch {
        return { ...(DEFAULT_ROLE_PERMISSIONS[roleKey] || {}) };
      }
    },

    async getEmployeeOverrides(empId) {
      try {
        const numericId = parseInt(String(empId).replace(/\D/g, ''), 10);
        return await window.Helpers.api.request(`/roles/overrides/${numericId}`, 'GET');
      } catch {
        return null;
      }
    },

    async saveEmployeeOverrides(empId, permissions) {
      try {
        const numericId = parseInt(String(empId).replace(/\D/g, ''), 10);
        if (permissions === null) {
          await window.Helpers.api.request(`/roles/overrides/${numericId}`, 'DELETE');
        } else {
          await window.Helpers.api.request(`/roles/overrides/${numericId}`, 'PUT', { permissions });
        }
      } catch (e) {
        console.warn("RolesStore: API overrides write failed.", e);
      }
    },

    async resetEmployee(empId) {
      await this.saveEmployeeOverrides(empId, null);
    },

    async reset() {
      try {
        await window.Helpers.api.request('/roles/reset', 'POST');
      } catch (e) {
        console.warn("RolesStore: API reset failed.", e);
      }
    },

    DEFAULT_ROLE_PERMISSIONS,
    DEPT_HIERARCHY,
  };

  global.RolesStore = RolesStore;

}(window));
