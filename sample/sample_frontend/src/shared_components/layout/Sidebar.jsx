import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { Avatar } from '../ui/Avatar';

// ─── Role-based nav config (ported from legacy sidebar.js) ───────────────────
const NAV_CONFIG = {
  SuperUser: [
    { section: 'Main' },
    { id: 'dashboard',  label: 'Dashboard',       icon: 'grid',    path: '/dashboard' },
    { id: 'users',      label: 'Users',            icon: 'users',   path: '/users' },
    { id: 'branches',   label: 'Branches',         icon: 'office',  path: '/branches' },
    { section: 'Modules' },
    { id: 'processes',  label: 'Processes',        icon: 'flow',    path: '/processes' },
    { id: 'tasks',      label: 'Tasks',            icon: 'tasks',   path: '/tasks' },
    { id: 'compliance', label: 'Compliance',       icon: 'shield',  path: '/compliance', badge: 'violations' },
    { id: 'governance', label: 'Governance',       icon: 'hr',      path: '/governance' },
    { id: 'audit',      label: 'Audit Log',        icon: 'audit',   path: '/audit' },
  ],
  System_Admin: [
    { section: 'Main' },
    { id: 'dashboard',     label: 'Dashboard',       icon: 'grid',   path: '/dashboard' },
    { section: 'Administration' },
    { id: 'organization',  label: 'Organization',    icon: 'office', path: '/organization' },
    { id: 'billing',       label: 'Billing',         icon: 'folder', path: '/billing' },
    { id: 'governance',    label: 'Users & Roles',   icon: 'users',  path: '/governance' },
  ],
  Process_Admin: [
    { section: 'Main' },
    { id: 'dashboard',  label: 'Dashboard',  icon: 'grid',    path: '/dashboard' },
    { id: 'processes',  label: 'Processes',  icon: 'flow',    path: '/processes' },
    { id: 'analytics',  label: 'Analytics',  icon: 'reports', path: '/analytics' },
    { id: 'audit',      label: 'Audit Logs', icon: 'audit',   path: '/audit' },
  ],
  Company_Owner: [
    { section: 'Command Center' },
    { id: 'dashboard',  label: 'Overview',           icon: 'grid',    path: '/dashboard' },
    { section: 'Intelligence' },
    { id: 'projects',   label: 'Global Projects',    icon: 'folder',  path: '/projects' },
    { id: 'tasks',      label: 'Global Tasks',       icon: 'tasks',   path: '/tasks' },
    { id: 'compliance', label: 'Compliance',         icon: 'shield',  path: '/compliance', badge: 'violations' },
    { section: 'Governance' },
    { id: 'reports',    label: 'Executive Reports',  icon: 'reports', path: '/reports' },
  ],
  Branch_Manager: [
    { section: 'Command Center' },
    { id: 'dashboard',  label: 'Dashboard',  icon: 'grid',   path: '/dashboard' },
    { section: 'Branch Intelligence' },
    { id: 'projects',   label: 'Projects',   icon: 'folder', path: '/projects' },
    { id: 'tasks',      label: 'Tasks',      icon: 'tasks',  path: '/tasks' },
    { id: 'compliance', label: 'Compliance', icon: 'shield', path: '/compliance', badge: 'violations' },
  ],
  Executive: [
    { section: 'Command Center' },
    { id: 'dashboard',  label: 'Overview',           icon: 'grid',    path: '/dashboard' },
    { section: 'Company Intelligence' },
    { id: 'projects',   label: 'Global Projects',    icon: 'folder',  path: '/projects' },
    { id: 'tasks',      label: 'Global Tasks',       icon: 'tasks',   path: '/tasks' },
    { id: 'compliance', label: 'Compliance',         icon: 'shield',  path: '/compliance', badge: 'violations' },
    { id: 'reports',    label: 'Executive Reports',  icon: 'reports', path: '/reports' },
  ],
  Project_Manager: [
    { id: 'dashboard',    label: 'Dashboard',    icon: 'grid',   path: '/dashboard' },
    { id: 'projects',     label: 'Projects',     icon: 'folder', path: '/projects' },
    { id: 'tasks',        label: 'Tasks',        icon: 'tasks',  path: '/tasks' },
    { id: 'escalations',  label: 'Escalations',  icon: 'alert',  path: '/escalations', badge: 'escalations' },
    { id: 'compliance',   label: 'Compliance',   icon: 'shield', path: '/compliance',  badge: 'violations' },
  ],
  Compliance_Officer: [
    { id: 'dashboard',   label: 'Dashboard',   icon: 'grid',    path: '/dashboard' },
    { id: 'violations',  label: 'Violations',  icon: 'alert',   path: '/violations', badge: 'violations' },
    { id: 'evidence',    label: 'Evidence',    icon: 'folder',  path: '/evidence' },
    { id: 'rules',       label: 'Rules',       icon: 'shield',  path: '/rules' },
    { id: 'reports',     label: 'Reports',     icon: 'reports', path: '/reports' },
    { id: 'audit',       label: 'Audit Log',   icon: 'audit',   path: '/audit' },
  ],
  HR_Manager: [
    { id: 'dashboard',   label: 'Dashboard',      icon: 'grid',   path: '/dashboard' },
    { id: 'teams',       label: 'Teams',           icon: 'users',  path: '/teams' },
    { id: 'roles',       label: 'Roles & Access',  icon: 'shield', path: '/roles' },
  ],
  Team_Leader: [
    { id: 'dashboard',  label: 'Dashboard',  icon: 'grid',  path: '/dashboard' },
    { id: 'tasks',      label: 'Tasks',      icon: 'tasks', path: '/tasks' },
    { id: 'team',       label: 'My Team',    icon: 'users', path: '/team' },
  ],
  Team_Member: [
    { id: 'tasks',      label: 'My Tasks',     icon: 'tasks', path: '/tasks' },
    { id: 'processes',  label: 'My Processes', icon: 'flow',  path: '/processes' },
  ],
  Platform_Admin: [
    { section: 'Platform' },
    { id: 'platform-dashboard', label: 'Overview',       icon: 'grid',   path: '/platform' },
    { id: 'companies',          label: 'Companies',      icon: 'office', path: '/companies' },
    { id: 'subscriptions',      label: 'Subscriptions',  icon: 'folder', path: '/subscriptions' },
    { id: 'plans',              label: 'Plans',          icon: 'tasks',  path: '/plans' },
    { id: 'admins',             label: 'Admins',         icon: 'users',  path: '/admins' },
  ],
};

