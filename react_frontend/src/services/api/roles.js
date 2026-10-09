import { apiClient } from './client';

export const list = () => apiClient('/api/roles');
export const get = (id) => apiClient(`/api/roles/${id}`);
export const create = (data) => apiClient('/api/roles', { body: data });
export const update = (id, data) => apiClient(`/api/roles/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/roles/${id}`, { method: 'DELETE' });
