// hr-data-store.js v4 (Aligned with 11-table snake_case schema)
(function (global) {
  "use strict";



  const MANAGER_ROLES = [
    "project_manager",
    "team_leader",
    "hr_manager",
    "superuser",
    "compliance_officer",
  ];

  const ROLE_DISPLAY = {
    superuser:          "Process Admin",
    project_manager:    "Project Manager",
    compliance_officer: "Compliance Officer",
    hr_manager:         "HR Manager",
    team_leader:        "Team Leader",
    team_member:        "Team Member",
  };

  const HR_EDIT_ROLES = ["hr_manager"];
  const CURRENT_USER_ID = "EMP-007"; // Kiran Patel (hr_manager)

  // ── Avatar colour palette ──────────────────────────────────────────────────
  const COLORS = [
    "#2563eb", "#7c3aed", "#059669", "#d97706",
    "#dc2626", "#0891b2", "#db2777", "#16a34a",
  ];
  function colorFor(id) {
    return COLORS[(id || 0) % COLORS.length];
  }

  // ── Map backend User → HR employee object ──────────────────────────────────
  async function mapIn(u) {
    if (!u) return null;
    const globalState = await window.Helpers.getState();

    // PK is user_id in the new schema
    const numericId = u.user_id ?? u.id;
    const deptObj = globalState.departments.find(d => String(d.departmentId) === String(u.department_id));
    const deptName  = deptObj ? deptObj.departmentName : `Dept ${u.department_id}`;
    const nameParts = String(u.full_name || "").trim().split(/\s+/);
    const initials  =
      ((nameParts[0] || "")[0] || "").toUpperCase() +
      ((nameParts[1] || "")[0] || "").toUpperCase() || "??";
    const isActive  = u.is_active !== false && u.is_active !== "Inactive";

    return {
      id:          `EMP-${String(numericId).padStart(3, "0")}`,
      rawId:       numericId,
      name:        u.full_name || "Unknown",
      initials,
      color:       colorFor(numericId),
      // Store both slug (for guards) and display name
      role:        ROLE_DISPLAY[u.role] || u.role,
      roleSlug:    u.role,
      department:  deptName,
      team:        u.teamName || null,
      parentId:    u.manager_id
        ? `EMP-${String(u.manager_id).padStart(3, "0")}`
        : null,
      status:      isActive ? "active" : "inactive",
      joined:      u.created_at
        ? new Date(u.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
        : new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      joinDateRaw: u.created_at || "",
      email:       u.email || "",
      phone:       u.phone || "",
    };
  }

  // ── Map HR employee → backend PATCH/POST body ──────────────────────────────
  async function mapOut(emp) {
    const globalState = await window.Helpers.getState();

    // Reverse ROLE_DISPLAY to find the slug
    const DISPLAY_TO_SLUG = Object.fromEntries(
      Object.entries(ROLE_DISPLAY).map(([k, v]) => [v, k])
    );
    const roleSlug = DISPLAY_TO_SLUG[emp.role] || emp.roleSlug || emp.role;

    // Reverse DEPT_MAP
    const deptObj = globalState.departments.find(d => d.departmentName === emp.department);
    const deptId = deptObj ? deptObj.departmentId : 1;

    const parentNumericId = emp.parentId
      ? parseInt(emp.parentId.replace("EMP-", ""), 10)
      : null;

    return {
      full_name:     emp.name,
      email:         emp.email,
      phone:         emp.phone || null,
      role:          roleSlug,
      department_id: deptId,
      team:          emp.team || null,
      manager_id:    parentNumericId || null,
      is_active:     emp.status !== "inactive",
    };
  }

  // ── HRStore ────────────────────────────────────────────────────────────────
  const HRStore = {
    // No-op: data is now always fetched live from the backend
    async syncWithMaster() {},

  async getAll(filters = {}) {
      try {
        // Force the app to run getState() so all the roles are mapped properly!
        const globalState = await window.Helpers.getState();
        
        // Grab the 'users' array out of that fully mapped state
        let mapped = globalState.users || [];

        // Apply filters (if any)
        if (filters.status)     mapped = mapped.filter(e => e.status === filters.status);
        if (filters.department) mapped = mapped.filter(e => e.departmentId === filters.department || e.department === filters.department);
        
        // Use the new snake_case properties from the backend
        if (filters.role)       mapped = mapped.filter(e => e.roleId === filters.role || e.roleName === filters.role);
        
        if (filters.search) {
          const q = filters.search.toLowerCase();
          mapped = mapped.filter(
            e => e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
          );
        }
        
    // Finally, map it into the old "EMP-000" format the HR dashboard expects
        return mapped.map(u => {
            return {
              id:          `EMP-${String(u.userId).padStart(3, "0")}`,
              rawId:       u.userId,
              name:        u.fullName || "Unknown",
              initials:    u.avatar || "??",
              color:       colorFor(u.userId),
              
              // FIX: Translate snake_case into beautiful Title Case!
              role:        ROLE_DISPLAY[u.roleName] || u.roleName, 
              roleSlug:    u.roleName, 
              
              department:  u.departmentName || `Dept ${u.departmentId}`,
              team:        u.teamName || null,
              
              // FIX: Re-add the manager connection so the Org Chart Tree works!
              parentId:    u.managerId ? `EMP-${String(u.managerId).padStart(3, "0")}` : null,
              
              status:      u.status,
              joined:      u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—",
              email:       u.email || "",
              phone:       u.phone || "",
            };
        });

      } catch (error) {
        console.error("HRStore.getAll failed:", error);
        return [];
      }
    },

async getById(id) {
      if (!id) return null;
      try {
        // FORCE it to use the beautifully mapped data from getAll()
        // This instantly fixes the "undefined" role issue!
        const allEmployees = await this.getAll();
        return allEmployees.find(e => e.id === id) || null;
      } catch (error) {
        console.error("HRStore.getById failed:", error);
        return null;
      }
    },
    async getStats() {
      const emps = await this.getAll();
      const globalState = await window.Helpers.getState();
      const teamCount = globalState.teams.length;
      return {
        totalMembers: emps.length,
        activeTeams:  teamCount,
        activeNow:    emps.filter(e => e.status === "active").length,
        pendingSlots: emps.filter(e => e.status === "pending").length,
      };
    },

    async getDepartments() {
      const globalState = await window.Helpers.getState();
      return globalState.departments.map(d => d.departmentName);
    },

    async getTeamsForDept(dept) {
      const globalState = await window.Helpers.getState();
      const deptObj = globalState.departments.find(d => d.departmentName === dept);
      if (!deptObj) return [];
      return globalState.teams.filter(t => t.departmentId === deptObj.departmentId).map(t => t.teamName);
    },

    async getDeptTeamsMap() {
      const globalState = await window.Helpers.getState();
      const map = {};
      globalState.teams.forEach(t => {
         const dept = globalState.departments.find(d => String(d.departmentId) === String(t.departmentId));
         if (dept) {
            const dName = dept.departmentName;
            if (!map[dName]) map[dName] = [];
            map[dName].push(t.teamName);
         }
      });
      return map;
    },

    async getManagers(excludeId) {
      const emps = await this.getAll();
      return emps.filter(e => MANAGER_ROLES.includes(e.roleSlug) && e.id !== excludeId);
    },

    getManagerRoles() {
      return [...MANAGER_ROLES];
    },

    async getCurrentUser() {
      const sessionRaw = sessionStorage.getItem("currentUser");
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw);
          // Try to find by email first
          const all = await this.getAll();
          const match = all.find(e =>
            e.email && session.email &&
            e.email.toLowerCase() === session.email.toLowerCase()
          );
          if (match) return match;
        } catch {}
      }
      const currentId = sessionStorage.getItem("current_emp_id") || CURRENT_USER_ID;
      return await this.getById(currentId);
    },

    async canEdit() {
      const u = await this.getCurrentUser();
      return u ? HR_EDIT_ROLES.includes(u.roleSlug) : false;
    },

    async getActivity(empId) {
      try {
        const numericId = parseInt(String(empId).replace('EMP-', ''), 10);
        const acts = await window.Helpers.api.request(`/users/${numericId}/activities`, "GET");
        return acts.map(a => {
          const date = new Date(a.timestamp);
          return {
            text: a.action,
            date: date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          };
        });
      } catch (err) {
        console.warn("[HRStore] Activity fetch failed:", err);
        return [];
      }
    },

    async addActivity(empId, text) {
      // No-op until backend activity endpoint is implemented
      console.log(`[HRStore] Activity logged for ${empId}: ${text}`);
    },

    async add(payload) {
      try {
        const body = await mapOut(payload);
        body.password_hash = "default_hash";
        const u = await window.Helpers.api.request("/users", "POST", body);
        const emp = await mapIn(u);

        // ── Audit Log: Employee Created ──────────────────────────────────
        if (emp && emp.rawId) {
          const actorId = (() => {
            try { const s = JSON.parse(sessionStorage.getItem("currentUser") || "{}"); return typeof s.id === "number" ? s.id : parseInt(String(s.id||"").replace(/\D/g,""),10)||null; } catch { return null; }
          })();
          if (window.AuditStore) {
            window.AuditStore.add(
              "USER_CREATED",
              "User",
              emp.rawId,
              { performedBy: actorId, newValue: { name: emp.name, role: body.role, email: emp.email, department_id: body.department_id } }
            );
          }
        }

        return { ok: true, employee: emp, stats: await this.getStats() };
      } catch (e) {
        console.error("HRStore.add failed:", e);
        return { ok: false, errors: { server: e.message } };
      }
    },

    async update(id, payload) {
      try {
        const numericId = parseInt(String(id).replace("EMP-", ""), 10);
        const body = await mapOut(payload);
        const u = await window.Helpers.api.request(`/users/${numericId}`, "PATCH", body);

        // ── Audit Log: Employee Updated ──────────────────────────────────
        const actorId = (() => {
          try { const s = JSON.parse(sessionStorage.getItem("currentUser") || "{}"); return typeof s.id === "number" ? s.id : parseInt(String(s.id||"").replace(/\D/g,""),10)||null; } catch { return null; }
        })();
        if (window.AuditStore) {
          window.AuditStore.add(
            "USER_UPDATED",
            "User",
            numericId,
            { performedBy: actorId, newValue: body }
          );
        }

        return { ok: true, employee: await mapIn(u) };
      } catch (e) {
        return { ok: false, errors: { server: e.message } };
      }
    },

    async setStatus(id, newStatus) {
      try {
        const numericId = parseInt(String(id).replace("EMP-", ""), 10);
        const is_active = newStatus !== "inactive";
        const u = await window.Helpers.api.request(
          `/users/${numericId}`, "PATCH", { is_active }
        );

        // ── Audit Log: Status Changed ─────────────────────────────────────
        const actorId = (() => {
          try { const s = JSON.parse(sessionStorage.getItem("currentUser") || "{}"); return typeof s.id === "number" ? s.id : parseInt(String(s.id||"").replace(/\D/g,""),10)||null; } catch { return null; }
        })();
        if (window.AuditStore) {
          window.AuditStore.add(
            "STATUS_CHANGE",
            "User",
            numericId,
            { performedBy: actorId, oldValue: { is_active: !is_active }, newValue: { is_active } }
          );
        }

        return { ok: true, employee: await mapIn(u) };
      } catch (e) {
        return { ok: false };
      }
    },

    async reset() {}, // No-op
  };

  global.HRStore = HRStore;
})(window);