// ─── Demo badge counts ────────────────────────────────────────────────────────
const DEMO_BADGES = { violations: 4, escalations: 2 };

// ─── Lucide icon mapping ──────────────────────────────────────────────────────
const ICONS = {
  grid:    ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  folder:  ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  flow:    ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  alert:   ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  shield:  ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  users:   ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  office:  ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
  audit:   ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  reports: ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  hr:      ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11z"/><path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11z"/><path d="M8 13c-2.76 0-5 1.79-5 4v3h10v-3c0-2.21-2.24-4-5-4z"/></svg>,
  tasks:   ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
};

function NavIcon({ name, size = 16 }) {
  const Comp = ICONS[name];
  return Comp ? <Comp size={size} /> : null;
}

// ─── Sidebar Component ────────────────────────────────────────────────────────
/**
 * Sidebar
 * ───────
 * Declarative role-based navigation. Driven by NAV_CONFIG for all OptiFlow roles.
 * Handles collapse toggle, badge counters, and active route detection.
 */
export default function Sidebar({ collapsed, onToggle }) {
  const { currentUser } = useAuth();
  const { activeBranch } = useBranch();
  const location = useLocation();

  const navItems = NAV_CONFIG[currentUser?.role] ?? [];

  return (
    <aside style={{
      width: collapsed ? 64 : 240,
      minHeight: '100%',
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Branding */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 16px',
        borderBottom: '1px solid var(--sidebar-border)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 64, flexShrink: 0,
      }}>
        {!collapsed && (
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>OptiFlow</div>
            <div style={{ color: 'var(--sidebar-text)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {activeBranch?.name}
            </div>
          </div>
        )}

        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          id="sidebar-toggle-btn"
          style={{
            background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer',
            color: 'var(--sidebar-text)', borderRadius: 6, padding: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 0' }}>
        {navItems.map((item, idx) => {
          if (item.section) {
            if (collapsed) return null;
            return (
              <div key={idx} style={{
                padding: '16px 16px 6px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: 'rgba(148,163,184,0.6)', textTransform: 'uppercase',
              }}>
                {item.section}
              </div>
            );
          }

          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const badgeCount = item.badge ? DEMO_BADGES[item.badge] : null;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              id={`nav-${item.id}`}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: 10, padding: collapsed ? '10px 0' : '9px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                margin: '1px 8px',
                borderRadius: 8,
                color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                background: isActive ? 'var(--sidebar-active)' : 'transparent',
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                position: 'relative',
                minWidth: 0,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--sidebar-text-active)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)'; }}
            >
              <span style={{ flexShrink: 0 }}><NavIcon name={item.icon} /></span>

              {!collapsed && (
                <>
                  <span className="truncate" style={{ flex: 1 }}>{item.label}</span>
                  {badgeCount != null && badgeCount > 0 && (
                    <span style={{
                      background: '#ef4444', color: '#fff', borderRadius: 999,
                      fontSize: 10, fontWeight: 700, padding: '1px 6px',
                      minWidth: 18, textAlign: 'center', flexShrink: 0,
                    }}>
                      {badgeCount}
                    </span>
                  )}
                </>
              )}

              {/* Collapsed badge dot */}
              {collapsed && badgeCount != null && badgeCount > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                  border: '2px solid var(--sidebar-bg)',
                }} />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div style={{
        borderTop: '1px solid var(--sidebar-border)',
        padding: collapsed ? '12px 0' : '12px 16px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 10, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={currentUser?.name ?? ''} role={currentUser?.role} size={32} />
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.2 }}>
                {currentUser?.name}
              </div>
              <div className="truncate" style={{ fontSize: 11, color: 'var(--sidebar-text)', marginTop: 1 }}>
                {currentUser?.roleLabel}
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            id="sidebar-logout-btn"
            aria-label="Log out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sidebar-text)', padding: 4, borderRadius: 4, display: 'flex' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--sidebar-text)'; }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}

export { NAV_CONFIG };
