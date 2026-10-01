import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Search, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';

/**
 * AppShell
 * ────────
 * Outer viewport layout. Manages responsive sidebar toggle, mobile drawer,
 * page header, and wraps child routes via <Outlet />.
 *
 * Providers (AuthProvider, ToastProvider, BranchProvider) are applied
 * in main.jsx above the router, not inside AppShell, to keep concerns separate.
 */
export default function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { activeBranch } = useBranch();
  const { currentUser } = useAuth();

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-color)' }}>
      {/* ── Mobile Sidebar Overlay ── */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 150,
            display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{ zIndex: 10, flexShrink: 0 }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: 60, background: 'white',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12,
          flexShrink: 0, zIndex: 5,
        }}>
          {/* Mobile hamburger */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileDrawerOpen(o => !o)}
            style={{
              display: 'none', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
            }}
            className="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb / Page title slot */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {activeBranch?.name}
            </div>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-3)', borderRadius: 8,
            padding: '6px 12px', border: '1px solid var(--border-color)',
            minWidth: 220,
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              id="app-global-search"
              placeholder="Search…"
              style={{
                border: 'none', background: 'none', outline: 'none',
                fontSize: 13, color: 'var(--text-main)', width: '100%',
              }}
            />
          </div>

          {/* Notification Bell */}
          <button
            id="header-notifications-btn"
            aria-label="Notifications"
            style={{
              position: 'relative', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)', padding: 6,
              borderRadius: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 8, height: 8, borderRadius: '50%',
              background: '#ef4444', border: '2px solid white',
            }} />
          </button>

          {/* User avatar */}
          <Avatar
            name={currentUser?.name ?? ''}
            role={currentUser?.role}
            size={34}
            presence="online"
          />
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
