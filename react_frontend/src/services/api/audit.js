import { apiClient } from './client';

// WHY: The Audit Logs API module. Used heavily by Compliance and Executive roles 
// to track system changes and user activities.

const BASE_PATH = '/audit'; // Or '/audit-logs' depending on your exact backend route

export const getAuditLogsList = (params = {}) => {
  // Useful for filtering by role, date, or user ID (e.g. ?role=company_owner)
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  return apiClient(url);
};

export const getAuditLog = (id) => {
  return apiClient(`${BASE_PATH}/${id}`);
};

export const createAuditLog = (data) => {
  return apiClient(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAuditLog = (id, data) => {
  return apiClient(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const removeAuditLog = (id) => {
  return apiClient(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });
};
