// 

import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavForRole } from '../config/nav';
import { Sidebar } from '../shared/components/Sidebar';
import { Topbar } from '../shared/components/Topbar';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navItems = getNavForRole(user?.role);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Shared Retractable Sidebar */}
      <Sidebar navItems={navItems} title="OptiFlow" />

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Shared Topbar */}
        <Topbar />

        {/* Child Pages */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {/* A page that crashes shows an error here; the sidebar and top bar keep working. */}
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
