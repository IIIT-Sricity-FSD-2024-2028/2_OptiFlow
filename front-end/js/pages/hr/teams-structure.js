// teams-structure.js — Rewritten
// Builds a role-level org hierarchy from real DB data.
// Hierarchy: CEO/Owner → CTO/COO → HR Manager / Process Admin / Compliance Officer → Project Manager → Team Leader → Team Member
// Uses managerId (UUID) from the DB directly. Falls back to role-level grouping if managerId is not set.

(function () {
  'use strict';

  // ── Security guard ────────────────────────────────────────────────────────
  if (!sessionStorage.getItem('currentUser')) {
    window.location.replace('../../login.html');
    return;
  }
  window.addEventListener('pageshow', e => {
    if (e.persisted && !sessionStorage.getItem('currentUser'))
      window.location.replace('../../login.html');
  });

  // ── Role hierarchy order (lower = higher rank) ────────────────────────────
  const ROLE_RANK = {
    superuser:          0,
    hr_manager:         1,
    compliance_officer: 1,
    project_manager:    2,
    team_leader:        3,
    team_member:        4,
  };

  // ── Human-readable role labels ─────────────────────────────────────────────
  const ROLE_LABEL = {
    superuser:          'Superuser',
    hr_manager:         'HR Manager',
    compliance_officer: 'Compliance Officer',
    project_manager:    'Project Manager',
    team_leader:        'Team Leader',
    team_member:        'Team Member',
  };

  // ── Role → badge CSS class ─────────────────────────────────────────────────
  const ROLE_CSS = {
    superuser:          'role-su',
    hr_manager:         'role-hr',
    compliance_officer: 'role-co',
    project_manager:    'role-pm',
    team_leader:        'role-tl',
    team_member:        'role-tm',
  };

  // ── Avatar colours ─────────────────────────────────────────────────────────
  const COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#16a34a'];
  function colorFor(str) {
    let h = 0;
    for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
    return COLORS[Math.abs(h) % COLORS.length];
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let ALL_EMPLOYEES = [];
  let BRANCHES = [];

  // ── Load from real API ─────────────────────────────────────────────────────
  async function loadData() {
    try {
      const state = await window.Helpers.getState();
      const users = state.users || [];
      ALL_EMPLOYEES = users.map(u => {
        const slug = u.roleName || 'team_member';
        const initials = (u.fullName || '')
          .split(' ').map(n => (n[0] || '')).join('').toUpperCase().substring(0, 2) || '??';
        return {
          id:         String(u.id),
          name:       u.fullName || 'Unknown',
          email:      u.email    || '',
          initials,
          color:      colorFor(u.id),
          roleSlug:   slug,
          role:       ROLE_LABEL[slug] || u.roleLabel || slug,
          rank:       ROLE_RANK[slug] ?? 4,
          managerId:  u.managerId ? String(u.managerId) : null,
          teamName:   u.teamName   || null,
          branchName: u.departmentName || null,
          status:     u.isActive !== false ? 'active' : 'inactive',
        };
      });
      BRANCHES = (state.branches || []).map(b => b.name).filter(Boolean);
      return true;
    } catch (err) {
      console.error('[Teams] loadData failed:', err);
      return false;
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  function renderStats(employees) {
    const teams  = new Set(employees.map(e => e.teamName).filter(Boolean)).size;
    const active = employees.filter(e => e.status === 'active').length;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('statTotal',   employees.length);
    set('statTeams',   teams);
    set('statActive',  active);
    set('statPending', 0);
  }

  // ── Dept filter ────────────────────────────────────────────────────────────
  function populateDeptFilter(employees) {
    const sel = document.getElementById('deptFilter');
    if (!sel) return;

    const branches = [...new Set(employees.map(e => e.branchName).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">All Departments</option>';
    branches.forEach(b => { sel.innerHTML += `<option value="${b}">${b}</option>`; });
  }

  // ── Build tree from employees ──────────────────────────────────────────────
  // Strategy:
  //   1. If managerId is set and resolves to a known employee → use it
  //   2. Otherwise fall back to role-rank grouping:
  //      - rank-0 (Owner) nodes are top-level
  //      - rank-N employees report to the closest rank-(N-1) employee
  function buildOrgTree(employees) {
    const byId = new Map(employees.map(e => [e.id, { ...e, children: [] }]));

    // Pass 1: wire up explicit manager links
    const unlinked = [];
    byId.forEach(node => {
      if (node.managerId && byId.has(node.managerId) && node.managerId !== node.id) {
        byId.get(node.managerId).children.push(node);
      } else {
        unlinked.push(node);
      }
    });

    // Pass 2: among unlinked nodes, group by role rank
    // Find the best "parent" for each unlinked node: the highest-ranked node
    // with a strictly lower rank number
    const byRank = {};
    byId.forEach(node => {
      const r = node.rank ?? 4;
      if (!byRank[r]) byRank[r] = [];
      byRank[r].push(node);
    });

    const roots = [];

    unlinked.forEach(node => {
      if (node.rank === 0) {
        roots.push(node);
        return;
      }
      // Find a parent at rank - 1, then rank - 2, etc.
      let attached = false;
      for (let r = node.rank - 1; r >= 0; r--) {
        const candidates = byRank[r] || [];
        if (candidates.length > 0) {
          // Attach to the first candidate (or distribute round-robin for many)
          const parent = byId.get(candidates[0].id);
          if (parent) { parent.children.push(node); attached = true; break; }
        }
      }
      if (!attached) roots.push(node);
    });

    // Cycle detection
    function detectCycle(node, seen = new Set()) {
      if (seen.has(node.id)) { node.children = []; return; }
      seen.add(node.id);
      node.children.forEach(c => detectCycle(c, new Set(seen)));
    }
    roots.forEach(r => detectCycle(r));

    return roots;
  }

  // ── Card HTML builder ──────────────────────────────────────────────────────
  function makeCard(emp, isRoot = false) {
    const div = document.createElement('div');
    div.className = 'tree-node';

    const cardWrap = document.createElement('div');
    cardWrap.className = 'node-card-wrap';

    const card = document.createElement('div');
    card.className = `emp-card${isRoot ? ' root' : ''}`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.title = `View ${emp.name}'s profile`;
    card.innerHTML = `
      <div class="card-avatar" style="background:${emp.color};">${emp.initials}</div>
      <div class="card-name">${emp.name}</div>
      <div class="card-team">${emp.teamName || emp.branchName || ''}</div>
      <span class="card-role-badge ${ROLE_CSS[emp.roleSlug] || 'role-tm'}">${emp.role}</span>
    `;

    // Navigate on click — NOT logout
    const navigate = () => {
      window.location.href = `employee-detail.html?id=${encodeURIComponent(emp.id)}`;
    };
    card.addEventListener('click', navigate);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') navigate(); });

    cardWrap.appendChild(card);
    div.appendChild(cardWrap);

    if (emp.children && emp.children.length > 0) {
      const ul = document.createElement('ul');
      ul.className = 'tree-children';
      emp.children.forEach(child => {
        const li = document.createElement('li');
        li.appendChild(makeCard(child, false));
        ul.appendChild(li);
      });
      div.appendChild(ul);
    }

    return div;
  }

  // ── Render tree ────────────────────────────────────────────────────────────
  async function renderTree(employees) {
    const loader    = document.getElementById('treeLoader');
    const container = document.getElementById('treeContainer');
    const treeRoot  = document.getElementById('treeRoot');

    if (!loader || !container || !treeRoot) return;

    treeRoot.innerHTML = '';
    loader.style.display = 'none';
    container.style.display = 'block';

    if (!employees.length) {
      treeRoot.innerHTML = `
        <div class="tree-empty">
          <i class="ri-team-line"></i>
          <p>No employees found for this filter.</p>
        </div>`;
      return;
    }

    const roots = buildOrgTree(employees);

    if (!roots.length) {
      treeRoot.innerHTML = `
        <div class="tree-empty">
          <i class="ri-search-line"></i>
          <p>Could not build an org chart — check manager assignments.</p>
        </div>`;
      return;
    }

    roots.forEach(root => treeRoot.appendChild(makeCard(root, true)));
  }

  // ── Filter handler ─────────────────────────────────────────────────────────
  async function applyFilter() {
    const branch = document.getElementById('deptFilter')?.value || '';
    const subset = branch
      ? ALL_EMPLOYEES.filter(e => e.branchName === branch)
      : ALL_EMPLOYEES;
    renderStats(subset);
    await renderTree(subset);
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  function setupNotifications() {
    const btn      = document.getElementById('notifBtn');
    const panel    = document.getElementById('notifPanel');
    const backdrop = document.getElementById('notifBackdrop');
    const closeBtn = document.getElementById('closeNotif');
    if (!btn || !panel) return;

    const open  = () => { panel.classList.add('open'); backdrop?.classList.add('open'); };
    const close = () => { panel.classList.remove('open'); backdrop?.classList.remove('open'); };

    btn.addEventListener('click', e => { e.stopPropagation(); panel.classList.contains('open') ? close() : open(); });
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function setupLogout() {
    const modal    = document.getElementById('logoutModal');
    const openFn   = () => modal?.classList.add('active');
    const closeFn  = () => modal?.classList.remove('active');

    document.getElementById('logoutBtn')?.addEventListener('click', openFn);
    document.getElementById('closeLogoutModal')?.addEventListener('click', closeFn);
    document.getElementById('cancelLogout')?.addEventListener('click', closeFn);
    document.getElementById('confirmLogout')?.addEventListener('click', () => {
      sessionStorage.removeItem('currentUser');
      window.location.href = '../../login.html';
    });
    modal?.addEventListener('click', e => { if (e.target === modal) closeFn(); });
  }

  // ── Sidebar user info ──────────────────────────────────────────────────────
  function updateSidebar() {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      const name     = u.fullName || u.name || 'HR Manager';
      const initials = name.split(' ').map(n => (n[0] || '')).join('').toUpperCase().substring(0, 2) || '??';
      const role     = u.assignedRole || u.roleLabel || 'HR Manager';
      const el = document.getElementById('sidebarName');
      const av = document.getElementById('sidebarAvatar');
      const ro = document.getElementById('sidebarRole');
      // Fallback to .user-name / .user-role / .avatar selectors used in the HTML
      document.querySelectorAll('.user-name').forEach(el => el.textContent = name);
      document.querySelectorAll('.user-role').forEach(el => el.textContent = role);
      document.querySelectorAll('.avatar').forEach(el => {
        el.textContent = initials;
        el.style.background = colorFor(name);
      });
    } catch {}
  }

  // ── Main init ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', async () => {
    updateSidebar();
    setupNotifications();
    setupLogout();

    // "Add Member" → navigate, not modal
    document.getElementById('addMemberBtn')?.addEventListener('click', () => {
      window.location.href = 'new-employee.html';
    });

    document.getElementById('deptFilter')?.addEventListener('change', applyFilter);

    // Show loading state
    const loader = document.getElementById('treeLoader');
    if (loader) loader.style.display = 'flex';

    const ok = await loadData();
    if (!ok) {
      if (loader) loader.innerHTML = `
        <div class="tree-empty">
          <i class="ri-error-warning-line"></i>
          <p>Failed to load team data. Please refresh.</p>
        </div>`;
      return;
    }

    populateDeptFilter(ALL_EMPLOYEES);
    renderStats(ALL_EMPLOYEES);
    await renderTree(ALL_EMPLOYEES);
  });
})();
