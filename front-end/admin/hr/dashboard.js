// admin/hr/dashboard.js
// Fetches all employees from the real database via window.Helpers.getState()
// No mock data. No hardcoded employees.

(function () {
  // ── Avatar colour palette ──────────────────────────────────────────────
  const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#16a34a'];
  function colorFor(str) {
    let h = 0;
    for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  // ── Role display labels ────────────────────────────────────────────────
  const ROLE_DISPLAY = {
    superuser:          'Superuser',
    company_owner:      'Company Owner',
    process_admin:      'Process Admin',
    project_manager:    'Project Manager',
    team_leader:        'Team Leader',
    team_member:        'Team Member',
    hr_manager:         'HR Manager',
    compliance_officer: 'Compliance Officer',
  };

  // ── State ──────────────────────────────────────────────────────────────
  let _allEmployees = [];

  // ── Security guard ─────────────────────────────────────────────────────
  const sessionRaw = sessionStorage.getItem('currentUser');
  if (!sessionRaw) {
    window.location.replace('../../login.html');
    return;
  }
  const currentUser = JSON.parse(sessionRaw);

  // ── API headers from real session ──────────────────────────────────────
  const headers = {
    'Content-Type':  'application/json',
    'x-user-role':   currentUser.roleSlug || currentUser.assignedRole || 'hr_manager',
    'x-user-email':  currentUser.email,
    'x-company-id':  currentUser.companyId,
    'x-user-id':     currentUser.id,
  };

  // ── Render employee rows ───────────────────────────────────────────────
  function renderRows(data) {
    const tbody   = document.getElementById('employeeTableBody');
    const noRes   = document.getElementById('noResults');
    const countEl = document.getElementById('employeeCount');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data.length) {
      if (noRes)   noRes.style.display = 'block';
      if (countEl) countEl.textContent = '0 total';
      return;
    }

    if (noRes)   noRes.style.display = 'none';
    if (countEl) countEl.textContent = `${data.length} total`;

    data.forEach(u => {
      const slug     = u.roleName || u.roleSlug || 'team_member';
      const roleDisp = ROLE_DISPLAY[slug] || u.roleLabel || slug;
      const dept     = u.teamName || u.departmentName || '—';
      const initials = (u.fullName || '')
        .split(' ').map(n => (n[0] || '')).join('').toUpperCase().substring(0, 2) || '??';
      const color    = colorFor(u.id || u.email || '');
      const status   = u.isActive !== false ? 'active' : 'inactive';
      const joined   = u.createdAt
        ? new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        : '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="emp-cell">
            <div class="emp-avatar" style="background:${color};">${initials}</div>
            <div>
              <div class="td-title">${u.fullName || 'Unknown'}</div>
              <div class="td-subtitle">${u.email || ''}</div>
            </div>
          </div>
        </td>
        <td><span class="role-badge ${slug}">${roleDisp}</span></td>
        <td style="color:var(--text-main,#1e293b);font-size:14px;">${dept}</td>
        <td><span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
        <td style="color:var(--text-muted,#64748b);font-size:13px;">${joined}</td>
        <td style="text-align:right;">
          <button class="action-btn view" onclick="window.location.href='employee-detail.html?id=${encodeURIComponent(u.id)}'">View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ── Filter + search ────────────────────────────────────────────────────
  function filterEmployees() {
    const q    = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const dept = document.getElementById('deptFilter')?.value  || '';
    const role = document.getElementById('roleFilter')?.value  || '';

    const filtered = _allEmployees.filter(u => {
      const name     = (u.fullName || '').toLowerCase();
      const email    = (u.email    || '').toLowerCase();
      const slug     = u.roleName  || u.roleSlug || '';
      const deptVal  = u.teamName  || u.departmentName || '';
      const matchQ    = !q    || name.includes(q) || email.includes(q);
      const matchDept = !dept || deptVal === dept;
      const matchRole = !role || slug === role;
      return matchQ && matchDept && matchRole;
    });
    renderRows(filtered);
  }

  // ── Populate filter dropdowns from live data ───────────────────────────
  function populateFilters() {
    const depts = [...new Set(_allEmployees.map(u => u.teamName || u.departmentName).filter(Boolean))].sort();
    const roles = [...new Set(_allEmployees.map(u => u.roleName || u.roleSlug).filter(Boolean))].sort();

    const deptSel = document.getElementById('deptFilter');
    if (deptSel) {
      deptSel.innerHTML = '<option value="">All Departments</option>';
      depts.forEach(d => { deptSel.innerHTML += `<option value="${d}">${d}</option>`; });
    }

    const roleSel = document.getElementById('roleFilter');
    if (roleSel) {
      roleSel.innerHTML = '<option value="">All Roles</option>';
      roles.forEach(r => { roleSel.innerHTML += `<option value="${r}">${ROLE_DISPLAY[r] || r}</option>`; });
    }
  }

  // ── Update metric cards ────────────────────────────────────────────────
  function updateMetrics(employees, teamCount) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('metricTotal',   employees.length);
    set('metricActive',  employees.filter(u => u.isActive !== false).length);
    set('metricTeams',   teamCount);
    set('metricPending', 0);
  }

  // ── Roles for invite/custom-role modals ───────────────────────────────
  let _allRoles = [];
  async function loadRoles() {
    try {
      const res  = await fetch('http://localhost:3000/governance/roles', { headers });
      if (!res.ok) return;
      const data = await res.json();
      _allRoles  = data.data || data;

      const invSel  = document.getElementById('inviteRoleSelect');
      const baseSel = document.getElementById('baseRoleSelect');
      if (!invSel || !baseSel) return;

      invSel.innerHTML  = '';
      baseSel.innerHTML = '<option value="">Select a base role…</option>';
      _allRoles.forEach(r => {
        invSel.innerHTML  += `<option value="${r.id}">${r.label}</option>`;
        baseSel.innerHTML += `<option value="${r.id}">${r.label}</option>`;
      });
    } catch (e) { console.warn('[HR] loadRoles failed', e); }
  }

  // ── Permission checkboxes when base role is selected ──────────────────
  function setupBaseRoleListener() {
    const baseSel = document.getElementById('baseRoleSelect');
    if (!baseSel) return;
    baseSel.addEventListener('change', e => {
      const role = _allRoles.find(r => r.id === e.target.value);
      const grid = document.getElementById('permissionsGrid');
      if (!grid) return;
      grid.innerHTML = '';
      const perms = role?.roleTemplate?.defaultPermissions || role?.roleTemplate?.permissions || [];
      perms.forEach(rp => {
        const p = rp.permission;
        if (!p) return;
        grid.innerHTML += `
          <label class="checkbox-item">
            <input type="checkbox" name="permissions" value="${p.id}" checked>
            ${p.slug || p.name || p.id}
          </label>`;
      });
      if (!grid.innerHTML) grid.innerHTML = '<span style="color:#94a3b8;font-size:12px;">No permissions found for this role.</span>';
    });
  }

  // ── Invite form submit ─────────────────────────────────────────────────
  function setupInviteForm() {
    document.getElementById('inviteForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        name:   document.getElementById('inviteName').value,
        email:  document.getElementById('inviteEmail').value,
        roleId: document.getElementById('inviteRoleSelect').value,
      };
      try {
        const res = await fetch('http://localhost:3000/governance/invite', {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
        const invModal = document.getElementById('inviteModal');
        if (invModal) invModal.style.display = 'none';
        document.getElementById('inviteForm').reset();
        if (res.ok) {
          alert('Employee invited successfully!');
          window.location.reload();
        } else {
          const err = await res.json().catch(() => ({}));
          alert('Failed to invite: ' + (err.message || 'Unknown error'));
        }
      } catch (err) { alert('Error: ' + err.message); }
    });
  }

  // ── Custom role form submit ────────────────────────────────────────────
  function setupCustomRoleForm() {
    document.getElementById('customRoleForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const checked = document.querySelectorAll('input[name="permissions"]:checked');
      const payload = {
        sourceRoleId:  document.getElementById('baseRoleSelect').value,
        newName:       document.getElementById('newRoleName').value,
        permissionIds: Array.from(checked).map(c => c.value),
      };
      try {
        const res = await fetch('http://localhost:3000/governance/roles/clone', {
          method: 'POST', headers, body: JSON.stringify(payload),
        });
        document.getElementById('customRoleForm').reset();
        const grid = document.getElementById('permissionsGrid');
        if (grid) grid.innerHTML = '';
        const modal = document.getElementById('customRoleModal');
        if (modal) modal.style.display = 'none';
        if (res.ok) { alert('Custom role created!'); loadRoles(); }
        else        { alert('Failed to create role.'); }
      } catch (err) { alert('Error: ' + err.message); }
    });
  }

  // ── Modal open/close helpers ───────────────────────────────────────────
  function setupModals() {
    // New Employee button → open invite modal
    document.getElementById('newEmployeeBtn')?.addEventListener('click', () => {
      const m = document.getElementById('inviteModal');
      if (m) m.style.display = 'flex';
    });

    // Custom Role button → open custom role modal
    document.getElementById('customRoleBtn')?.addEventListener('click', () => {
      const m = document.getElementById('customRoleModal');
      if (m) m.style.display = 'flex';
    });

    // Close buttons
    ['closeInviteModal', 'cancelInvite'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        const m = document.getElementById('inviteModal');
        if (m) m.style.display = 'none';
      });
    });
    ['closeCustomRoleModal', 'cancelCustomRole'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        const m = document.getElementById('customRoleModal');
        if (m) m.style.display = 'none';
      });
    });

    // Click outside modal to close
    ['inviteModal', 'customRoleModal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
      });
    });
  }

  // ── Notification panel ─────────────────────────────────────────────────
  function setupNotifications() {
    const btn       = document.getElementById('notifBtn');
    const panel     = document.getElementById('notifPanel');
    const backdrop  = document.getElementById('notifBackdrop');
    const closeBtn  = document.getElementById('closeNotif');
    if (!btn || !panel) return;

    btn.addEventListener('click', e => {
      e.stopPropagation();
      panel.classList.toggle('open');
      backdrop?.classList.toggle('open');
    });
    closeBtn?.addEventListener('click', () => {
      panel.classList.remove('open');
      backdrop?.classList.remove('open');
    });
    backdrop?.addEventListener('click', () => {
      panel.classList.remove('open');
      backdrop.classList.remove('open');
    });
  }

  // ── Logout ─────────────────────────────────────────────────────────────
  function setupLogout() {
    const modal = document.getElementById('logoutModal');
    const open  = () => { if (modal) modal.style.display = 'flex'; };
    const close = () => { if (modal) modal.style.display = 'none'; };

    document.getElementById('logoutBtn')?.addEventListener('click', open);
    document.getElementById('closeLogoutModal')?.addEventListener('click', close);
    document.getElementById('cancelLogout')?.addEventListener('click', close);
    document.getElementById('confirmLogout')?.addEventListener('click', () => {
      sessionStorage.removeItem('currentUser');
      window.location.href = '../../login.html';
    });
    // Click backdrop to close
    modal?.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  // ── Sidebar user info ──────────────────────────────────────────────────
  function updateSidebarUser() {
    const name     = currentUser.fullName || currentUser.name || 'HR Manager';
    const initials = name.split(' ').map(n => (n[0] || '')).join('').toUpperCase().substring(0, 2) || '??';
    const role     = currentUser.assignedRole || currentUser.roleLabel || 'HR Manager';

    const el = document.getElementById('sidebarName');
    const av = document.getElementById('sidebarAvatar');
    const ro = document.getElementById('sidebarRole');
    if (el) el.textContent = name;
    if (av) { av.textContent = initials; av.style.background = colorFor(name); }
    if (ro) ro.textContent = role;
  }

  // ── Main init ──────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    updateSidebarUser();
    setupModals();
    setupNotifications();
    setupLogout();
    setupInviteForm();
    setupCustomRoleForm();
    setupBaseRoleListener();
    loadRoles();

    // Wire up search / filter listeners
    document.getElementById('searchInput')?.addEventListener('input',  filterEmployees);
    document.getElementById('deptFilter')?.addEventListener('change', filterEmployees);
    document.getElementById('roleFilter')?.addEventListener('change', filterEmployees);

    // Fetch real data
    try {
      const state     = await window.Helpers.getState();
      _allEmployees   = state.users || [];
      const teamCount = (state.teams || []).length;

      updateMetrics(_allEmployees, teamCount);
      populateFilters();
      renderRows(_allEmployees);
    } catch (err) {
      console.error('[HR Dashboard] Failed to load state:', err);
      const tbody = document.getElementById('employeeTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;padding:24px;">Failed to load employees — is the backend running?</td></tr>`;
    }
  });
})();
