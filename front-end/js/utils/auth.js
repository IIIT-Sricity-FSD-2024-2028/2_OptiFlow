// js/utils/auth.js

// ─────────────────────────────────────────
// SMART ROUTER
// ─────────────────────────────────────────
function goToLogin() {
  // If running over HTTP(S), redirect to root /login.html
  if (window.location.protocol.startsWith('http')) {
    const rootPath = window.location.origin ? window.location.origin + '/login.html' : '/login.html';
    window.location.replace(rootPath);
    return;
  }

  const path = window.location.pathname.toLowerCase();

  // If we are 2 folders deep (e.g., /admin/pm/ or /enduser/leader/)
  if (
    path.includes("/admin/pm/") ||
    path.includes("/admin/hr/") ||
    path.includes("/admin/compliance/") ||
    path.includes("/admin/executive/") ||
    path.includes("/admin/processes/") ||
    path.includes("/enduser/member/") ||
    path.includes("/enduser/leader/")
  ) {
    window.location.replace("../../login.html");
  }
  // If we are 1 folder deep (e.g., /admin/, /enduser/, /modules/)
  else if (
    path.includes("/admin/") ||
    path.includes("/admin-console/") ||
    path.includes("/superuser/") ||
    path.includes("/enduser/") ||
    path.includes("/platform-admin/") ||
    path.includes("/modules/")
  ) {
    window.location.replace("../login.html");
  }
  // If we are at the root
  else {
    window.location.replace("login.html");
  }
}

// ─────────────────────────────────────────
// PART 1: Standard Auth Guards
// ─────────────────────────────────────────

function protectPage(allowedRoles) {
  const currentUserStr = sessionStorage.getItem("currentUser");

  if (!currentUserStr) {
    goToLogin();
    return;
  }

  const currentUser = JSON.parse(currentUserStr);

  // "God-mode": superuser / company owner can access PM module pages
  if (currentUser && (currentUser.role === "superuser" || currentUser.role === "company_owner")) return;

  if (!allowedRoles.includes(currentUser.role)) {
    if (window.Toast && typeof window.Toast.show === 'function') {
      window.Toast.show("error", "Access Denied", "You do not have permission to view this page.");
      // Add slight delay to allow toast to render
      setTimeout(() => goToLogin(), 1500);
    } else {
      alert("You do not have permission to view this page.");
      goToLogin();
    }
  }
}

function clearAppSession() {
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("selectedProjectId");
  sessionStorage.removeItem("officesync_global_state");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("selectedProjectId");
  localStorage.removeItem("officesync_global_state");
  if (window.Helpers) window.Helpers._stateCache = null;
}

function logout() {
  clearAppSession();
  goToLogin();
}

// ─────────────────────────────────────────
// PART 2: The PM Integration Bridge
// ─────────────────────────────────────────

window.Auth = {
  logout() {
    clearAppSession();
    goToLogin();
  },

  getSession() {
    const raw = sessionStorage.getItem("currentUser");
    if (!raw) return null;
    const u = JSON.parse(raw);

    // 1. Translate string roles to exactly what the PM module wants
    let rId = 5;
    let pmRoleName = "Team_Member";
    const r = String(u.role || u.roleLabel || "").toLowerCase().replace(/[\s\-]/g, "_");
    const roleLabel = String(u.roleLabel || u.assignedRole || u.role || "").toLowerCase();

    if (r === "company_owner" || roleLabel.includes('owner') || roleLabel.includes('ceo')) {
      rId = 1;
      pmRoleName = "Company_Owner";
    } else if (r === "superuser" || r === "owner" || r === "system_admin") {
      rId = 1;
      pmRoleName = "SuperUser";
    } else if (r === "platform_admin") {
      rId = 0;
      pmRoleName = "Platform_Admin";
    } else if (r === "process_admin" || roleLabel.includes('process')) {
      rId = 7;
      pmRoleName = "Process_Admin";
    } else if (r === "hr_manager" || roleLabel.includes('hr') || roleLabel.includes('governance')) {
      rId = 6;
      pmRoleName = "HR_Manager";
    } else if (r === "project_manager") {
      rId = 2;
      pmRoleName = "Project_Manager";
    } else if (r === "compliance_officer") {
      rId = 3;
      pmRoleName = "Compliance_Officer";
    } else if (r === "team_leader") {
      rId = 4;
      pmRoleName = "Team_Leader";
    }

    // 2. Generate clean Avatar Initials
    const initials = u.name
      ? u.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "??";

    const rawNumericId =
      typeof u.id === "number"
        ? u.id
        : parseInt(String(u.id ?? "").replace(/\D/g, ""), 10) || null;

    return {
      id: u.id,
      rawId: rawNumericId != null ? rawNumericId : u.id,
      name: u.name,
      email: u.email,
      role: r,
      roleId: rId,
      roleName: pmRoleName,
      subRole: r === "team_leader" ? "team_leader" : "member",
      companyId: u.companyId || (u.company && u.company.id) || "b7744408-190c-4b83-82c5-ab0049afb6b2",
      avatar: initials,
      avatarColor: "blue",
      projectId: u.projectId, // Passthrough for dashboards
      reportsTo: u.reportsTo, // Passthrough for dashboards
    };
  },

  requireRole(roleGroup) {
    const session = this.getSession();
    if (!session) {
      goToLogin();
      return null;
    }
    return session;
  },

  can(slug) {
    const session = this.getSession();
    if (!session) return false;

    // Superusers (1) and Project Managers (2) can do everything
    if (session.roleId === 1 || session.roleId === 2) return true;

    // Team Leaders (4) can only do task-related actions
    if (session.roleId === 4 && slug.startsWith("task:")) return true;

    return false;
  },
};
