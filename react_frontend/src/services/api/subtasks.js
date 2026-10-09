import { apiClient } from './client';

export const list = () => apiClient('/api/subtasks');
export const get = (id) => apiClient(`/api/subtasks/${id}`);
export const create = (data) => apiClient('/api/subtasks', { body: data });
export const update = (id, data) => apiClient(`/api/subtasks/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/subtasks/${id}`, { method: 'DELETE' });
