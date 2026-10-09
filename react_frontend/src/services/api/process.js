import { apiClient } from './client';

export const list = () => apiClient('/api/process');
export const get = (id) => apiClient(`/api/process/${id}`);
export const create = (data) => apiClient('/api/process', { body: data });
export const update = (id, data) => apiClient(`/api/process/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/process/${id}`, { method: 'DELETE' });
