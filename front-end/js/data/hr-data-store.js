// hr-data-store.js v4 (Aligned with 11-table snake_case schema)
(function (global) {
  "use strict";



  const MANAGER_ROLES = [
    "project_manager",
    "team_leader",
    "hr_manager",
    "superuser",
    "process_admin",
    "company_owner",
    "compliance_officer",
  ];

  const ROLE_DISPLAY = {
    superuser:          "Superuser",
    company_owner:      "Company Owner",
    process_admin:      "Superuser",
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

  function normalizeRoleKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s\-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      || "team_member";
  }

  function formatRoleLabel(value, fallback = "Team Member") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    const slug = normalizeRoleKey(raw);
    if (ROLE_DISPLAY[slug]) return ROLE_DISPLAY[slug];
    if (slug === "process_admin") return "Superuser";
    return raw
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  // ── Map backend User → HR employee object ──────────────────────────────────
  async function mapIn(u) {
    if (!u) return null;
    const globalState = await window.Helpers.getState();

    const rawId = String(u.userId || u.id || "");
    const branches = globalState.branches || globalState.departments || [];
    const deptRef = u.branchId || u.department_id || u.departmentId || u.branch_id || u.department;
    const deptObj = branches.find(d => String(d.id || d.branchId || d.departmentId) === String(deptRef));
    const deptName = deptObj ? (deptObj.name || deptObj.departmentName || deptObj.branchName) : (u.departmentName || u.branchName || u.department || "Operations");
    const nameParts = String(u.fullName || u.full_name || "").trim().split(/\s+/);
    const initials  =
      ((nameParts[0] || "")[0] || "").toUpperCase() +
      ((nameParts[1] || "")[0] || "").toUpperCase() || "??";
    const roleSlug = normalizeRoleKey(u.roleName || u.role || u.roleSlug || u.role_id || "team_member");
    const roleDisplay = formatRoleLabel(u.roleLabel || u.roleName || u.role || roleSlug, "Team Member");
    const isActive  = u.isActive !== false && u.status !== "Inactive";

    return {
      id:          rawId,
      rawId:       rawId,
      name:        u.fullName || u.full_name || "Unknown",
      initials,
      color:       colorFor(rawId),
      role:        roleDisplay,
      roleSlug:    roleSlug,
      roleLabel:   roleDisplay,
      branch:      deptName,
      department:  deptName,
      team:        u.teamName || u.team || null,
      parentId:    u.managerUserId || u.manager_id ? String(u.managerUserId || u.manager_id) : null,
      status:      isActive ? "active" : "inactive",
      joined:      u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
        : new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      joinDateRaw: u.createdAt || "",
      email:       u.email || "",
      phone:       u.phone || "",
      permissions: u.permissions || {},
    };
  }

  async function mapOut(emp) {
    const globalState = await window.Helpers.getState();

    const roleInput = String(emp.role || emp.roleSlug || emp.roleName || "").trim();
    const roleSlug =
      normalizeRoleKey(roleInput) ||
      normalizeRoleKey(Object.keys(ROLE_DISPLAY).find(key => ROLE_DISPLAY[key] === roleInput) || "") ||
      normalizeRoleKey(emp.roleSlug || emp.role || "team_member");

    const branches = globalState.branches || globalState.departments || [];
    const deptObj = branches.find(d =>
      (d.name || d.departmentName || d.branchName || d.label) === emp.branch ||
      String(d.id || d.departmentId || d.branchId) === String(emp.branch)
    );
    const deptId = deptObj ? (deptObj.id || deptObj.departmentId || deptObj.branchId) : null;

    const session = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("currentUser") || "{}");
      } catch {
        return {};
      }
    })();
    const companyId = globalState.companyId || session.companyId;
    if (!companyId) {
      throw new Error("Your session is missing a company ID. Please sign in again.");
    }

    const parentId = emp.parentId && !String(emp.parentId).startsWith("EMP-")
      ? String(emp.parentId)
      : null;

    return {
      full_name:     emp.name,
      email:         emp.email,
      companyId,
      phone:         emp.phone || null,
      role:          roleSlug,
      branchId:      deptId,
      managerUserId: parentId || null,
      is_active:     emp.status !== "inactive",
    };
  }

  const HRStore = {
    async syncWithMaster() {},

    async getAll(filters = {}) {
      try {
        const globalState = await window.Helpers.getState();
        let mapped = globalState.users || [];

        if (filters.status)     mapped = mapped.filter(e => e.status === filters.status || (filters.status === "active" ? e.isActive !== false : e.isActive === false));
        if (filters.branch) mapped = mapped.filter(e => e.branchId === filters.branch || e.department === filters.branch);
        if (filters.role)       mapped = mapped.filter(e => e.roleId === filters.role || e.roleName === filters.role);
        
        if (filters.search) {
          const q = filters.search.toLowerCase();
          mapped = mapped.filter(
            e => (e.fullName || "").toLowerCase().includes(q) || (e.email || "").toLowerCase().includes(q)
          );
        }
        
        const deduped = [];
        const seenIds = new Set();

        mapped.forEach((u) => {
          const rawId = String(u.userId || u.id || u.employeeId || u.user_id || "").trim();
          const emailKey = String(u.email || "").trim().toLowerCase();
          const dedupeKey = rawId || emailKey;
          if (!dedupeKey || seenIds.has(dedupeKey)) return;
          seenIds.add(dedupeKey);

          const roleKey = normalizeRoleKey(u.roleName || u.role || u.roleSlug || u.role_id || "team_member");
          const displayRole = formatRoleLabel(u.roleLabel || u.roleName || u.role || roleKey, "Team Member");
          const deptName = u.departmentName || u.branchName || u.department || (u.branchId ? `Branch ${u.branchId}` : "Operations");

          deduped.push({
            id:          rawId || emailKey,
            rawId:       rawId || emailKey,
            name:        u.fullName || u.name || "Unknown",
            initials:    u.avatar || (u.fullName ? u.fullName.substring(0, 2).toUpperCase() : "??"),
            color:       colorFor(rawId || emailKey),
            role:        displayRole,
            roleSlug:    roleKey,
            roleLabel:   displayRole,
            branch:      deptName,
            department:  deptName,
            team:        u.teamName || u.team || u.team_name || null,
            parentId:    u.managerId ? `EMP-${String(u.managerId).padStart(3, "0")}` : (u.managerUserId || u.manager_id ? String(u.managerUserId || u.manager_id) : null),
            status:      u.status || (u.isActive === false ? "inactive" : "active"),
            joined:      u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—",
            email:       u.email || "",
            phone:       u.phone || "",
            permissions: u.permissions || {},
          });
        });

        return deduped;

      } catch (error) {
        console.error("HRStore.getAll failed:", error);
        return [];
      }
    },

async getById(id) {
      if (!id) return null;
      try {
    const allEmployees = await this.getAll();
    const normalizedTarget = String(id).trim();
    return (
      allEmployees.find(e => String(e.id) === normalizedTarget) ||
      allEmployees.find(e => String(e.rawId || e.id) === normalizedTarget) ||
      allEmployees.find(e => String(e.id).replace(/\D/g, "") === normalizedTarget.replace(/\D/g, "")) ||
      null
    );
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
      const sources = globalState.departments || globalState.branches || [];
      const names = sources
        .map(d => d.departmentName || d.name || d.branchName || d.branch || d.label)
        .filter(Boolean);
      return [...new Set(names)];
    },

    async getTeams() {
      const globalState = await window.Helpers.getState();
      const teamList = (globalState.teams || []).map(t => t.teamName || t.name || t.label).filter(Boolean);
      if (teamList.length) return [...new Set(teamList)];

      const sources = globalState.departments || globalState.branches || [];
      return [...new Set(
        sources
          .map(d => d.departmentName || d.name || d.branchName || d.branch || d.label)
          .filter(Boolean)
      )];
    },

    async getTeamsForDept(dept) {
      const globalState = await window.Helpers.getState();
      const departments = globalState.departments || globalState.branches || [];
      const deptObj = departments.find(d => (d.departmentName || d.name || d.branchName || d.branch) === dept);
      if (!deptObj) return [];
      const deptId = deptObj.departmentId || deptObj.id || deptObj.branchId;
      return (globalState.teams || []).filter(t => String(t.departmentId || t.branchId) === String(deptId)).map(t => t.teamName || t.name);
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
