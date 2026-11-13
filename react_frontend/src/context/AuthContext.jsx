import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api/client';
import { getToken, setSession, clearSession, isPlatformSession } from '../services/auth/session';

// 1. Create the Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Why a restored session was dropped (SEC-M2-11), so the login page can explain it.
  const [sessionNotice, setSessionNotice] = useState(null);

  // 2. Restore session on refresh
  useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      const isPlatform = isPlatformSession();

      if (token) {
        try {
          // Use the correct backend route depending on user type
          const meRoute = isPlatform ? '/platform/auth/me' : '/auth/me';
          const userData = await apiClient(meRoute);

          // The backend wraps the identity in `userData.user` or directly in `userData`
          const restoredUser = userData.user || userData;
          const role = isPlatform ? 'platform_admin' : (restoredUser.role || restoredUser.roleSlug);
          setUser({ ...restoredUser, role, isPlatform });
        } catch (error) {
          clearSession();
          setUser(null);
          if (error.status === 402) setSessionNotice('plan_expired');
          else if (error.status === 401) setSessionNotice('session_expired');
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    // Explicitly uses POST /auth/login defined in auth.controller.js
    // SEC-M2-13: this endpoint is for company users only. Platform administrators sign in
    // through platformLogin below (their own endpoint, shorter session).
    const response = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setSession(response.token, false);
    const loggedInUser = response.user || {};
    setUser({ ...loggedInUser, role: response.role || loggedInUser.role, isPlatform: false });
    return response;
  };

  const platformLogin = async (credentials) => {
    // Explicitly uses POST /platform/auth/login defined in platform.routes.js
    const response = await apiClient('/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setSession(response.token, true);

    const loggedInUser = response.adminUser || response.user || {};
    setUser({ ...loggedInUser, role: 'platform_admin', isPlatform: true });
    return response;
  };

  const platformLogout = async () => {
    try {
      await apiClient('/api/platform/auth/logout', {
        method: 'POST',
        credentials: 'include',
        skipAuthRedirect: true,
      });
    } catch (err) {
      console.error('Failed to logout from platform:', err);
    } finally {
      clearSession();
      setUser(null);
      window.location.href = '/login';
    }
  };

  const logout = async () => {
    // SEC-M2-20: decide from the session itself, never from the URL or from tenant role names
    // (a company System Admin is a tenant user, not a platform user).
    const isPlatform = Boolean(user?.isPlatform) || isPlatformSession();

    if (isPlatform) {
      await platformLogout();
      return;
    }

    clearSession();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, platformLogin, logout, platformLogout, loading, sessionNotice }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use Auth Context easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
