import { apiClient, buildUrl, ApiError } from "./client";
import { getToken } from "../auth/session";

// URLs only. Every wrapper takes a trailing `options` and forwards it to apiClient, so the
// thunk helper can pass { signal, abortKey } through and the request can be cancelled.

// The query a list call really sends: empty values and the UI's "All" placeholder are dropped, so
// the backend never sees a filter that means "no filter", and two queries that mean the same thing
// look the same (they share one cache entry in the store).
export const compactQuery = (params = {}) => {
  const out = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text === "" || text === "All") continue;
    out[key] = text;
  }
  return out;
};

export const toQueryString = (params = {}) => {
  const text = new URLSearchParams(compactQuery(params)).toString();
  return text ? `?${text}` : "";
};

const withQuery = (path, query) => `${path}${toQueryString(query)}`;

export const getMetrics = (options) => apiClient("/api/platform/metrics", options);

// ---- Plans ----
export const listPlans = (options) => apiClient("/api/platform/plans", options);

export const createPlan = (body, options) =>
  apiClient("/api/platform/plans", { ...options, method: "POST", body });

export const updatePlan = (id, body, options) =>
  apiClient(`/api/platform/plans/${id}`, { ...options, method: "PATCH", body });

// ---- Companies ----
// query: { page, pageSize, q, status }
export const listCompanies = (query, options) =>
  apiClient(withQuery("/api/platform/companies", query), options);

export const getCompany = (id, options) => apiClient(`/api/platform/companies/${id}`, options);

export const createCompany = (body, options) =>
  apiClient("/api/platform/companies", { ...options, method: "POST", body });

export const updateCompany = (id, body, options) =>
  apiClient(`/api/platform/companies/${id}`, { ...options, method: "PATCH", body });

// ---- Subscriptions ----
// query: { page, pageSize, q, status, planId, billingCycle, pastDue, expiringWithin, companyId }
export const listSubscriptions = (query, options) =>
  apiClient(withQuery("/api/platform/subscriptions", query), options);

export const createSubscription = (body, options) =>
  apiClient("/api/platform/subscriptions", { ...options, method: "POST", body });

export const updateSubscription = (id, body, options) =>
  apiClient(`/api/platform/subscriptions/${id}`, { ...options, method: "PATCH", body });

// ---- Platform admin users ----
// query: { page, pageSize, q, status }
export const listAdminUsers = (query, options) =>
  apiClient(withQuery("/api/platform/admin-users", query), options);

export const createAdminUser = (body, options) =>
  apiClient("/api/platform/admin-users", { ...options, method: "POST", body });

export const updateAdminUser = (id, body, options) =>
  apiClient(`/api/platform/admin-users/${id}`, { ...options, method: "PATCH", body });

export const resetAdminPassword = (id, options) =>
  apiClient(`/api/platform/admin-users/${id}/reset-password`, { ...options, method: "POST" });

// ---- Support access ----
// query: { page, pageSize, q, status, companyId, adminUserId, startDate, endDate }
export const listSupportAccess = (query, options) =>
  apiClient(withQuery("/api/platform/support-access", query), options);

export const createSupportGrant = (body, options) =>
  apiClient("/api/platform/support-access", { ...options, method: "POST", body });

export const revokeSupportGrant = (id, options) =>
  apiClient(`/api/platform/support-access/${id}/revoke`, { ...options, method: "POST" });

// ---- Audit logs ----
// query: { page, pageSize, q, action, entityType, entityId, adminUserId, companyId, startDate, endDate }
export const listAuditLogs = (query, options) =>
  apiClient(withQuery("/api/platform/audit-logs", query), options);

// The export answers with CSV, not JSON, so it cannot go through apiClient (which parses JSON).
// It still goes to the API server (buildUrl) with the same auth as every other call.
export async function exportAuditLogsCsv(query, options = {}) {
  const token = getToken();
  let response;
  try {
    response = await fetch(buildUrl(withQuery("/api/platform/audit-logs/export", query)), {
      credentials: "include",
      signal: options.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.", {
      code: "NETWORK_ERROR",
    });
  }
  if (!response.ok) {
    let message = "Failed to export audit logs";
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      /* not JSON: keep the default message */
    }
    throw new ApiError(message, { status: response.status });
  }
  return response.blob();
}
