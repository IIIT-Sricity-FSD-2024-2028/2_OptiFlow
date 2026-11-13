import { apiClient } from './client';

export const list = (params = {}) => {
  const query = new URLSearchParams();
  if (params?.branchId) query.set('branchId', params.branchId);
  if (params?.teamId) query.set('teamId', params.teamId);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return apiClient(`/api/projects${qs ? `?${qs}` : ''}`);
};
export const get = (id) => apiClient(`/api/projects/${id}`);
export const create = (data) => apiClient('/api/projects', { body: data });
export const update = (id, data) => apiClient(`/api/projects/${id}`, { method: 'PATCH', body: data });
export const remove = (id) => apiClient(`/api/projects/${id}`, { method: 'DELETE' });
