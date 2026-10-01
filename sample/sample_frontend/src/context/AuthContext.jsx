import { createContext, useContext, useState, useCallback } from 'react';

// ─── Role definitions matching back-end roles.guard.ts ───────────────────────
export const OPTIFLOW_ROLES = {
  SUPERUSER: 'SuperUser',
  SYSTEM_ADMIN: 'System_Admin',
  PROCESS_ADMIN: 'Process_Admin',
  COMPANY_OWNER: 'Company_Owner',
  BRANCH_MANAGER: 'Branch_Manager',
  EXECUTIVE: 'Executive',
  PROJECT_MANAGER: 'Project_Manager',
  COMPLIANCE_OFFICER: 'Compliance_Officer',
  HR_MANAGER: 'HR_Manager',
  TEAM_LEADER: 'Team_Leader',
  TEAM_MEMBER: 'Team_Member',
  PLATFORM_ADMIN: 'Platform_Admin',
};

// ─── Feature permissions per role ────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  SuperUser: ['dashboard', 'users', 'branches', 'processes', 'tasks', 'compliance', 'governance', 'audit', 'analytics', 'approve', 'reject', 'escalate', 'view_evidence', 'manage_rules', 'assign_roles'],
  System_Admin: ['dashboard', 'organization', 'billing', 'users', 'assign_roles'],
  Process_Admin: ['dashboard', 'processes', 'analytics', 'audit'],
  Company_Owner: ['dashboard', 'projects', 'tasks', 'compliance', 'reports', 'approve', 'reject', 'escalate'],
  Branch_Manager: ['dashboard', 'projects', 'tasks', 'compliance', 'approve', 'reject', 'escalate'],
  Executive: ['dashboard', 'projects', 'tasks', 'compliance', 'reports', 'approve'],
  Project_Manager: ['dashboard', 'projects', 'tasks', 'escalations', 'compliance', 'approve', 'reject', 'escalate'],
  Compliance_Officer: ['dashboard', 'violations', 'evidence', 'rules', 'reports', 'audit', 'approve', 'reject', 'view_evidence', 'manage_rules'],
  HR_Manager: ['dashboard', 'teams', 'roles', 'assign_roles'],
  Team_Leader: ['dashboard', 'tasks', 'team', 'approve', 'reject'],
  Team_Member: ['tasks', 'processes', 'submit_evidence'],
  Platform_Admin: ['platform_dashboard', 'companies', 'subscriptions', 'plans', 'support_access', 'admins'],
};

// ─── Demo user mock sessions per role ────────────────────────────────────────
export const DEMO_USERS = {
  SuperUser: { id: 'u001', name: 'Alex Chen', email: 'alex@optiflow.io', role: 'SuperUser', roleLabel: 'Super User', avatar: null, branchId: null, scopeId: 'global' },
  System_Admin: { id: 'u002', name: 'Sam Rivera', email: 'sam@corp.io', role: 'System_Admin', roleLabel: 'System Admin', avatar: null, branchId: 'b001', scopeId: 'b001' },
  Process_Admin: { id: 'u003', name: 'Jordan Lee', email: 'jordan@corp.io', role: 'Process_Admin', roleLabel: 'Process Admin', avatar: null, branchId: 'b001', scopeId: 'b001' },
  Company_Owner: { id: 'u004', name: 'Morgan Blake', email: 'morgan@corp.io', role: 'Company_Owner', roleLabel: 'Company Owner', avatar: null, branchId: null, scopeId: 'company' },
  Branch_Manager: { id: 'u005', name: 'Taylor Kim', email: 'taylor@corp.io', role: 'Branch_Manager', roleLabel: 'Branch Manager', avatar: null, branchId: 'b001', scopeId: 'b001' },
  Project_Manager: { id: 'u006', name: 'Casey Park', email: 'casey@corp.io', role: 'Project_Manager', roleLabel: 'Project Manager', avatar: null, branchId: 'b001', scopeId: 'b001' },
  Compliance_Officer: { id: 'u007', name: 'Dana Osei', email: 'dana@corp.io', role: 'Compliance_Officer', roleLabel: 'Compliance Officer', avatar: null, branchId: 'b001', scopeId: 'b001' },
  HR_Manager: { id: 'u008', name: 'Robin Nkosi', email: 'robin@corp.io', role: 'HR_Manager', roleLabel: 'HR Manager', avatar: null, branchId: 'b001', scopeId: 'b001' },
  Team_Leader: { id: 'u009', name: 'Jamie Xu', email: 'jamie@corp.io', role: 'Team_Leader', roleLabel: 'Team Leader', avatar: null, branchId: 'b001', scopeId: 'b001' },
  Team_Member: { id: 'u010', name: 'Drew Santos', email: 'drew@corp.io', role: 'Team_Member', roleLabel: 'Team Member', avatar: null, branchId: 'b001', scopeId: 'b001' },
  Platform_Admin: { id: 'u011', name: 'Quinn Walsh', email: 'quinn@platform.io', role: 'Platform_Admin', roleLabel: 'Platform Admin', avatar: null, branchId: null, scopeId: 'platform' },
};

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children, initialRole = 'SuperUser' }) {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS[initialRole]);

  const switchRole = useCallback((role) => {
    if (DEMO_USERS[role]) {
      setCurrentUser(DEMO_USERS[role]);
    }
  }, []);

  /** Check if the current user has a specific permission */
  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false;
    const perms = ROLE_PERMISSIONS[currentUser.role] ?? [];
    return perms.includes(permission);
  }, [currentUser]);

  /** Check if the current user has one of the provided roles */
  const hasRole = useCallback((...roles) => {
    if (!currentUser) return false;
    return roles.some(r => r === currentUser.role || r === currentUser.roleLabel);
  }, [currentUser]);

  const value = {
    currentUser,
    switchRole,
    hasPermission,
    hasRole,
    isAuthenticated: !!currentUser,
    allRoles: Object.keys(DEMO_USERS),
    rolePermissions: ROLE_PERMISSIONS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook to access auth context */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
