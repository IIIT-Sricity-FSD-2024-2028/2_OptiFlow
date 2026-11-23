import { apiClient } from './client';
import { req, seg, send, withQuery } from './hrRequest';

// There is no update route: changing a role is remove + create.
export const list = (params = {}, options) =>
  send(() =>
    apiClient(withQuery('/api/role-assignments', { userId: params?.userId, roleId: params?.roleId }), req(options, 'GET')),
  );
export const create = (data, options) => send(() => apiClient('/api/role-assignments', req(options, 'POST', data)));
export const remove = (id, options) =>
  send(() => apiClient(`/api/role-assignments/${seg(id)}`, req(options, 'DELETE')));
