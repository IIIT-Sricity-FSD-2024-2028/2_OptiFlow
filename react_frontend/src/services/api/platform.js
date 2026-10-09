import { apiClient } from './client';

export const list = () => apiClient('/api/platform');
export const get = (id) => apiClient(`/api/platform/${id}`);
export const create = (data) => apiClient('/api/platform', { body: data });
export const update = (id, data) => apiClient(`/api/platform/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/platform/${id}`, { method: 'DELETE' });
