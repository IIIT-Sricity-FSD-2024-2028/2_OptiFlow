// hr-data-store.js v3 (Async API)
(function (global) {
  "use strict";

  const DEPT_TEAMS = {
    Operations: ["Ops-Admin", "PMO"],
    Finance: ["Finance-Audit"],
    "IT Security": ["IT-Security"],
    HR: ["HR-Talent", "HR-Ops"],
    Compliance: ["Compliance-Core"],
  };

  const MANAGER_ROLES = [
    "Project Manager",
    "Team Leader",
    "HR Manager",
    "Process Admin",
    "Compliance Officer",
  ];

  const HR_EDIT_ROLES = ["HR Manager", "HR Ops"];
  const CURRENT_USER_ID = "EMP-002";

  function mapIn(u) {
    if (!u) return null;
    const nameParts = String(u.full_name || "").trim().split(/\s+/);
    const initials =
      ((nameParts[0] || "")[0] || "").toUpperCase() +
      ((nameParts[1] || "")[0] || "").toUpperCase();

    let deptName = "Operations";
    if (u.department_id === 2) deptName = "IT Security";

    return {
      id: `EMP-${String(u.id).padStart(3, '0')}`,
      rawId: u.id,
      name: u.full_name,
      initials: initials || "??",
      color: "#2563eb",
      role: u.role,
      department: deptName,
      team: null,
      parentId: u.reports_to ? `EMP-${String(u.reports_to).padStart(3, '0')}` : null,
      status: String(u.status || "Active").toLowerCase() === "inactive" ? "inactive" : "active",
      joined: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      joinDateRaw: "",
      email: u.email,
      phone: "+91 00000 00000",
    };
  }

  function mapOut(emp) {
    let deptId = 1;
    if (emp.department === "IT Security") deptId = 2;

    const parentId = emp.parentId ? parseInt(emp.parentId.replace("EMP-", ""), 10) : null;
    
    return {
      full_name: emp.name,
      email: emp.email,
      role: emp.role,
      department_id: deptId,
      reports_to: parentId || null,
      status: emp.status === "inactive" ? "Inactive" : "Active"
    };
  }

  const HRStore = {
    async syncWithMaster() {},

    async getAll(filters = {}) {
      try {
        const users = await window.Helpers.api.request('/users');
        let mapped = users.map(mapIn);
        
        if (filters.status) mapped = mapped.filter(e => e.status === filters.status);
        if (filters.department) mapped = mapped.filter(e => e.department === filters.department);
        if (filters.role) mapped = mapped.filter(e => e.role === filters.role);
        if (filters.search) {
          const q = filters.search.toLowerCase();
          mapped = mapped.filter(e => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q));
        }
        return mapped;
      } catch (error) {
        console.error("HRStore getAll failed", error);
        return [];
      }
    },

    async getById(id) {
      if (!id) return null;
      try {
        const numericId = parseInt(id.replace("EMP-", ""), 10);
        const u = await window.Helpers.api.request(`/users/${numericId}`);
        return mapIn(u);
      } catch {
        return null;
      }
    },

    async getStats() {
      const emps = await this.getAll();
      return {
        totalMembers: emps.length,
        activeTeams: new Set(emps.map((e) => e.team).filter(Boolean)).size,
        activeNow: emps.filter((e) => e.status === "active").length,
        pendingSlots: emps.filter((e) => e.status === "pending").length,
      };
    },

    getDepartments() {
      return ["Operations", "Finance", "IT Security", "HR", "Compliance"];
    },

    getTeamsForDept(dept) {
      return [...(DEPT_TEAMS[dept] || [])];
    },

    getDeptTeamsMap() {
      return JSON.parse(JSON.stringify(DEPT_TEAMS));
    },

    async getManagers(excludeId) {
      const emps = await this.getAll();
      return emps.filter((e) => MANAGER_ROLES.includes(e.role) && e.id !== excludeId);
    },

    getManagerRoles() {
      return [...MANAGER_ROLES];
    },

    async getCurrentUser() {
      const currentId = sessionStorage.getItem("current_emp_id") || CURRENT_USER_ID;
      return await this.getById(currentId);
    },

    async canEdit() {
      const u = await this.getCurrentUser();
      return u ? HR_EDIT_ROLES.includes(u.role) : false;
    },

    async getActivity(empId) {
      try {
        const numericId = parseInt(empId.replace("EMP-", ""), 10);
        return await window.Helpers.api.request(`/users/${numericId}/activities`);
      } catch {
        return [];
      }
    },

    async addActivity(empId, text) {
      try {
        const numericId = parseInt(empId.replace("EMP-", ""), 10);
        await window.Helpers.api.request(`/users/${numericId}/activities`, 'POST', { text });
      } catch (e) {
        console.warn("Could not save activity", e);
      }
    },

    async add(payload) {
      try {
        const mappedPayload = mapOut(payload);
        const u = await window.Helpers.api.request('/users', 'POST', mappedPayload);
        const emp = mapIn(u);
        return { ok: true, employee: emp, stats: await this.getStats() };
      } catch (e) {
        console.error("HRStore add failed", e);
        return { ok: false, errors: { server: e.message } };
      }
    },

    async update(id, payload) {
      try {
        const numericId = parseInt(id.replace("EMP-", ""), 10);
        const mappedPayload = mapOut(payload);
        const u = await window.Helpers.api.request(`/users/${numericId}`, 'PATCH', mappedPayload);
        return { ok: true, employee: mapIn(u) };
      } catch (e) {
        return { ok: false, errors: { server: e.message } };
      }
    },

    async setStatus(id, newStatus) {
      try {
        const numericId = parseInt(id.replace("EMP-", ""), 10);
        const apiStatus = newStatus === 'inactive' ? 'Inactive' : 'Active';
        const u = await window.Helpers.api.request(`/users/${numericId}`, 'PATCH', { status: apiStatus });
        return { ok: true, employee: mapIn(u) };
      } catch (e) {
        return { ok: false };
      }
    },

    async reset() {}
  };

  global.HRStore = HRStore;
})(window);
