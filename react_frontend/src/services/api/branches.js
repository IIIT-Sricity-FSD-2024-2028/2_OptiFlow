import { apiClient } from './client';

export const list = () => apiClient('/api/branches');
export const get = (id) => apiClient(`/api/branches/${id}`);
export const create = (data) => apiClient('/api/branches', { body: data });
export const update = (id, data) => apiClient(`/api/branches/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/branches/${id}`, { method: 'DELETE' });
