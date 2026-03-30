// js/utils/auth.js

// ─────────────────────────────────────────
// PART 1: Standard Auth Guards (For your core pages)
// ─────────────────────────────────────────

function protectPage(allowedRoles) {
  const currentUserStr = sessionStorage.getItem("currentUser");

  // If no one is logged in, kick them to login
  if (!currentUserStr) {
    window.location.replace("../login.html");
    return;
  }

  const currentUser = JSON.parse(currentUserStr);

  // If the user's role isn't in the allowed list, kick them out
  if (!allowedRoles.includes(currentUser.role)) {
    alert("You do not have permission to view this page.");
    window.location.replace("../../login.html");
  }
}

function logout() {
  sessionStorage.removeItem("currentUser");
  window.location.href = "../../login.html";
}

// ─────────────────────────────────────────
// PART 2: The PM Integration Bridge
// ─────────────────────────────────────────
// Your teammate's PM files are expecting a 'window.Auth' object.
// This adapter seamlessly translates your master session into the format they need!

window.Auth = {
  logout() {
    // 1. Clear the session
    sessionStorage.removeItem("currentUser");

    // 2. Smart redirect back to the login page
    const path = window.location.pathname.toLowerCase();
    if (
      path.includes("/admin/pm/") ||
      path.includes("/admin/hr/") ||
      path.includes("/enduser/member/") ||
      path.includes("/enduser/leader/")
    ) {
      window.location.replace("../../login.html");
    } else {
      window.location.replace("../login.html");
    }
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
    }
    if (u.role === "project_manager") {
      rId = 2;
      pmRoleName = "Project_Manager";
    }
    if (u.role === "compliance_officer") {
      rId = 3;
      pmRoleName = "Compliance_Officer";
    }
    if (u.role === "team_leader") {
      rId = 4;
      pmRoleName = "Team_Leader";
    }

    // 2. Generate Avatar Initials (e.g. "Aishwary" -> "AI")
    const initials = u.name ? u.name.substring(0, 2).toUpperCase() : "??";

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      roleId: rId,
      roleName: pmRoleName, // ✅ Now the sidebar will find the correct links!
      subRole: u.role === "team_leader" ? "team_leader" : "member",
      avatar: initials, // ✅ Fixes the "UNDEFINED" text
      avatarColor: "blue",
    };
  },

  requireRole(roleGroup) {
    const session = this.getSession();
    if (!session) {
      window.location.replace("../../login.html");
      return null;
    }
    return session;
  },

  // The PM module uses this to show/hide action buttons (like "+ Create Task")
  can(slug) {
    const session = this.getSession();
    if (!session) return false;

    // Superusers (1) and Project Managers (2) can do everything in the PM module
    if (session.roleId === 1 || session.roleId === 2) return true;

    // Team Leaders (4) can only do task-related actions
    if (session.roleId === 4 && slug.startsWith("task:")) return true;

    // Everyone else is restricted
    return false;
  },
};
