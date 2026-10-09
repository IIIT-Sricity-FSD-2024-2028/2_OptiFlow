import { apiClient } from './client';

export const list = () => apiClient('/api/users');
export const get = (id) => apiClient(`/api/users/${id}`);
export const create = (data) => apiClient('/api/users', { body: data });
export const update = (id, data) => apiClient(`/api/users/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/users/${id}`, { method: 'DELETE' });
