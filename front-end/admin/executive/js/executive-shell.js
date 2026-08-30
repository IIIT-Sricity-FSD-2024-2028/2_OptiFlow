/**
 * Shared shell for the CEO Executive Command Center.
 * Handles auth, sidebar, and branch context switcher.
 */
window.ExecutiveShell = {
  isCompanyOwner(session) {
    if (!session) return false;
    const role = String(session.role || '').toLowerCase();
    const label = String(session.roleLabel || '').toLowerCase();
    return (
      role === 'company_owner' ||
      (role === 'superuser' && !label.includes('branch manager')) ||
      label.includes('owner') ||
      label.includes('ceo') ||
      label.includes('cto') ||
      label.includes('coo')
    );
  },

  isBranchManager(session) {
    if (!session) return false;
    const role = String(session.role || '').toLowerCase();
    const label = String(session.roleLabel || '').toLowerCase();
    return role === 'branch_manager' || label.includes('branch manager');
  },

  hasExecutiveAccess(session) {
    return this.isCompanyOwner(session) || this.isBranchManager(session);
  },

  requireAccess() {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) {
      window.location.href = '../../login.html';
      return null;
    }
    let session;
    try {
      session = JSON.parse(raw);
    } catch {
      window.location.href = '../../login.html';
      return null;
    }
    if (!this.hasExecutiveAccess(session)) {
      window.location.href = '../../login.html';
      return null;
    }
    return session;
  },

  async init({ activeNav, pageTitle, subtitle }) {
    document.body.classList.add('executive-portal');

    const session = this.requireAccess();
    if (!session) return null;

    if (window.Sidebar) {
      await window.Sidebar.render(activeNav);
    }

    const titleEl = document.querySelector('.page-title');
    if (titleEl) {
      const badge = this.isBranchManager(session) ? 'Branch Command' : 'Command Center';
      titleEl.innerHTML = `${pageTitle || 'Executive'}<span class="exec-badge">${badge}</span>`;
    }

    const subEl = document.getElementById('exec-page-subtitle');
    if (subEl && subtitle) subEl.textContent = subtitle;

    if (window.ExecutiveBranchSwitcher) {
      await window.ExecutiveBranchSwitcher.init('#executive-branch-switcher');
    }

    return session;
  },

  onBranchChange(callback) {
    document.addEventListener('executive:branch-changed', () => callback());
  },

  getBranchLabel() {
    const sessionRaw = sessionStorage.getItem('currentUser');
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);
        if (this.isBranchManager(session)) {
          return session.branchName || 'Assigned Branch';
        }
      } catch { /* ignore */ }
    }

    const select = document.getElementById('executiveBranchFilter');
    if (!select || !select.value) return 'All Branches';
    return select.options[select.selectedIndex]?.text || 'All Branches';
  },

  statusPill(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('complete')) return 'green';
    if (s.includes('active') || s.includes('progress')) return 'blue';
    if (s.includes('hold') || s.includes('risk') || s.includes('block')) return 'red';
    if (s.includes('plan')) return 'yellow';
    return 'gray';
  },

  fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  },
};
