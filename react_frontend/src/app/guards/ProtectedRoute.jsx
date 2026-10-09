import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PATHS } from '../paths';

// It uses <Outlet /> to render the nested child routes if the user is allowed in.
export const ProtectedRoute = ({ allowedRoles = [], isPlatform = false }) => {
  const { user, loading } = useAuth();

  // If AuthContext is still checking sessionStorage, don't redirect yet
  if (loading) {
    return <div>Loading session...</div>; // You can replace this with your shared <Loader /> later
  }

  // 1. Not logged in at all? Kick to login page.
  if (!user) {
    // Both standard and platform admins use the unified login page now
    return <Navigate to={PATHS.PUBLIC.LOGIN} replace />;
  }

  // 2. Is this a platform route but the user is a standard tenant? Kick to login page
  if (isPlatform && !user.isPlatform) {
    return <Navigate to={PATHS.COMMON.UNAUTHORIZED} replace />;
  }

  // 3. Is this a standard tenant route, but the user is a platform admin? Kick them out.
  if (!isPlatform && user.isPlatform) {
    return <Navigate to={PATHS.PLATFORM.DASHBOARD} replace />;
  }

  // 4. Do they have the right role for this specific route?
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={PATHS.COMMON.UNAUTHORIZED} replace />;
  }

  // 5. Access granted! Render the children routes.
  return <Outlet />;
};
