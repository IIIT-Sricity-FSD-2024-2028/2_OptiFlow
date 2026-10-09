import { apiClient } from './client';

export const list = () => apiClient('/api/projects');
export const get = (id) => apiClient(`/api/projects/${id}`);
export const create = (data) => apiClient('/api/projects', { body: data });
export const update = (id, data) => apiClient(`/api/projects/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/projects/${id}`, { method: 'DELETE' });
