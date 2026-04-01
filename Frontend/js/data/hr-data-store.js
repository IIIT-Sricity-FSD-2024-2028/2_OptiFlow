// hr-data-store.js  v2
// ═══════════════════════════════════════════════════════════════
// Shared persistent data store for the OfficeSync HR module.
// Uses localStorage → survives tab closes, browser restarts.
//
// Public API
// ──────────────────────────────────────────────────────────────
//  HRStore.getAll()                    → Employee[]
//  HRStore.getById(id)                 → Employee | null
//  HRStore.add(payload)                → { ok, employee, errors }
//  HRStore.update(id, payload)         → { ok, employee, errors }
//  HRStore.setStatus(id, status)       → { ok, employee }
//  HRStore.getDepartments()            → string[]
//  HRStore.getTeamsForDept(dept)       → string[]
//  HRStore.getManagers(excludeId?)     → Employee[]
//  HRStore.getStats()                  → StatsObj
//  HRStore.getCurrentUser()            → Employee  (logged-in HR user)
//  HRStore.canEdit()                   → boolean   (HR role check)
//  HRStore.getActivity(empId)          → ActivityEntry[]
//  HRStore.addActivity(empId, text)    → void
//  HRStore.reset()                     → void
// ═══════════════════════════════════════════════════════════════
(function (global) {
  "use strict";

  const HR_DB_VERSION = 11; // Demo Ecosystem reset (Office Ecosystem v11)
  const LS_VER = "hr_db_version";
  const LS_EMP = "officesync_hr_employees_v2";
  const LS_ACT = "officesync_hr_activity_v2";

  // ─── Master Auth sync helpers (db.js users[]) ─────────────────
  function _normEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function _hrRoleToAuthRole(hrRole) {
    const r = String(hrRole || "")
      .trim()
      .toLowerCase();
    if (r === "process admin") return "superuser";
    if (r === "hr manager") return "hr_manager";
    if (r === "hr ops") return "hr_ops";
    if (r === "project manager") return "project_manager";
    if (r === "team leader") return "team_leader";
    if (r === "team member") return "team_member";
    if (r === "compliance officer") return "compliance_officer";
    // Fallback: snake_case
    return r.replace(/\s+/g, "_");
  }

  function _authRoleToHrRole(authRole) {
    const r = String(authRole || "")
      .trim()
      .toLowerCase();
    const map = {
      superuser: "Process Admin",
      hr_manager: "HR Manager",
      hr_ops: "HR Ops",
      project_manager: "Project Manager",
      team_leader: "Team Leader",
      team_member: "Team Member",
      compliance_officer: "Compliance Officer",
      enduser: "Team Member",
    };
    return map[r] || authRole;
  }

  function _upsertAuthUserFromEmployee(emp) {
    if (
      typeof global.getUsers !== "function" ||
      typeof global.saveUsers !== "function"
    )
      return;

    const email = _normEmail(emp.email);
    if (!email) return;

    const users = global.getUsers();
    const idx = users.findIndex((u) => _normEmail(u.email) === email);

    const authRole = _hrRoleToAuthRole(emp.role);
    const status =
      emp.status === "inactive"
        ? "Inactive"
        : emp.status === "pending"
          ? "Pending"
          : "Active";

    // Translate HR parentId (EMP-XXX) -> Master reportsTo (uX) using email match
    let reportsTo = null;
    if (emp.parentId) {
      const emps = _initEmps();
      const mgr = emps.find((e) => String(e.id) === String(emp.parentId));
      if (mgr) {
        const mgrEmail = _normEmail(mgr.email);
        const mgrUser =
          (idx > -1 ? users : global.getUsers()).find(
            (u) => _normEmail(u.email) === mgrEmail,
          ) || null;
        reportsTo = mgrUser ? mgrUser.id : null;
      }
    }

    const next = {
      ...(idx > -1 ? users[idx] : {}),
      id: idx > -1 ? users[idx].id : "u" + Date.now(),
      email: emp.email,
      password: (idx > -1 && users[idx].password) || "123",
      name: emp.name,
      role: authRole,
      displayRole: _authRoleToHrRole(authRole),
      department: emp.department || (idx > -1 ? users[idx].department : ""),
      status: status,
      joined: emp.joined || (idx > -1 ? users[idx].joined : ""),
      reportsTo: reportsTo || (idx > -1 ? users[idx].reportsTo : null) || null,
    };

    if (idx > -1) users[idx] = next;
    else users.push(next);
    global.saveUsers(users);
  }

  function _ensureEmployeeFromAuthUser(authUser) {
    const email = _normEmail(authUser && authUser.email);
    if (!email) return;

    const emps = _initEmps();
    const idx = emps.findIndex((e) => _normEmail(e.email) === email);

    const name = authUser.name || authUser.email;
    const nameParts = String(name).trim().split(/\s+/);
    const initials =
      ((nameParts[0] || "")[0] || "").toUpperCase() +
      ((nameParts[1] || "")[0] || "").toUpperCase();

    // Create a minimal HR employee record if missing.
    // This is intentionally "prototype-friendly": it fills placeholders so dashboards can stay in sync.
    // Translate Master reportsTo (uX) -> HR parentId (EMP-XXX) using email match
    let parentId = null;
    if (authUser && authUser.reportsTo) {
      const mgrUser =
        typeof global.getUsers === "function"
          ? global
              .getUsers()
              .find((u) => String(u.id) === String(authUser.reportsTo))
          : null;
      if (mgrUser) {
        const mgrEmp = emps.find(
          (e) => _normEmail(e.email) === _normEmail(mgrUser.email),
        );
        parentId = mgrEmp ? mgrEmp.id : null;
      }
    }

    if (idx > -1) {
      const existing = emps[idx];
      existing.name = name;
      existing.role = _authRoleToHrRole(authUser.role);
      existing.department = authUser.department || existing.department;
      existing.status =
        String(authUser.status || "Active").toLowerCase() === "inactive"
          ? "inactive"
          : "active";
      if (parentId) existing.parentId = parentId;
    } else {
      const id = _nextId(emps);
      emps.push({
        id,
        name,
        initials: initials || "??",
        color: "#2563eb",
        role: _authRoleToHrRole(authUser.role),
        department: authUser.department || "Operations",
        team: null,
        parentId: parentId || null,
        status:
          String(authUser.status || "Active").toLowerCase() === "inactive"
            ? "inactive"
            : "active",
        joined:
          authUser.joined ||
          new Date().toLocaleDateString("en-IN", {
            month: "short",
            year: "numeric",
          }),
        joinDateRaw: "",
        email: authUser.email,
        phone: "+91 00000 00000",
      });
    }
    _saveEmps(emps);
  }

  function _pushSystemNotificationToRole(targetRole, notif) {
    if (typeof global.getUsers !== "function") return;
    const users = global.getUsers();
    const targets = users.filter((u) => String(u.role) === String(targetRole));
    if (targets.length === 0) return;

    let notifications =
      JSON.parse(localStorage.getItem("system_notifications")) || [];
    const base = {
      id: Date.now(),
      title: notif.title || "Notification",
      message: notif.message || "",
      type: notif.type || "info",
      date:
        notif.date ||
        new Date().toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        }),
      read: false,
    };

    targets.forEach((t, i) => {
      notifications.push({
        ...base,
        id: base.id + i,
        targetUserId: String(t.id),
      });
    });

    localStorage.setItem("system_notifications", JSON.stringify(notifications));
  }

  // ─── Seed Employees ──────────────────────────────────────────
  const SEED = [
    {
      id: "EMP-001",
      name: "Vikram Patel",
      initials: "VP",
      color: "#7c3aed",
      role: "Process Admin",
      department: "Operations",
      team: "Ops-Admin",
      parentId: null,
      status: "active",
      joined: "Oct 2024",
      joinDateRaw: "2024-10-01",
      email: "vikram.patel@officesync.in",
      phone: "+91 98765 43219",
    },
    {
      id: "EMP-002",
      name: "Divya Nair",
      initials: "DN",
      color: "#2563eb",
      role: "HR Manager",
      department: "HR",
      team: "HR-Talent",
      parentId: null,
      status: "active",
      joined: "Jan 2021",
      joinDateRaw: "2021-01-04",
      email: "divya.nair@officesync.in",
      phone: "+91 98765 43220",
    },
    {
      id: "EMP-003",
      name: "Jason C",
      initials: "JC",
      color: "#e11d48",
      role: "Compliance Officer",
      department: "Compliance",
      team: "Compliance-Core",
      parentId: null,
      status: "active",
      joined: "Mar 2024",
      joinDateRaw: "2024-03-01",
      email: "jason.c@officesync.in",
      phone: "+91 98765 43218",
    },
    {
      id: "EMP-004",
      name: "Aishwary",
      initials: "A",
      color: "#0d9488",
      role: "Project Manager",
      department: "Operations",
      team: "PMO",
      parentId: null,
      status: "active",
      joined: "Jan 2024",
      joinDateRaw: "2024-01-15",
      email: "aishwary@officesync.in",
      phone: "+91 98765 43210",
    },
    {
      id: "EMP-005",
      name: "Priya Sharma",
      initials: "PS",
      color: "#7c3aed",
      role: "Team Leader",
      department: "Finance",
      team: "Finance-Audit",
      parentId: "EMP-004",
      status: "active",
      joined: "Mar 2022",
      joinDateRaw: "2022-03-15",
      email: "priya.sharma@officesync.in",
      phone: "+91 98765 43211",
    },
    {
      id: "EMP-006",
      name: "Ravi Kumar",
      initials: "RK",
      color: "#16a34a",
      role: "Team Member",
      department: "Finance",
      team: "Finance-Audit",
      parentId: "EMP-005",
      status: "active",
      joined: "Feb 2024",
      joinDateRaw: "2024-02-15",
      email: "ravi.kumar@officesync.in",
      phone: "+91 98765 43213",
    },
    {
      id: "EMP-007",
      name: "Sonam Jain",
      initials: "SJ",
      color: "#d97706",
      role: "Team Member",
      department: "Finance",
      team: "Finance-Audit",
      parentId: "EMP-005",
      status: "active",
      joined: "Nov 2022",
      joinDateRaw: "2022-11-20",
      email: "sonam.jain@officesync.in",
      phone: "+91 98765 43214",
    },
    {
      id: "EMP-008",
      name: "Kiran Rao",
      initials: "KR",
      color: "#1e3a5f",
      role: "Team Leader",
      department: "IT Security",
      team: "IT-Security",
      parentId: "EMP-004",
      status: "active",
      joined: "Jun 2022",
      joinDateRaw: "2022-06-01",
      email: "kiran.rao@officesync.in",
      phone: "+91 98765 43212",
    },
    {
      id: "EMP-009",
      name: "Neha Patil",
      initials: "NP",
      color: "#0d9488",
      role: "Team Member",
      department: "IT Security",
      team: "IT-Security",
      parentId: "EMP-008",
      status: "active",
      joined: "Nov 2023",
      joinDateRaw: "2023-11-01",
      email: "neha.patil@officesync.in",
      phone: "+91 98765 43216",
    },
    {
      id: "EMP-010",
      name: "Anil Tiwari",
      initials: "AT",
      color: "#6d28d9",
      role: "Team Member",
      department: "IT Security",
      team: "IT-Security",
      parentId: "EMP-008",
      status: "active",
      joined: "Mar 2023",
      joinDateRaw: "2023-03-07",
      email: "anil.tiwari@officesync.in",
      phone: "+91 98765 43217",
    },
  ];

  // ─── Seed Activity Log ────────────────────────────────────────
  function _seedActivity() {
    return {
      "EMP-001": [
        {
          id: 1,
          text: "Created Process Admin account for OfficeSync demo",
          date: "Oct 01, 2024",
        },
        {
          id: 2,
          text: "Enabled global module access & unified audit logging",
          date: "Mar 28, 2026",
        },
      ],
      "EMP-002": [
        {
          id: 1,
          text: "Profile created and account provisioned",
          date: "Jan 04, 2021",
        },
        {
          id: 2,
          text: "Onboarded Anil Tiwari into IT Security",
          date: "Mar 07, 2023",
        },
      ],
      "EMP-003": [
        {
          id: 1,
          text: "Published ISO 27001 evidence requirements",
          date: "Mar 26, 2026",
        },
        {
          id: 2,
          text: "Reviewed evidence queue (ISO 27001)",
          date: "Mar 30, 2026",
        },
      ],
      "EMP-004": [
        {
          id: 1,
          text: "Created project: Q4 Financial Audit",
          date: "Mar 24, 2026",
        },
        {
          id: 2,
          text: "Created project: ISO 27001 Certification",
          date: "Mar 24, 2026",
        },
      ],
      "EMP-005": [
        {
          id: 1,
          text: "Assigned as Finance Team Leader",
          date: "Mar 16, 2022",
        },
        {
          id: 2,
          text: "Submitted Q4 audit evidence package",
          date: "Mar 29, 2026",
        },
      ],
      "EMP-008": [
        {
          id: 1,
          text: "Assigned as IT Security Team Leader",
          date: "Jun 02, 2022",
        },
        {
          id: 2,
          text: "Completed ISO access review checklist",
          date: "Mar 31, 2026",
        },
      ],
    };
  }

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

  // HR roles that are allowed to edit employee data
  const HR_EDIT_ROLES = ["HR Manager", "HR Ops"];

  const AVATAR_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#0d9488",
    "#d97706",
    "#e11d48",
    "#16a34a",
    "#0891b2",
    "#6d28d9",
    "#b45309",
    "#0369a1",
  ];

  // ─── localStorage helpers ─────────────────────────────────────
  function _loadEmps() {
    try {
      const raw = localStorage.getItem(LS_EMP);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function _saveEmps(emps) {
    try {
      localStorage.setItem(LS_EMP, JSON.stringify(emps));
    } catch (e) {
      console.warn("HRStore: localStorage write failed.", e);
    }
  }

  function _loadActivity() {
    try {
      const raw = localStorage.getItem(LS_ACT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function _saveActivity(log) {
    try {
      localStorage.setItem(LS_ACT, JSON.stringify(log));
    } catch (e) {
      console.warn("HRStore: activity write failed.", e);
    }
  }

  function _initEmps() {
    const stored = _loadEmps();
    const vRaw = localStorage.getItem(LS_VER);
    const v = parseInt(vRaw, 10);
    const needsReset = isNaN(v) || v < HR_DB_VERSION;

    if (needsReset) {
      _saveEmps(SEED);
      localStorage.setItem(LS_VER, String(HR_DB_VERSION));
      return [...SEED];
    }
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      _saveEmps(SEED);
      return [...SEED];
    }
    return stored;
  }

  function _initActivity() {
    const stored = _loadActivity();
    const vRaw = localStorage.getItem(LS_VER);
    const v = parseInt(vRaw, 10);
    const needsReset = isNaN(v) || v < HR_DB_VERSION;

    if (needsReset) {
      const seed = _seedActivity();
      _saveActivity(seed);
      return seed;
    }
    if (!stored) {
      const seed = _seedActivity();
      _saveActivity(seed);
      return seed;
    }
    return stored;
  }

  function _calcStats(emps) {
    return {
      totalMembers: emps.length,
      activeTeams: new Set(emps.map((e) => e.team).filter(Boolean)).size,
      activeNow: emps.filter((e) => e.status === "active").length,
      pendingSlots: emps.filter((e) => e.status === "pending").length,
    };
  }

  function _nextId(emps) {
    const nums = emps
      .map((e) => parseInt(e.id.replace("EMP-", ""), 10))
      .filter((n) => !isNaN(n));
    return `EMP-${String((nums.length ? Math.max(...nums) : 41) + 1).padStart(3, "0")}`;
  }

  function _fmtDate(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }

  // ─── Validation (shared by add + update) ─────────────────────
  function _validate(payload, emps, excludeId) {
    const errors = {};
    if (!payload.name || !/^[A-Za-z\s'\-]{2,100}$/.test(payload.name.trim()))
      errors.name = "Invalid name (letters only, 2–100 chars).";
    if (
      !payload.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email.trim())
    )
      errors.email = "Invalid email address.";
    else {
      const lower = payload.email.trim().toLowerCase();
      if (
        emps.some((e) => e.email.toLowerCase() === lower && e.id !== excludeId)
      )
        errors.email = "This email is already registered.";
    }
    if (!payload.department) errors.department = "Department is required.";
    if (!payload.role) errors.role = "System role is required.";
    if (!payload.phone) {
      errors.phone = "Phone is required.";
    } else {
      const digits = payload.phone.replace(/[\s\+\-\(\)]/g, "");
      if (!/^\d{8,15}$/.test(digits))
        errors.phone = "Invalid phone (8–15 digits).";
    }
    if (!payload.joined) errors.joined = "Join date is required.";
    return errors;
  }

  // ─── Current session user ─────────────────────────────────────
  // Simulates the logged-in HR admin (Divya Nair).
  // In a real app this would come from a JWT / session token.
  const CURRENT_USER_ID = "EMP-002";

  // ─── Public API ───────────────────────────────────────────────
  const HRStore = {
    /**
     * Bidirectional sync: ensure Master Auth users[] and HR employees contain the same people.
     * Matching key: email (case-insensitive).
     */
    syncWithMaster() {
      // 1) HR employees -> Master users
      _initEmps().forEach((e) => _upsertAuthUserFromEmployee(e));

      // 2) Master users -> HR employees
      if (typeof global.getUsers === "function") {
        const users = global.getUsers();
        users.forEach((u) => _ensureEmployeeFromAuthUser(u));
      }
    },

    getAll() {
      this.syncWithMaster();
      return [..._initEmps()];
    },
    getById(id) {
      this.syncWithMaster();
      return _initEmps().find((e) => e.id === id) || null;
    },
    getStats() {
      return _calcStats(_initEmps());
    },
    getDepartments() {
      return ["Operations", "Finance", "IT", "HR", "Compliance"];
    },
    getTeamsForDept(dept) {
      return [...(DEPT_TEAMS[dept] || [])];
    },
    getDeptTeamsMap() {
      return JSON.parse(JSON.stringify(DEPT_TEAMS));
    },
    getManagers(excludeId) {
      return _initEmps().filter(
        (e) => MANAGER_ROLES.includes(e.role) && e.id !== excludeId,
      );
    },
    getManagerRoles() {
      return [...MANAGER_ROLES];
    },

    /** Currently logged-in HR user */
    getCurrentUser() {
      return this.getById(CURRENT_USER_ID);
    },

    /** True if the current user has permission to edit employee records */
    canEdit() {
      const u = this.getCurrentUser();
      return u ? HR_EDIT_ROLES.includes(u.role) : false;
    },

    // ── Activity log ──────────────────────────────────────────
    getActivity(empId) {
      const log = _initActivity();
      return (log[empId] || []).slice().reverse(); // newest first
    },

    addActivity(empId, text) {
      const log = _initActivity();
      if (!log[empId]) log[empId] = [];
      const now = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const nextId = log[empId].length
        ? Math.max(...log[empId].map((a) => a.id)) + 1
        : 1;
      log[empId].push({ id: nextId, text, date: now });
      _saveActivity(log);
    },

    // ── CRUD ──────────────────────────────────────────────────
    add(payload) {
      const emps = _initEmps();
      const errors = _validate(payload, emps, null);
      if (Object.keys(errors).length) return { ok: false, errors };

      const nameParts = payload.name.trim().split(/\s+/);
      const initials =
        (
          (nameParts[0] || "")[0] ||
          (nameParts[1] || "")[0] ||
          ""
        ).toUpperCase() + ((nameParts[1] || "")[0] || "").toUpperCase();
      const id = _nextId(emps);
      const emp = {
        id,
        name: payload.name.trim(),
        initials: payload.initials || initials,
        color:
          payload.color || AVATAR_COLORS[emps.length % AVATAR_COLORS.length],
        role: payload.role,
        department: payload.department,
        team: payload.team || null,
        parentId: payload.parentId || null,
        status: payload.status || "active",
        joined: payload.joined,
        joinDateRaw: payload.joinDateRaw || "",
        email: payload.email.trim(),
        phone: payload.phone.trim(),
      };
      emps.push(emp);
      _saveEmps(emps);
      this.addActivity(id, "Profile created and account provisioned");
      console.log(`[HRStore] Added ${id} — ${emp.name}`);

      // ────────────────────────────────────────────────────────
      // ✅ THE INTEGRATION HOOK: Sync to Master Auth DB + Audit + Notify
      // ────────────────────────────────────────────────────────
      _upsertAuthUserFromEmployee(emp);

      if (global.AuditStore) {
        global.AuditStore.add(
          "HR",
          `HR added employee: ${emp.name} (${emp.email}) — ${emp.role}`,
          "Info",
        );
      }

      // Notify Superuser when leadership changes are provisioned
      const roleLower = String(emp.role || "").toLowerCase();
      if (roleLower.includes("head") || roleLower === "team leader") {
        _pushSystemNotificationToRole("superuser", {
          title: "Leadership Provisioned",
          message: `HR provisioned ${emp.name} as ${emp.role} (${emp.department}).`,
          type: "info",
          date: "Just now",
        });
      }
      // ────────────────────────────────────────────────────────
      // ────────────────────────────────────────────────────────

      return { ok: true, employee: { ...emp }, stats: _calcStats(emps) };
    },

    /**
     * Update an existing employee.
    /**
     * Update an existing employee.
     * Only editable fields: name, email, phone, department, team, role, parentId, joinDateRaw
     * Returns { ok, employee, errors }
     */
    update(id, payload) {
      const emps = _initEmps();
      const idx = emps.findIndex((e) => e.id === id);
      if (idx === -1)
        return { ok: false, errors: { id: "Employee not found." } };

      const errors = _validate(payload, emps, id);
      if (Object.keys(errors).length) return { ok: false, errors };

      const old = emps[idx];
      const nameParts = payload.name.trim().split(/\s+/);
      const initials =
        ((nameParts[0] || "")[0] || "").toUpperCase() +
        ((nameParts[1] || "")[0] || "").toUpperCase();

      const updated = {
        ...old,
        name: payload.name.trim(),
        initials: initials || old.initials,
        role: payload.role,
        department: payload.department,
        team: payload.team || null,
        parentId: payload.parentId || null,
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        joined: payload.joinDateRaw
          ? _fmtDate(payload.joinDateRaw)
          : old.joined,
        joinDateRaw: payload.joinDateRaw || old.joinDateRaw || "",
      };
      emps[idx] = updated;
      _saveEmps(emps);

      // Build activity entry describing what changed
      const changes = [];
      if (old.name !== updated.name) changes.push(`name → ${updated.name}`);
      if (old.role !== updated.role) changes.push(`role → ${updated.role}`);
      if (old.email !== updated.email) changes.push(`email updated`);
      if (old.phone !== updated.phone) changes.push(`phone updated`);
      if (old.department !== updated.department)
        changes.push(`dept → ${updated.department}`);
      if (old.team !== updated.team)
        changes.push(`team → ${updated.team || "none"}`);
      if (changes.length)
        this.addActivity(id, `Profile updated: ${changes.join(", ")}`);

      console.log(`[HRStore] Updated ${id} — ${updated.name}`);

      _upsertAuthUserFromEmployee(updated);

      if (global.AuditStore) {
        global.AuditStore.add(
          "HR",
          `HR updated employee: ${updated.name} (${updated.email})`,
          "Info",
        );
      }

      // Notify Superuser when leadership role is provisioned/changed
      const roleLower = String(updated.role || "").toLowerCase();
      if (roleLower.includes("head") || roleLower === "team leader") {
        _pushSystemNotificationToRole("superuser", {
          title: "Leadership Updated",
          message: `HR updated leadership: ${updated.name} is now ${updated.role} (${updated.department}).`,
          type: "info",
          date: "Just now",
        });
      }

      return { ok: true, employee: { ...updated } };
    },

    /**
     * Change account status: "active" | "inactive" | "pending"
     */
    setStatus(id, status) {
      const emps = _initEmps();
      const idx = emps.findIndex((e) => e.id === id);
      if (idx === -1) return { ok: false };
      const old = emps[idx].status;
      emps[idx] = { ...emps[idx], status };
      _saveEmps(emps);
      this.addActivity(id, `Account ${old} → ${status}`);
      console.log(`[HRStore] ${id} status: ${old} → ${status}`);

      _upsertAuthUserFromEmployee(emps[idx]);
      if (global.AuditStore) {
        global.AuditStore.add(
          "HR",
          `HR changed status: ${emps[idx].name} (${emps[idx].email}) ${old} → ${status}`,
          status === "inactive" ? "Medium" : "Info",
        );
      }

      return { ok: true, employee: { ...emps[idx] } };
    },

    /** Reset to seed (dev helper) */
    reset() {
      localStorage.removeItem(LS_EMP);
      localStorage.removeItem(LS_ACT);
      console.log("[HRStore] Reset to seed data.");
    },
  };

  global.HRStore = HRStore;
})(window);
