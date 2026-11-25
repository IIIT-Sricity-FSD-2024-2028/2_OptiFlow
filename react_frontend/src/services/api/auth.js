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

// Public: asks the company's administrators to reset this account's password (no email yet).
export const forgotPassword = (body, options) =>
  apiClient("/auth/forgot-password", { ...options, method: "POST", body, skipAuthRedirect: true });

// Public: redeems a one-time set-password link (company owner invite).
export const setPassword = (body, options) =>
  apiClient("/auth/set-password", { ...options, method: "POST", body, skipAuthRedirect: true });

// skipAuthRedirect: a wrong current password answers 401; it must show an error, not sign out.
export const changePassword = (body, options) =>
  apiClient("/auth/change-password", { ...options, method: "POST", body, skipAuthRedirect: true });

export const getPlatformMe = (options) => apiClient("/platform/auth/me", options);

// skipAuthRedirect: a 401 while logging out must not bounce the user anywhere.
export const platformLogout = (options) =>
  apiClient("/api/platform/auth/logout", {
    ...options,
    method: "POST",
    credentials: "include",
    skipAuthRedirect: true,
  });