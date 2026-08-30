/**
 * Shared shell for System Admin pages (standard layout — same sidebar as other roles).
 */
window.AdminConsoleShell = {
  isSystemAdmin(session) {
    if (!session) return false;
    const role = String(session.role || '').toLowerCase();
    const label = String(
      session.roleLabel || session.assignedRole || '',
    ).toLowerCase();
    return role === 'system_admin' || label.includes('system admin');
  },

  requireAccess() {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) {
      window.location.href = '../login.html';
      return null;
    }
    let session;
    try {
      session = JSON.parse(raw);
    } catch {
      window.location.href = '../login.html';
      return null;
    }
    if (!this.isSystemAdmin(session)) {
      window.location.href = '../superuser/dashboard.html';
      return null;
    }
    return session;
  },

  async init({ activeNav, pageTitle, subtitle }) {
    const session = this.requireAccess();
    if (!session) return null;

    if (window.Sidebar) {
      await window.Sidebar.render(activeNav);
    }

    const titleEl = document.querySelector('.page-title');
    if (titleEl && pageTitle) {
      titleEl.textContent = pageTitle;
    }

    const subEl = document.getElementById('ac-page-subtitle');
    if (subEl && subtitle) subEl.textContent = subtitle;

    return session;
  },
};
