// js/utils/auth.js

// ─────────────────────────────────────────
// SMART ROUTER
// ─────────────────────────────────────────
function goToLogin() {
  const path = window.location.pathname.toLowerCase();

  // If we are 2 folders deep (e.g., /admin/pm/ or /enduser/leader/)
  if (
    path.includes("/admin/pm/") ||
    path.includes("/admin/hr/") ||
    path.includes("/enduser/member/") ||
    path.includes("/enduser/leader/")
  ) {
    window.location.replace("../../login.html");
  }
  // If we are 1 folder deep (e.g., /admin/ or /enduser/)
  else if (path.includes("/admin/") || path.includes("/enduser/")) {
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

  if (!allowedRoles.includes(currentUser.role)) {
    alert("You do not have permission to view this page.");
    goToLogin();
  }
}

function logout() {
  sessionStorage.removeItem("currentUser");
  goToLogin();
}

// ─────────────────────────────────────────
// PART 2: The PM Integration Bridge
// ─────────────────────────────────────────

window.Auth = {
  logout() {
    sessionStorage.removeItem("currentUser");
    goToLogin();
  },

  getSession() {
    const raw = sessionStorage.getItem("currentUser");
    if (!raw) return null;
    const u = JSON.parse(raw);

    // 1. Translate string roles to exactly what the PM module wants
    let rId = 5;
    let pmRoleName = "Team_Member";

    if (u.role === "superuser") {
      rId = 1;
      pmRoleName = "SuperUser";
    } else if (u.role === "project_manager") {
      rId = 2;
      pmRoleName = "Project_Manager";
    } else if (u.role === "compliance_officer") {
      rId = 3;
      pmRoleName = "Compliance_Officer";
    } else if (u.role === "team_leader") {
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

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      roleId: rId,
      roleName: pmRoleName,
      subRole: u.role === "team_leader" ? "team_leader" : "member",
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
