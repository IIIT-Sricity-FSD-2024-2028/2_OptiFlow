import { apiClient } from './client';

export const list = () => apiClient('/api/notifications');
export const get = (id) => apiClient(`/api/notifications/${id}`);
export const create = (data) => apiClient('/api/notifications', { body: data });
export const update = (id, data) => apiClient(`/api/notifications/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/notifications/${id}`, { method: 'DELETE' });
