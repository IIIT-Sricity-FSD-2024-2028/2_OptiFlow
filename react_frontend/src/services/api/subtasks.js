import { apiClient } from './client';

// `opts` passes request options (signal, abortKey) from the Redux thunks.
export const list = (opts = {}) => apiClient('/api/subtasks', opts);
export const get = (id, opts = {}) => apiClient(`/api/subtasks/${id}`, opts);
export const create = (data, opts = {}) => apiClient('/api/subtasks', { ...opts, body: data });
export const update = (id, data, opts = {}) => apiClient(`/api/subtasks/${id}`, { ...opts, method: 'PATCH', body: data });
export const remove = (id, opts = {}) => apiClient(`/api/subtasks/${id}`, { ...opts, method: 'DELETE' });
export const listByTask = (taskId, opts = {}) => apiClient(`/api/subtasks/by-task/${taskId}`, opts);
