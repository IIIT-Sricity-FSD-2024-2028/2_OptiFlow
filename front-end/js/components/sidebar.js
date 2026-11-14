window.Auth = window.Auth || {};
window.Auth.getSession = window.Auth.getSession || function() {
  const sessionStr = sessionStorage.getItem("currentUser");
  if (!sessionStr) return null;
  try { return JSON.parse(sessionStr); } catch (e) { return null; }
};
window.Auth.logout = window.Auth.logout || function() {
  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("selectedProjectId");
  sessionStorage.removeItem("officesync_global_state");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("selectedProjectId");
  localStorage.removeItem("officesync_global_state");
  if (window.Helpers) window.Helpers._stateCache = null;

  if (window.location.protocol.startsWith('http')) {
    const rootPath = window.location.origin ? window.location.origin + '/login.html' : '/login.html';
    window.location.replace(rootPath);
    return;
  }

  const path = window.location.pathname.toLowerCase();
  let prefix = "./";
  if (path.includes("/admin/pm/") || path.includes("/admin/hr/") || path.includes("/admin/compliance/") || path.includes("/admin/executive/") || path.includes("/admin/processes/") || path.includes("/enduser/member/") || path.includes("/enduser/leader/")) {
    prefix = "../../";
  } else if (path.includes("/admin-console/") || path.includes("/admin/") || path.includes("/superuser/") || path.includes("/enduser/") || path.includes("/platform-admin/") || path.includes("/modules/")) {
    prefix = "../";
  }
  window.location.href = prefix + "login.html";
};

