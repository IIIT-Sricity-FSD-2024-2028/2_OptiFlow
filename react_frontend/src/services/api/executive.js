import { apiClient } from './client';

export const list = () => apiClient('/api/executive');
export const get = (id) => apiClient(`/api/executive/${id}`);
export const create = (data) => apiClient('/api/executive', { body: data });
export const update = (id, data) => apiClient(`/api/executive/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/executive/${id}`, { method: 'DELETE' });
