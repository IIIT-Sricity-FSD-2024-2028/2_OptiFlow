import { apiClient } from './client';

// `opts` passes request options (signal, abortKey) from the Redux thunks.
export const list = (params = {}, opts = {}) => {
  const query = new URLSearchParams();
  if (params?.branchId) query.set('branchId', params.branchId);
  if (params?.teamId) query.set('teamId', params.teamId);
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return apiClient(`/api/projects${qs ? `?${qs}` : ''}`, opts);
};
export const get = (id, opts = {}) => apiClient(`/api/projects/${id}`, opts);
export const create = (data, opts = {}) => apiClient('/api/projects', { ...opts, body: data });
export const update = (id, data, opts = {}) => apiClient(`/api/projects/${id}`, { ...opts, method: 'PATCH', body: data });
export const remove = (id, opts = {}) => apiClient(`/api/projects/${id}`, { ...opts, method: 'DELETE' });
