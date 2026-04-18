// js/data/db.js
(function (global) {
  "use strict";

  if (global.__OFFICESYNC_MASTER_DB_LOADED__) return;
  global.__OFFICESYNC_MASTER_DB_LOADED__ = true;

  // ── Department ID → Name lookup (populated on first fetch) ────────────────
  let _deptCache = null;
  async function getDeptMap() {
    if (_deptCache) return _deptCache;
    try {
      const depts = await window.Helpers.api.request('/departments');
      _deptCache = {};
      (depts || []).forEach(d => {
        _deptCache[d.department_id] = d.department_name;
      });
    } catch (e) {
      _deptCache = {};
    }
    return _deptCache;
  }

  // ── Role slug → display name ───────────────────────────────────────────────
  const ROLE_DISPLAY = {
    superuser:          'Process Admin',
    project_manager:    'Project Manager',
    compliance_officer: 'Compliance Officer',
    hr_manager:         'HR Manager',
    team_leader:        'Team Leader',
    team_member:        'Team Member',
  };

  // ── getUsers ──────────────────────────────────────────────────────────────
  // Returns a normalised array that is backward-compatible with all existing
  // superuser/hr page code that expects { id, name, email, role, department, status, joined }
  async function getUsers() {
    try {
      const [rawUsers, deptMap] = await Promise.all([
        window.Helpers.api.request('/users'),
        getDeptMap(),
      ]);

      return (rawUsers || []).map(u => {
        // PK is now user_id; legacy code expects string id like "u5"
        const numericId = u.user_id ?? u.id;
        const joined = u.created_at
          ? new Date(u.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        return {
          // ── Primary key (both formats for compat) ──────────────────────
          id:          `u${numericId}`,
          user_id:     numericId,
          // ── Core profile ───────────────────────────────────────────────
          name:        u.full_name || 'Unknown',
          fullName:    u.full_name || 'Unknown',
          email:       u.email    || '',
          // ── Role ───────────────────────────────────────────────────────
          role:        u.role     || 'team_member',
          displayRole: ROLE_DISPLAY[u.role] || u.role,
          // ── Department (resolved to string name) ────────────────────────
          department:  deptMap[u.department_id] || `Dept ${u.department_id}`,
          department_id: u.department_id,
          // ── Status ─────────────────────────────────────────────────────
          status:      u.is_active === false ? 'Inactive' : 'Active',
          is_active:   u.is_active,
          // ── Misc ────────────────────────────────────────────────────────
          joined,
          password:    '123',           // legacy login UI may still check
          reportsTo:   u.manager_id ? `u${u.manager_id}` : null,
          manager_id:  u.manager_id ?? null,
          projectId:   u.project_id ?? null,
        };
      });
    } catch (error) {
      console.error('Failed to fetch users from backend:', error);
      return [];
    }
  }

  async function saveUsers(usersArray) {
    console.warn('saveUsers is deprecated. Use direct API POST/PATCH via helpers.api.request().');
  }

  global.initializeDatabase = () => {
    console.log('Init DB deprecated. Backend takes over via REST APIs.');
  };

  // Expose as globals — but they are NOW async functions
  global.getUsers  = global.getUsers  || getUsers;
  global.saveUsers = global.saveUsers || saveUsers;

})(window);
