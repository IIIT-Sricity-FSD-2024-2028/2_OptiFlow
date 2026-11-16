import { Outlet, useLocation } from 'react-router-dom';
import { platformNav } from '../config/nav/platform.nav';
import { Sidebar } from '../shared/components/Sidebar';
import { Topbar } from '../shared/components/Topbar';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';

function PlatformLayout() {
  const location = useLocation();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Shared Retractable Sidebar */}
      <Sidebar navItems={platformNav} title="OptiFlow Admin" />

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Shared Topbar */}
        <Topbar title="Platform Admin Console" />

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

export default PlatformLayout;
