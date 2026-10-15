import { apiClient } from './client';

export const list = () => apiClient('/api/teams');
export const get = (id) => apiClient(`/api/teams/${id}`);
export const create = (data) => apiClient('/api/teams', { body: data });
export const update = (id, data) => apiClient(`/api/teams/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/teams/${id}`, { method: 'DELETE' });
export const addMember = (teamId, data) => apiClient(`/api/teams/${teamId}/members`, { method: 'POST', body: data });
export const removeMember = (teamId, userId) => apiClient(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
