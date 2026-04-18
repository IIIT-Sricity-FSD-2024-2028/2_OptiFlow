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

  const ROLE_META = [
    { key: "Team Member",        color: "#64748b", dotColor: "#94a3b8" },
    { key: "Team Leader",        color: "#2563eb", dotColor: "#2563eb" },
    { key: "Project Manager",    color: "#7c3aed", dotColor: "#7c3aed" },
    { key: "Process Admin",      color: "#d97706", dotColor: "#d97706" },
    { key: "Compliance Officer", color: "#e11d48", dotColor: "#e11d48" },
    { key: "HR Manager",         color: "#16a34a", dotColor: "#16a34a" },
    { key: "HR Ops",             color: "#16a34a", dotColor: "#16a34a" },
  ];

  const DEPT_HIERARCHY = {
    Operations: ["Project Manager", "Process Admin", "Team Leader", "Team Member"],
    Finance:    ["Project Manager", "Team Leader", "Team Member"],
    IT:         ["Project Manager", "Team Leader", "Team Member"],
    HR:         ["HR Manager", "HR Ops"],
    Compliance: ["Compliance Officer", "Team Member"],
  };

  const RolesStore = {
    async getAllSystemRoles() {
      try {
        const serverRoles = await window.Helpers.api.request('/roles', 'GET');
        return ROLE_META.map(meta => {
          const sRole = serverRoles.find(r => r.key === meta.key);
          return {
            key: meta.key,
            color: meta.color,
            dotColor: meta.dotColor,
            permissions: sRole ? sRole.permissions : { ...(DEFAULT_ROLE_PERMISSIONS[meta.key] || {}) },
          };
        });
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
        const sRole = await window.Helpers.api.request(`/roles/${encodeURIComponent(roleKey)}`, 'GET');
        const meta = ROLE_META.find(m => m.key === roleKey) || { color:"#64748b", dotColor:"#94a3b8" };
        return {
          key: roleKey,
          color: meta.color,
          dotColor: meta.dotColor,
          permissions: sRole.permissions || { ...(DEFAULT_ROLE_PERMISSIONS[roleKey] || {}) },
        };
      } catch {
        const meta = ROLE_META.find(m => m.key === roleKey) || { color:"#64748b", dotColor:"#94a3b8" };
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
        await window.Helpers.api.request(`/roles/${encodeURIComponent(roleKey)}`, 'PATCH', { permissions });
      } catch (e) {
        console.warn("RolesStore: API system role write failed.", e);
      }
    },

    getPermissionGroups() {
      return PERMISSION_GROUPS;
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
        return await window.Helpers.api.request(`/roles/overrides/${empId}`, 'GET');
      } catch {
        return null;
      }
    },

    async saveEmployeeOverrides(empId, permissions) {
      try {
        if (permissions === null) {
          await window.Helpers.api.request(`/roles/overrides/${empId}`, 'DELETE');
        } else {
          await window.Helpers.api.request(`/roles/overrides/${empId}`, 'PUT', { permissions });
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
