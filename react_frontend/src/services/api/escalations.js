import { apiClient } from './client';

export const list = () => apiClient('/api/escalations');
export const get = (id) => apiClient(`/api/escalations/${id}`);
export const create = (data) => apiClient('/api/escalations', { body: data });
export const update = (id, data) => apiClient(`/api/escalations/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/escalations/${id}`, { method: 'DELETE' });
