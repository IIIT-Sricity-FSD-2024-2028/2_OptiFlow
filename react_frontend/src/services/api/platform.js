import { apiClient } from "./client";

// URLs only. Every wrapper takes a trailing `options` and forwards it to apiClient, so the
// thunk helper can pass { signal, abortKey } through and the request can be cancelled.

export const getMetrics = (options) => apiClient("/api/platform/metrics", options);

// ---- Plans ----
export const listPlans = (options) => apiClient("/api/platform/plans", options);

export const createPlan = (body, options) =>
  apiClient("/api/platform/plans", { ...options, method: "POST", body });

export const updatePlan = (id, body, options) =>
  apiClient(`/api/platform/plans/${id}`, { ...options, method: "PATCH", body });
