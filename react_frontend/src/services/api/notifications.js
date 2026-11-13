import { apiClient } from './client';

// Matches back-end-new/src/routes/notifications.routes.js (PRE-M5-06).
// GET returns the caller's own notifications; Owner/System Admin may pass a userId.
export const list = (params = {}) => {
  const qs = params?.userId ? `?userId=${encodeURIComponent(params.userId)}` : '';
  return apiClient(`/api/notifications${qs}`);
};
export const create = (data) => apiClient('/api/notifications', { body: data });
export const markRead = (id) => apiClient(`/api/notifications/${id}/read`, { method: 'PATCH' });
export const markAllRead = () => apiClient('/api/notifications/read-all', { method: 'POST' });
export const remove = (id) => apiClient(`/api/notifications/${id}`, { method: 'DELETE' });
