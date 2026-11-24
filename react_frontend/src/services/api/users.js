import { apiClient } from './client';
import { req, seg, send } from './hrRequest';

export const list = (options) => send(() => apiClient('/api/users', req(options, 'GET')));
export const get = (id, options) => send(() => apiClient(`/api/users/${seg(id)}`, req(options, 'GET')));
export const create = (data, options) => send(() => apiClient('/api/users', req(options, 'POST', data)));
export const update = (id, data, options) =>
  send(() => apiClient(`/api/users/${seg(id)}`, req(options, 'PATCH', data)));
export const remove = (id, options) => send(() => apiClient(`/api/users/${seg(id)}`, req(options, 'DELETE')));
export const reactivate = (id, options) =>
  send(() => apiClient(`/api/users/${seg(id)}/reactivate`, req(options, 'PATCH')));
