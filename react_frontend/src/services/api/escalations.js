import { apiClient } from './client';

// `opts` passes request options (signal, abortKey) from the Redux thunks.
export const list = (opts = {}) => apiClient('/api/escalations', opts);
export const get = (id, opts = {}) => apiClient(`/api/escalations/${id}`, opts);
export const create = (data, opts = {}) => apiClient('/api/escalations', { ...opts, body: data });
export const update = (id, data, opts = {}) => apiClient(`/api/escalations/${id}`, { ...opts, method: 'PATCH', body: data });
export const remove = (id, opts = {}) => apiClient(`/api/escalations/${id}`, { ...opts, method: 'DELETE' });
