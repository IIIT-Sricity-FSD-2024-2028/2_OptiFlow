import { apiClient } from './client';

export const list = () => apiClient('/api/tasks');
export const get = (id) => apiClient(`/api/tasks/${id}`);
export const create = (data) => apiClient('/api/tasks', { body: data });
export const update = (id, data) => apiClient(`/api/tasks/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/tasks/${id}`, { method: 'DELETE' });
