import { apiClient } from './client';

/**
 * Audit Logs API (Server-side generated, read-only audit trails)
 * Backend routes: /api/audit-logs and /audit-logs
 */
const BASE_PATH = '/api/audit-logs';

export const getAuditLogsList = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  return apiClient(url);
};

export const getAuditLog = (id) => {
  return apiClient(`${BASE_PATH}/${id}`);
};

export const getSystemAuditLogs = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiClient(`${BASE_PATH}/system${queryString ? `?${queryString}` : ''}`);
};

export const getProcessAuditLogs = (params = {}, options) => {
  const queryString = new URLSearchParams(params).toString();
  return apiClient(`${BASE_PATH}/process${queryString ? `?${queryString}` : ''}`, options);
};

export const getAuditLogsByUser = (userId, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiClient(`${BASE_PATH}/by-user/${userId}${queryString ? `?${queryString}` : ''}`);
};

export const getAuditLogsByEntity = (entityType, entityId, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiClient(`${BASE_PATH}/by-entity/${entityType}/${entityId}${queryString ? `?${queryString}` : ''}`);
};
