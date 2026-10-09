import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api/client';

// 1. Create the Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Restore session on refresh
  useEffect(() => {
    const restoreSession = async () => {
      const token = sessionStorage.getItem('authToken');
      const isPlatform = sessionStorage.getItem('isPlatform') === 'true';
      
      if (token) {
        try {
          // Use the correct backend route depending on user type
          const meRoute = isPlatform ? '/platform/auth/me' : '/auth/me';
          const userData = await apiClient(meRoute); 
          
          // The backend wraps the identity in `userData.user`
          const restoredUser = userData.user || userData;
          setUser({ ...restoredUser, isPlatform });
        } catch (error) {
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('isPlatform');
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    // Explicitly uses POST /auth/login defined in auth.controller.js
    const response = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    const isPlatformAdmin = response.role === 'platform_admin';
    
    sessionStorage.setItem('authToken', response.token);
    sessionStorage.setItem('isPlatform', isPlatformAdmin ? 'true' : 'false');
    // response.user and response.role are guaranteed by the backend's handleLogin
    setUser({ ...response.user, role: response.role, isPlatform: isPlatformAdmin }); 
    return response;
  };

  const platformLogin = async (credentials) => {
    // Explicitly uses POST /platform/auth/login defined in platform.routes.js
    const response = await apiClient('/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    sessionStorage.setItem('authToken', response.token);
    sessionStorage.setItem('isPlatform', 'true');
    
    const loggedInUser = response.adminUser || response.user || {};
    setUser({ ...loggedInUser, role: 'system_admin', isPlatform: true }); 
    return response;
  };

  const logout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('isPlatform');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, platformLogin, logout, loading }}>
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
