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
      // Changed to /branches since /departments is deleted per Phase 3 of PLAN.md
      const depts = await window.Helpers.api.request('/branches');
      _deptCache = {};
      (depts || []).forEach(d => {
        _deptCache[d.id] = d.name;
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
      // Only fetch users and branches (roles and user-roles are merged/deleted)
      const [rawUsers, deptMap] = await Promise.all([
        window.Helpers.api.request('/users'),
        getDeptMap()
      ]);

      return (rawUsers || []).map(u => {
        // PK is now string id; legacy code expects string id like "u5"
        const numericId = u.user_id ?? u.id;
        const joined = u.createdAt || u.created_at
          ? new Date(u.createdAt || u.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

        // Retrieve role string from included roleAssignments array
        let roleStr = 'team_member';
        if (u.roleAssignments && u.roleAssignments.length > 0 && u.roleAssignments[0].role) {
            roleStr = u.roleAssignments[0].role.label || 'team_member';
        }
        
        // Normalize role string to match legacy mapping
        if (roleStr === 'Process Admin') roleStr = 'superuser';
        if (roleStr === 'Project Manager') roleStr = 'project_manager';
        if (roleStr === 'Team Leader') roleStr = 'team_leader';
        if (roleStr === 'Team Member') roleStr = 'team_member';
        if (roleStr === 'HR Manager') roleStr = 'hr_manager';
        if (roleStr === 'Compliance Officer') roleStr = 'compliance_officer';

        return {
          // ── Primary key (both formats for compat) ──────────────────────
          id:          isNaN(numericId) ? numericId : `u${numericId}`,
          user_id:     numericId,
          // ── Core profile ───────────────────────────────────────────────
          name:        u.fullName || u.full_name || 'Unknown',
          fullName:    u.fullName || u.full_name || 'Unknown',
          email:       u.email    || '',
          // ── Role ───────────────────────────────────────────────────────
          role:        roleStr,
          displayRole: ROLE_DISPLAY[roleStr] || roleStr,
          // ── Department (resolved to string name) ────────────────────────
          department:  deptMap[u.department_id || u.branchId] || `Operations`,
          department_id: u.department_id || u.branchId,
          // ── Status ─────────────────────────────────────────────────────
          status:      (u.isActive === false || u.is_active === false) ? 'Inactive' : 'Active',
          is_active:   u.isActive ?? u.is_active,
          // ── Misc ────────────────────────────────────────────────────────
          joined,
          password:    '123',           // legacy login UI may still check
          reportsTo:   u.managerUserId || u.manager_id ? `u${u.managerUserId || u.manager_id}` : null,
          manager_id:  u.managerUserId ?? u.manager_id ?? null,
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
