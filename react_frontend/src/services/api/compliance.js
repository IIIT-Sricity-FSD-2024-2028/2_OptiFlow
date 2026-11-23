import { apiClient } from './client';

/**
 * Compliance Rules API
 * Backend routes: /api/compliance-rules and /compliance-rules
 */
export const list = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/api/compliance-rules${qs ? `?${qs}` : ''}`);
};
export const get = (id) => apiClient(`/api/compliance-rules/${id}`);
export const create = (data) => apiClient('/api/compliance-rules', { body: data });
export const update = (id, data) => apiClient(`/api/compliance-rules/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/compliance-rules/${id}`, { method: 'DELETE' });

// Explicit aliases for thunks and pages
export const getRules = list;
export const getRule = get;
export const createRule = create;
export const updateRule = update;
export const deleteRule = remove;

/**
 * Compliance Bindings API
 * Backend routes: /api/compliance-bindings
 */
export const getBindings = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/api/compliance-bindings${qs ? `?${qs}` : ''}`);
};

/**
 * Compliance Violations API
 * Backend routes: /api/compliance-violations
 */
export const getViolations = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/api/compliance-violations${qs ? `?${qs}` : ''}`);
};

/**
 * Compliance Categories API
 * Backend routes: /api/compliance-categories
 */
export const getCategories = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/api/compliance-categories${qs ? `?${qs}` : ''}`);
};

/**
 * Compliance Engine Trigger
 */
export const runEngine = () => apiClient('/api/compliance-rules/run-engine', { method: 'POST' });