window.Sidebar = {
  navConfig: {
    System_Admin: [
      { type: "section", label: "Main" },
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "admin-dashboard.html", portal: "admin_console" },
      { type: "section", label: "Administration" },
      { id: "organization", label: "Organization", icon: "office", href: "admin-organization.html", portal: "admin_console" },
      { id: "billing", label: "Billing", icon: "folder", href: "admin-billing.html", portal: "admin_console" },
      { id: "governance", label: "Users & Roles", icon: "users", href: "admin-governance.html", portal: "admin_console" },
    ],
    Branch_Manager: [
      { type: "section", label: "Command Center" },
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "executive_dashboard.html", portal: "executive" },
      { type: "section", label: "Branch Intelligence" },
      { id: "projects", label: "Projects", icon: "folder", href: "executive_projects.html", portal: "executive" },
      { id: "tasks", label: "Tasks", icon: "tasks", href: "executive_tasks.html", portal: "executive" },
      { id: "compliance", label: "Compliance", icon: "shield", href: "executive_compliance.html", portal: "executive", badge: "violations" },
    ],
    Company_Owner: [
      { type: "section", label: "Command Center" },
      { id: "dashboard", label: "Overview", icon: "grid", href: "executive_dashboard.html", portal: "executive" },
      { type: "section", label: "Company Intelligence" },
      { id: "projects", label: "Global Projects", icon: "folder", href: "executive_projects.html", portal: "executive" },
      { id: "tasks", label: "Global Tasks", icon: "tasks", href: "executive_tasks.html", portal: "executive" },
      { id: "compliance", label: "Compliance", icon: "shield", href: "executive_compliance.html", portal: "executive", badge: "violations" },
      { type: "section", label: "Governance" },
      { id: "reports", label: "Executive Reports", icon: "reports", href: "executive_reports.html", portal: "executive" },
    ],
    Executive: [
      { type: "section", label: "Command Center" },
      { id: "dashboard", label: "Overview", icon: "grid", href: "executive_dashboard.html", portal: "executive" },
      { type: "section", label: "Company Intelligence" },
      { id: "projects", label: "Global Projects", icon: "folder", href: "executive_projects.html", portal: "executive" },
      { id: "tasks", label: "Global Tasks", icon: "tasks", href: "executive_tasks.html", portal: "executive" },
      { id: "compliance", label: "Compliance", icon: "shield", href: "executive_compliance.html", portal: "executive", badge: "violations" },
      { type: "section", label: "Governance" },
      { id: "reports", label: "Executive Reports", icon: "reports", href: "executive_reports.html", portal: "executive" },
    ],
    SuperUser: [
      { type: "section", label: "Main" },
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "superuser/dashboard.html", absolute: true },
      { id: "overview", label: "Executive Overview", icon: "grid", href: "admin/executive/executive_dashboard.html", absolute: true },
      { id: "users", label: "Users", icon: "users", href: "superuser/users.html", absolute: true },
      { id: "workflows", label: "Processes", icon: "flow", href: "superuser/processes.html", absolute: true },
      { id: "audit", label: "Audit Log", icon: "audit", href: "superuser/audit.html", absolute: true },
      { type: "section", label: "Global Modules" },
      { id: "projects", label: "Projects", icon: "folder", href: "modules/projects.html", absolute: true },
      { id: "tasks", label: "Tasks", icon: "tasks", href: "modules/tasks.html", absolute: true },
      { id: "compliance", label: "Compliance", icon: "shield", href: "modules/compliance.html", absolute: true },
      { id: "governance", label: "Governance", icon: "hr", href: "modules/governance.html", absolute: true }
    ],
    Process_Admin: [
      { type: "section", label: "Main" },
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "superuser/dashboard.html", absolute: true },
      { id: "workflows", label: "Processes", icon: "flow", href: "superuser/processes.html", absolute: true },
      { id: "analytics", label: "Analytics", icon: "reports", href: "superuser/analytics.html", absolute: true },
      { id: "audit", label: "Audit Logs", icon: "audit", href: "superuser/audit.html", absolute: true },
    ],
    Project_Manager: [
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "admin/pm/pm-dashboard.html", absolute: true },
      { id: "projects", label: "Projects", icon: "folder", href: "modules/projects.html", absolute: true },
      { id: "tasks", label: "Tasks", icon: "tasks", href: "modules/tasks.html", absolute: true },
      { id: "escalations", label: "Escalations", icon: "alert", href: "admin/pm/violations.html", badge: "escalations", absolute: true },
      { id: "compliance", label: "Compliance", icon: "shield", href: "modules/compliance.html", badge: "violations", absolute: true }
    ],
    Compliance_Officer: [
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "modules/compliance.html", absolute: true },
      { id: "violations", label: "Violations", icon: "alert", href: "admin/compliance/compliance_violations.html", badge: "violations", absolute: true },
      { id: "evidence", label: "Evidence", icon: "folder", href: "admin/compliance/compliance_evidence.html", absolute: true },
      { id: "rules", label: "Rules", icon: "shield", href: "admin/compliance/compliance_rules.html", absolute: true },
      { id: "reports", label: "Reports", icon: "reports", href: "admin/compliance/compliance_reports.html", absolute: true },
      { id: "audit", label: "Audit Log", icon: "audit", href: "admin/compliance/compliance_audit_log.html", absolute: true }
    ],
    HR_Manager: [
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "admin/pm/hr-dashboard.html", absolute: true },
      { id: "teams", label: "Teams", icon: "users", href: "admin/hr/teams-structure.html", absolute: true },
      { id: "roles", label: "Roles & Access", icon: "shield", href: "admin/hr/roles-access.html", absolute: true }
    ],
    Team_Member: [
      { id: "tasks", label: "My Tasks", icon: "tasks", href: "enduser/member-dashboard.html", absolute: true },
      { id: "processes", label: "My Processes", icon: "flow", href: "enduser/my-tasks.html", absolute: true }
    ],
    Team_Leader: [
      { id: "dashboard", label: "Dashboard", icon: "grid", href: "enduser/tl-dashboard.html", absolute: true },
      { id: "tasks", label: "Tasks", icon: "tasks", href: "modules/tasks.html", absolute: true },
      { id: "team", label: "My Team", icon: "users", href: "enduser/team.html", absolute: true }
    ],
    Platform_Admin: [
      { type: "section", label: "Platform" },
      { id: "platform-dashboard", label: "Overview", icon: "grid", href: "platform-admin/dashboard.html", absolute: true },
      { id: "companies", label: "Companies", icon: "office", href: "platform-admin/companies.html", absolute: true },
      { id: "subscriptions", label: "Subscriptions", icon: "folder", href: "platform-admin/subscriptions.html", absolute: true },
      { id: "plans", label: "Plans", icon: "tasks", href: "platform-admin/plans.html", absolute: true },
      { id: "support-access", label: "Support Access", icon: "shield", href: "platform-admin/support-access.html", absolute: true },
      { id: "platform-admins", label: "Admins", icon: "users", href: "platform-admin/platform-admins.html", absolute: true }
    ]
  },
  icons: {
    grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
    flow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    office: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>`,
    audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    hr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11z"/><path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11z"/><path d="M8 13c-2.76 0-5 1.79-5 4v3h10v-3c0-2.21-2.24-4-5-4z"/><path d="M16 13c-1.2 0-2.3.29-3.2.78 1.35.92 2.2 2.15 2.2 3.72v2.5H21v-3c0-2.21-2.24-4-5-4z"/></svg>`,
    pm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>`,
    compliance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-5"/></svg>`,
    tasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
    logo: `<img id="sidebar-logo-img" src="REPLACE_ME" alt="OfficeSync" style="height:28px;object-fit:contain;display:block">`
  },
  async render(activeId) {
    const session = window.Auth.getSession();
    if (!session) return;

    // Normalize role slug → navConfig key
    const rawRole = (session.role || session.roleName || session.roleLabel || '').toLowerCase().replace(/[\s\-]/g, '_');
    const roleLabelLower = String(session.roleLabel || '').toLowerCase();
    let rName;
    if (rawRole === 'system_admin' || roleLabelLower.includes('system admin')) {
      rName = 'System_Admin';
    } else if (
      rawRole === 'company_owner' ||
      rawRole === 'owner' ||
      roleLabelLower.includes('owner') ||
      roleLabelLower.includes('ceo') ||
      roleLabelLower.includes('cto') ||
      roleLabelLower.includes('coo')
    ) {
      rName = 'Company_Owner';
    } else if (
      rawRole === 'branch_manager' ||
      roleLabelLower.includes('branch manager')
    ) {
      rName = 'Branch_Manager';
    } else if (rawRole === 'superuser') {
      rName = 'SuperUser';
    } else if (rawRole === 'process_admin' || roleLabelLower.includes('process') || rawRole.includes('process')) {
      rName = 'Process_Admin';
    } else if (rawRole.includes('ceo') || rawRole.includes('cto') || rawRole.includes('coo')) {
      rName = 'Company_Owner';
    } else if (rawRole === 'hr_manager' || roleLabelLower.includes('governance') || roleLabelLower.includes('hr') || rawRole.includes('governance') || rawRole.includes('hr')) {
      rName = 'HR_Manager';
    } else if (rawRole === 'compliance_officer' || rawRole.includes('compliance')) {
      rName = 'Compliance_Officer';
    } else if (rawRole === 'project_manager' || rawRole.includes('project') || rawRole.includes('pm')) {
      rName = 'Project_Manager';
    } else if (rawRole === 'team_leader' || rawRole.includes('leader') || rawRole.includes('lead') || rawRole.includes('tl')) {
      rName = 'Team_Leader';
    } else if (rawRole === 'platform_admin') {
      rName = 'Platform_Admin';
    } else {
      rName = 'Team_Member';
    }

    if (roleLabelLower.includes('process') || rawRole === 'process_admin') {
      rName = 'Process_Admin';
    }

    const navItems = this.navConfig[rName] || this.navConfig['Team_Member'] || [];
    
    let state;
    if (rawRole === 'platform_admin' || session.roleName === 'Platform_Admin' || session.role === 'platform_admin' || (session.roleLabel || '').toLowerCase().includes('platform')) {
      state = { users: [], escalations: [], complianceViolations: [] };
    } else {
      state = await window.Helpers.getState();
    }
    
    const escalationCount = state.escalations ? state.escalations.filter((e) => e.status === "open").length : 0;
    const violationCount = state.complianceViolations ? state.complianceViolations.filter((v) => v.status === "Open").length : 0;
    const freshUser = (state.users && state.users.find(u => String(u.userId) === String(session.id))) || session;
    const displayName = freshUser.fullName || session.name || "Unknown User";
    const displayRoleRaw = freshUser.roleName || session.roleLabel || session.role || "User";
    const displayRole = String(displayRoleRaw).replace(/_/g, " ");

    
    const path = window.location.pathname.toLowerCase();
    const isExecutivePortal = path.includes('/admin/executive/');
    const isAdminConsole = path.includes('/admin-console/');

    let prefix = './';
    if (isExecutivePortal) {
      prefix = '../../';
    } else if (isAdminConsole) {
      prefix = '../';
    } else if (
      path.includes("/admin/pm/") || 
      path.includes("/admin/hr/") || 
      path.includes("/admin/compliance/") || 
      path.includes("/admin/processes/") || 
      path.includes("/enduser/member/") || 
      path.includes("/enduser/leader/")
    ) {
      prefix = "../../";
    } else if (
      path.match(/\/admin\/[^\/]+\.html/) ||
      path.includes("/superuser/") || 
      path.includes("/enduser/") || 
      path.includes("/platform-admin/") || 
      path.includes("/modules/")
    ) {
      prefix = "../";
    }

    const resolveHref = (item) => {
      if (!item || !item.href) return "#";

      // CEO executive portal — same-folder relative links
      if (item.portal === 'executive') {
        return isExecutivePortal ? item.href : `../../admin/executive/${item.href}`;
      }

      // System Admin console — same-folder relative links
      if (item.portal === 'admin_console') {
        return isAdminConsole ? item.href : `../../admin-console/${item.href}`;
      }

      if (item.absolute) return prefix + item.href;
      return item.href;
    };

    const logoSrc = isExecutivePortal
      ? '../../assets/images/logo_light.png'
      : isAdminConsole
        ? '../assets/images/logo_light.png'
        : prefix + 'assets/images/logo_light.png';

    const hasSections = navItems.some((i) => i && i.type === "section");
    const navHTML = navItems
      .map((item) => {
        if (item && item.type === "section") {
          return `<div class="sidebar-section-label">${item.label}</div>`;
        }
        const isActive = item.id === activeId;
        let badge = "";
        if (item.badge === "escalations" && escalationCount > 0) badge = `<span class="nav-badge">${escalationCount}</span>`;
        if (item.badge === "violations" && violationCount > 0) badge = `<span class="nav-badge">${violationCount}</span>`;
        const href = resolveHref(item);
        
        let allowed = "";
        if (item.adminOnly) {
          allowed = "system_admin,system admin";
        } else if (rName === 'System_Admin') {
          allowed = "system_admin,system admin";
        } else if (rName === 'Company_Owner' || rName === 'Executive') {
          allowed = "company_owner,company owner,superuser";
        } else if (rName === 'Branch_Manager') {
          allowed = "branch_manager,branch manager";
        } else if (rawRole === 'platform_admin') {
          allowed = "platform_admin";
        } else {
          allowed = rawRole;
        }

        return `<a href="${href}" class="nav-item ${isActive ? "active" : ""}" data-allowed-roles="${allowed}">
          ${this.icons[item.icon] || ""}
          <span>${item.label}</span>
          ${badge}
        </a>`;
      })
      .join("");

    const logoHTML = this.icons.logo.replace("REPLACE_ME", logoSrc);

    const html = `
      <div class="sidebar-logo" style="padding:18px 16px 14px">${logoHTML}</div>
      <div class="sidebar-role-container">
        <div class="sidebar-user-role1">${displayRole}</div>
      </div>
      ${hasSections ? "" : `<div class="sidebar-section-label">Main</div>`}
      <nav class="sidebar-nav">${navHTML}</nav>
      <div class="sidebar-footer" style="padding: 16px; border-top: 1px solid rgba(255, 255, 255, 0.05); margin-top: auto;">
        <div class="user-profile" style="margin-top: 0; margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
          <div class="avatar" style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; background-color: var(--primary-color, #3b82f6); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">${(displayName.split(' ').map(n=>n[0]||'').join('').toUpperCase().substring(0,2)||'??')}</div>
          <div class="user-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
            <div class="user-name" style="color: white; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;">${displayName}</div>
            <div class="user-role" style="font-size: 12px; color: var(--sidebar-text, rgba(255,255,255,0.7)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4;">${displayRole}</div>
          </div>
        </div>
        <button class="sidebar-logout-btn" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 12px; border: none; border-radius: 6px; background: rgba(239,68,68,0.1); color: #ef4444; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log Out
        </button>
      </div>
    `;

    const container = document.getElementById("sidebar");
    if (container) {
      container.innerHTML = html;
      // Attach logout click AFTER injecting HTML
      const logoutBtn = container.querySelector('.sidebar-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (window.Auth && typeof window.Auth.logout === 'function') {
            window.Auth.logout();
          } else {
            sessionStorage.clear();
            localStorage.clear();
            if (window.location.protocol.startsWith('http')) {
              window.location.replace(window.location.origin ? window.location.origin + '/login.html' : '/login.html');
            } else {
              window.location.replace('../login.html');
            }
          }
        });
      }
      if (typeof window.updateSidebar === 'function') {
        window.updateSidebar();
      } else if (typeof updateSidebar === 'function') {
        updateSidebar();
      }
    }
  }
};
