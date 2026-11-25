import { apiClient } from './client';

// Matches back-end-new/src/routes/notifications.routes.js (PRE-M5-06).
// GET returns the caller's own notifications; Owner/System Admin may pass a userId.
export const list = (params = {}, options) => {
  const qs = params?.userId ? `?userId=${encodeURIComponent(params.userId)}` : '';
  return apiClient(`/api/notifications${qs}`, options);
};
export const create = (data, options) => apiClient('/api/notifications', { ...options, method: 'POST', body: data });
export const markRead = (id, options) => apiClient(`/api/notifications/${id}/read`, { ...options, method: 'PATCH' });
export const markAllRead = (data, options) => apiClient('/api/notifications/read-all', { ...options, method: 'POST', body: data });
export const remove = (id, options) => apiClient(`/api/notifications/${id}`, { ...options, method: 'DELETE' });
