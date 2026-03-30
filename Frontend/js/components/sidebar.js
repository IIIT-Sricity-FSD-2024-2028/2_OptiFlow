/**
 * Sidebar component — updated for new role names and consistency
 */
window.Sidebar = {
  navConfig: {
    SuperUser: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "grid",
        href: "dashboard.html",
      },
      { id: "users", label: "Users", icon: "users", href: "users.html" },
      {
        id: "departments",
        label: "Departments",
        icon: "office",
        href: "departments.html",
      },
      {
        id: "workflows",
        label: "Workflows",
        icon: "flow",
        href: "workflows.html",
      },
      { id: "audit", label: "Audit Log", icon: "audit", href: "audit.html" },
    ],
    Project_Manager: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "grid",
        href: "pm-dashboard.html",
      },
      {
        id: "projects",
        label: "Projects",
        icon: "folder",
        href: "projects.html",
      },
      {
        id: "escalations",
        label: "Escalations",
        icon: "alert",
        href: "violations.html",
        badge: "escalations",
      },
      {
        id: "compliance",
        label: "Compliance",
        icon: "shield",
        href: "compliance-dashboard.html",
        badge: "violations",
      },
    ],
    Team_Leader: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "grid",
        href: "tl-dashboard.html",
      },
      { id: "tasks", label: "My Tasks", icon: "tasks", href: "my-tasks.html" },
      { id: "evidence", label: "Evidence", icon: "doc", href: "evidence.html" },
    ],
    Team_Member: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "grid",
        href: "member-dashboard.html",
      },
      { id: "tasks", label: "My Tasks", icon: "tasks", href: "my-tasks.html" },
      { id: "evidence", label: "Evidence", icon: "doc", href: "evidence.html" },
    ],
  },

  icons: {
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    office: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    flow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>`,
    audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    logo: `<img id="sidebar-logo-img" src="REPLACE_ME" alt="OfficeSync" style="height:28px;object-fit:contain;display:block">`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  },

  render(activeId) {
    const session = window.Auth.getSession();
    if (!session) return;

    const navItems = this.navConfig[session.roleName] || [];
    const state = window.Helpers.getState();

    // Compute badge counts
    const escalationCount = state.escalations
      ? state.escalations.filter((e) => e.status === "open").length
      : 0;
    const violationCount = state.complianceViolations
      ? state.complianceViolations.filter((v) => v.status === "Open").length
      : 0;

    const navHTML = navItems
      .map((item) => {
        const isActive = item.id === activeId;
        let badge = "";
        if (item.badge === "escalations" && escalationCount > 0) {
          badge = `<span class="nav-badge">${escalationCount}</span>`;
        }
        if (item.badge === "violations" && violationCount > 0) {
          badge = `<span class="nav-badge">${violationCount}</span>`;
        }
        return `
        <a href="${item.href}" class="nav-item ${isActive ? "active" : ""}">
          ${this.icons[item.icon]}
          <span>${item.label}</span>
          ${badge}
        </a>`;
      })
      .join("");

    const displayRole = session.roleName.replace("_", " ");

    // Calculate asset prefix dynamically based on folder depth
    let prefix = "./";
    const path = window.location.pathname.toLowerCase();

    // Are we TWO folders deep? (e.g., /admin/pm/, /admin/hr/)
    if (
      path.includes("/admin/pm/") ||
      path.includes("/admin/hr/") ||
      path.includes("/enduser/member/") ||
      path.includes("/enduser/leader/")
    ) {
      prefix = "../../";
    }
    // Are we ONE folder deep? (e.g., /superuser/, /admin/)
    else if (
      path.includes("/admin/") ||
      path.includes("/superuser/") ||
      path.includes("/enduser/")
    ) {
      prefix = "../";
    }

    const logoHTML = this.icons.logo.replace(
      "REPLACE_ME",
      prefix + "assets/images/logo_light.png",
    );

    const html = `
      <div class="sidebar-logo" style="padding:18px 16px 14px">
        ${logoHTML}
      </div>
      <div class="sidebar-section-label">Main</div>
      <nav class="sidebar-nav">${navHTML}</nav>
      <div class="sidebar-bottom">
        <div class="sidebar-settings" onclick="window.location.href='${prefix}admin/pm/settings.html'">
          ${this.icons.settings}
          <span>Settings</span>
        </div>
        <div class="sidebar-user" style="align-items:flex-start">          <div class="avatar avatar-sm avatar-${session.avatarColor}" style="margin-top:2px">${session.avatar}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${session.name}</div>
            <div class="sidebar-user-role">${displayRole}</div>
            <div class="sidebar-logout" onclick="window.Auth.logout()" style="display:flex;align-items:center;gap:6px;color:#ef4444;font-size:10px;font-weight:700;text-transform:uppercase;margin-top:8px;cursor:pointer">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Logout</span>
            </div>
          </div>
        </div>
      </div>`;

    const container = document.getElementById("sidebar");
    if (container) container.innerHTML = html;
  },
};
