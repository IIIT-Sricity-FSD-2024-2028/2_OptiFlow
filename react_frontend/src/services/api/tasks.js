import { apiClient } from './client';

// `opts` passes request options (signal, abortKey) from the Redux thunks.
export const list = (opts = {}) => apiClient('/api/tasks', opts);
export const get = (id, opts = {}) => apiClient(`/api/tasks/${id}`, opts);
export const create = (data, opts = {}) => apiClient('/api/tasks', { ...opts, body: data });
export const update = (id, data, opts = {}) => apiClient(`/api/tasks/${id}`, { ...opts, method: 'PATCH', body: data });
export const remove = (id, opts = {}) => apiClient(`/api/tasks/${id}`, { ...opts, method: 'DELETE' });
export const listByAssignee = (userId, opts = {}) => apiClient(`/api/tasks/assignee/${userId}`, opts);
