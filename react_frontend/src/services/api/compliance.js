import { apiClient } from './client';

export const list = () => apiClient('/api/compliance');
export const get = (id) => apiClient(`/api/compliance/${id}`);
export const create = (data) => apiClient('/api/compliance', { body: data });
export const update = (id, data) => apiClient(`/api/compliance/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/compliance/${id}`, { method: 'DELETE' });
