import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AppShell from './shared_components/layout/AppShell.jsx';
import ShowcasePage from './pages/ShowcasePage.jsx';
import { useAuth, DEMO_USERS } from './context/AuthContext.jsx';

// ─── Role Switcher Banner ─────────────────────────────────────────────────────
function RoleSwitcherBanner() {
  const { currentUser, switchRole, allRoles } = useAuth();
  const [open, setOpen] = useState(false);

  const ROLE_COLORS = {
    SuperUser: '#2563eb', System_Admin: '#7c3aed', Process_Admin: '#0891b2',
    Company_Owner: '#b45309', Branch_Manager: '#059669', Executive: '#64748b',
    Project_Manager: '#2563eb', Compliance_Officer: '#dc2626',
    HR_Manager: '#db2777', Team_Leader: '#9333ea', Team_Member: '#475569',
    Platform_Admin: '#1d4ed8',
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #1e293b 0%, #1a223e 100%)',
      padding: '8px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      fontSize: 12, color: '#94a3b8',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'relative', zIndex: 200, flexShrink: 0,
    }}>
      <span style={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10 }}>
        Demo Role Switcher
      </span>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {allRoles.map(role => (
          <button
            key={role}
            id={`role-switch-${role.toLowerCase()}`}
            onClick={() => switchRole(role)}
            style={{
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11, fontWeight: currentUser?.role === role ? 700 : 400,
              border: `1.5px solid ${currentUser?.role === role ? ROLE_COLORS[role] ?? '#2563eb' : 'transparent'}`,
              background: currentUser?.role === role ? `${ROLE_COLORS[role]}22` : 'rgba(255,255,255,0.05)',
              color: currentUser?.role === role ? ROLE_COLORS[role] ?? '#60a5fa' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (currentUser?.role !== role) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { if (currentUser?.role !== role) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#64748b'; } }}
          >
            {DEMO_USERS[role]?.roleLabel ?? role.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>
        Viewing as: <strong style={{ color: '#e2e8f0' }}>{currentUser?.name}</strong> · {currentUser?.roleLabel}
      </span>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <RoleSwitcherBanner />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/showcase" replace />} />
            <Route path="/*" element={<ShowcasePage />} />
          </Route>
        </Routes>
      </div>
    </div>
  );
}
