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

  const LS_EMP = "officesync_hr_employees_v2";
  const LS_ACT = "officesync_hr_activity_v2";

  // ─── Seed Employees ──────────────────────────────────────────
  const SEED = [
    {
      id: "EMP-001",
      name: "Arjun Mehta",
      initials: "AM",
      color: "#2563eb",
      role: "Project Manager",
      department: "Operations",
      team: "Operations-Core",
      parentId: null,
      status: "active",
      joined: "Jan 2022",
      joinDateRaw: "2022-01-10",
      email: "arjun.mehta@officesync.in",
      phone: "+91 98765 43210",
    },
    {
      id: "EMP-004",
      name: "Priya Sharma",
      initials: "PS",
      color: "#7c3aed",
      role: "Team Leader",
      department: "Finance",
      team: "Finance-Alpha",
      parentId: "EMP-001",
      status: "active",
      joined: "Mar 2022",
      joinDateRaw: "2022-03-15",
      email: "priya.sharma@officesync.in",
      phone: "+91 98765 43211",
    },
    {
      id: "EMP-007",
      name: "Kiran Rao",
      initials: "KR",
      color: "#1e3a5f",
      role: "Team Leader",
      department: "IT",
      team: "IT-Infra",
      parentId: "EMP-001",
      status: "active",
      joined: "Jun 2022",
      joinDateRaw: "2022-06-01",
      email: "kiran.rao@officesync.in",
      phone: "+91 98765 43212",
    },
    {
      id: "EMP-012",
      name: "Ravi Kumar",
      initials: "RK",
      color: "#16a34a",
      role: "Team Member",
      department: "Finance",
      team: "Finance-Alpha",
      parentId: "EMP-004",
      status: "active",
      joined: "Sep 2023",
      joinDateRaw: "2023-09-05",
      email: "ravi.kumar@officesync.in",
      phone: "+91 98765 43213",
    },
    {
      id: "EMP-018",
      name: "Sonam Jain",
      initials: "SJ",
      color: "#d97706",
      role: "Team Member",
      department: "Finance",
      team: "Finance-Alpha",
      parentId: "EMP-004",
      status: "active",
      joined: "Nov 2022",
      joinDateRaw: "2022-11-20",
      email: "sonam.jain@officesync.in",
      phone: "+91 98765 43214",
    },
    {
      id: "EMP-021",
      name: "Meera Bose",
      initials: "MB",
      color: "#e11d48",
      role: "Team Member",
      department: "Finance",
      team: "Finance-Alpha",
      parentId: "EMP-004",
      status: "active",
      joined: "Feb 2023",
      joinDateRaw: "2023-02-14",
      email: "meera.bose@officesync.in",
      phone: "+91 98765 43215",
    },
    {
      id: "EMP-015",
      name: "Neha Patil",
      initials: "NP",
      color: "#0d9488",
      role: "Team Member",
      department: "IT",
      team: "IT-Infra",
      parentId: "EMP-007",
      status: "active",
      joined: "Nov 2023",
      joinDateRaw: "2023-11-01",
      email: "neha.patil@officesync.in",
      phone: "+91 98765 43216",
    },
    {
      id: "EMP-027",
      name: "Anil Tiwari",
      initials: "AT",
      color: "#6d28d9",
      role: "Team Member",
      department: "IT",
      team: "IT-Infra",
      parentId: "EMP-007",
      status: "active",
      joined: "Mar 2023",
      joinDateRaw: "2023-03-07",
      email: "anil.tiwari@officesync.in",
      phone: "+91 98765 43217",
    },
    {
      id: "EMP-003",
      name: "Shreya Chandra",
      initials: "SC",
      color: "#e11d48",
      role: "Compliance Officer",
      department: "Compliance",
      team: null,
      parentId: null,
      status: "active",
      joined: "Feb 2022",
      joinDateRaw: "2022-02-01",
      email: "shreya.chandra@officesync.in",
      phone: "+91 98765 43218",
    },
    {
      id: "EMP-031",
      name: "Vikram Patel",
      initials: "VP",
      color: "#7c3aed",
      role: "Process Admin",
      department: "Operations",
      team: null,
      parentId: null,
      status: "active",
      joined: "May 2022",
      joinDateRaw: "2022-05-10",
      email: "vikram.patel@officesync.in",
      phone: "+91 98765 43219",
    },
    {
      id: "EMP-DN",
      name: "Divya Nair",
      initials: "DN",
      color: "#16a34a",
      role: "HR Manager",
      department: "HR",
      team: null,
      parentId: null,
      status: "active",
      joined: "Jan 2021",
      joinDateRaw: "2021-01-04",
      email: "divya.nair@officesync.in",
      phone: "+91 98765 43220",
    },
    {
      id: "EMP-041",
      name: "Jayesh Puri",
      initials: "JP",
      color: "#94a3b8",
      role: "HR Ops",
      department: "HR",
      team: null,
      parentId: null,
      status: "pending",
      joined: "Dec 2024",
      joinDateRaw: "2024-12-01",
      email: "jayesh.puri@officesync.in",
      phone: "+91 98765 43221",
    },
  ];

  // ─── Seed Activity Log ────────────────────────────────────────
  function _seedActivity() {
    return {
      "EMP-001": [
        {
          id: 1,
          text: "Profile created and account provisioned",
          date: "Jan 10, 2022",
        },
        {
          id: 2,
          text: "Assigned as Project Manager for Operations-Core",
          date: "Jan 12, 2022",
        },
        { id: 3, text: "Created project Atlas", date: "Nov 15, 2024" },
        {
          id: 4,
          text: "Assigned task Finance Q4 Reporting to Priya Sharma",
          date: "Nov 28, 2024",
        },
        {
          id: 5,
          text: "Resolved escalation for Client Data Verification",
          date: "Dec 17, 2024",
        },
      ],
      "EMP-004": [
        {
          id: 1,
          text: "Profile created and account provisioned",
          date: "Mar 15, 2022",
        },
        {
          id: 2,
          text: "Assigned as Team Leader for Finance-Alpha",
          date: "Mar 16, 2022",
        },
        {
          id: 3,
          text: "Completed Q3 Finance Audit review",
          date: "Oct 5, 2024",
        },
      ],
      "EMP-007": [
        {
          id: 1,
          text: "Profile created and account provisioned",
          date: "Jun 1, 2022",
        },
        {
          id: 2,
          text: "Assigned as Team Leader for IT-Infra",
          date: "Jun 2, 2022",
        },
        { id: 3, text: "Led server migration project", date: "Aug 12, 2024" },
      ],
    };
  }

  const DEPT_TEAMS = {
    Operations: ["Operations-Core", "Operations-Support"],
    Finance: ["Finance-Alpha", "Finance-Beta"],
    IT: ["IT-Infra", "IT-Dev", "IT-Security"],
    HR: ["HR-Ops", "HR-Talent"],
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
  const HR_EDIT_ROLES = ["HR Manager", "HR Ops", "superuser"];

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
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      _saveEmps(SEED);
      return [...SEED];
    }
    return stored;
  }

  function _initActivity() {
    const stored = _loadActivity();
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
  const CURRENT_USER_ID = "EMP-DN";

  // ─── Public API ───────────────────────────────────────────────
  const HRStore = {
    getAll() {
      return [..._initEmps()];
    },
    getById(id) {
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
      // ✅ THE INTEGRATION HOOK: Send to Master Auth Database & Notify!
      // ────────────────────────────────────────────────────────
      if (typeof getUsers === "function" && typeof saveUsers === "function") {
        const masterUsers = getUsers();

        // 🔍 TRANSLATION MAGIC: Map HR's "EMP-XXX" to Master DB's "uX"
        let masterManagerId = null;
        if (emp.parentId) {
          // Find the manager in HR to get their email
          const hrManager = emps.find((e) => e.id === emp.parentId);
          if (hrManager) {
            // Find that same email in the Master Auth database
            const authManager = masterUsers.find(
              (u) => u.email === hrManager.email,
            );
            if (authManager) {
              masterManagerId = authManager.id; // Correctly grabs "u7" (Kiran)
            }
          }
        }

        // 1. Save to Auth Database
        masterUsers.push({
          id: id,
          email: emp.email,
          password: "123", // Default password for new employees
          role: emp.role.toLowerCase().replace(/ /g, "_"),
          name: emp.name,
          department: emp.department,
          status: emp.status,
          reportsTo: masterManagerId, // ✅ Links perfectly to "u7"!
        });
        saveUsers(masterUsers);
        console.log(`[Auth Sync] Created login credentials for ${emp.email}`);

        // 2. Create a Notification specifically for the Team Leader
        if (masterManagerId) {
          let notifications =
            JSON.parse(localStorage.getItem("system_notifications")) || [];

          notifications.push({
            id: Date.now(),
            targetUserId: masterManagerId, // ✅ Targets "u7" so Kiran actually sees it
            title: "New Team Member Assigned",
            message: `HR has assigned ${emp.name} to your team.`,
            type: "info",
            date: new Date().toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            }),
            read: false,
          });

          localStorage.setItem(
            "system_notifications",
            JSON.stringify(notifications),
          );
        }
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
