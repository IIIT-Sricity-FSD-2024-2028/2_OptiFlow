import { apiClient } from "./client";

//This file knows URL's only.
//Every wrapper takes a trailing 'options' and forwards to apiClient.
//so the thunk helper can pass {signal, abortKey} through.

export const login = (credentials, options) =>
  apiClient("/auth/login", { ...options, method: "POST", body: credentials });

export const platformLogin = (credentials, options) =>
  apiClient("/platform/auth/login", { ...options, method: "POST", body: credentials });

export const registerCompany = (payload, options) =>
  apiClient("/auth/register-company", { ...options, method: "POST", body: payload });

export const getMe = (options) => apiClient("/auth/me", options);

export const getPlatformMe = (options) => apiClient("/platform/auth/me", options);

// skipAuthRedirect: a 401 while logging out must not bounce the user anywhere.
export const platformLogout = (options) =>
  apiClient("/api/platform/auth/logout", {
    ...options,
    method: "POST",
    credentials: "include",
    skipAuthRedirect: true,
  });

// Public: the one-time token from an owner invite link is the proof, there is no session yet.
export const setPassword = ({ token, password }, options) =>
  apiClient("/auth/set-password", { ...options, method: "POST", body: { token, password }, skipAuthRedirect: true });

// Signed-in user replaces their password (also lifts the first-login gate). The answer carries a
// fresh token: the old one is revoked by the change.
export const changePassword = ({ currentPassword, newPassword }, options) =>
  apiClient("/auth/change-password", { ...options, method: "POST", body: { currentPassword, newPassword } });

// Platform administrator replaces a temporary password (the server requires at least 10 characters).
export const platformChangePassword = ({ currentPassword, newPassword }, options) =>
  apiClient("/platform/auth/change-password", { ...options, method: "POST", body: { currentPassword, newPassword } });
