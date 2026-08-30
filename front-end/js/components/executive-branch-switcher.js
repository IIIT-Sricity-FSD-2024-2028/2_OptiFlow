/**
 * Global Context Switcher for Company Owner / CEO executive modules.
 * Branch Managers see a locked branch label (no switching).
 */
window.ExecutiveBranchSwitcher = {
  STORAGE_KEY: 'executiveBranchFilter',

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

  hasScopedExecutiveAccess(session) {
    return this.isCompanyOwner(session) || this.isBranchManager(session);
  },

  getSelectedBranchId() {
    const sessionRaw = sessionStorage.getItem('currentUser');
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);
        if (this.isBranchManager(session) && session.scopeId) {
          return session.scopeId;
        }
      } catch { /* ignore */ }
    }
    return sessionStorage.getItem(this.STORAGE_KEY) || '';
  },

  buildQueryString() {
    const sessionRaw = sessionStorage.getItem('currentUser');
    if (!sessionRaw) return '';

    let session;
    try {
      session = JSON.parse(sessionRaw);
    } catch {
      return '';
    }

    if (this.isBranchManager(session) && session.scopeId) {
      return `?branchId=${encodeURIComponent(session.scopeId)}`;
    }

    if (this.isCompanyOwner(session)) {
      const branchId = this.getSelectedBranchId();
      return branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    }

    return '';
  },

  async init(containerSelector = '#executive-branch-switcher') {
    const sessionRaw = sessionStorage.getItem('currentUser');
    if (!sessionRaw) return;

    let session;
    try {
      session = JSON.parse(sessionRaw);
    } catch {
      return;
    }

    if (!this.hasScopedExecutiveAccess(session)) return;

    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (this.isBranchManager(session)) {
      const branchName =
        session.branchName ||
        (await this.resolveBranchName(session.scopeId)) ||
        'Assigned Branch';

      container.innerHTML = `
        <span class="exec-context-label">Your Branch</span>
        <span class="exec-branch-tag locked" title="Branch scope is fixed for Branch Managers">${branchName}</span>
      `;
      return;
    }

    container.innerHTML = `
      <label for="executiveBranchFilter" class="exec-context-label">Global Context</label>
      <select id="executiveBranchFilter" class="exec-select" style="min-width:200px;">
        <option value="">All Branches</option>
      </select>
    `;

    const select = container.querySelector('#executiveBranchFilter');
    if (!select) return;

    const saved = this.getSelectedBranchId();
    if (saved) select.value = saved;

    try {
      const branches = await window.Helpers.api.request('/executive/branches');
      const list = Array.isArray(branches) ? branches : [];
      list.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        select.appendChild(opt);
      });
      if (saved) select.value = saved;
    } catch (e) {
      console.warn('Failed to load executive branches', e);
    }

    select.addEventListener('change', () => {
      const value = select.value || '';
      if (value) {
        sessionStorage.setItem(this.STORAGE_KEY, value);
      } else {
        sessionStorage.removeItem(this.STORAGE_KEY);
      }
      window.Helpers._stateCache = null;
      document.dispatchEvent(
        new CustomEvent('executive:branch-changed', { detail: { branchId: value } }),
      );
    });
  },

  async resolveBranchName(branchId) {
    if (!branchId) return '';
    try {
      const branches = await window.Helpers.api.request('/executive/branches');
      const list = Array.isArray(branches) ? branches : [];
      const match = list.find((b) => b.id === branchId);
      return match?.name || '';
    } catch {
      return '';
    }
  },
};
