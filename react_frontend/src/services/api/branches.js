import { apiClient } from './client';
import { req, seg, send, withQuery } from './hrRequest';

export const list = (params = {}, options) =>
  send(() => apiClient(withQuery('/api/branches', { branchId: params?.branchId }), req(options, 'GET')));
export const get = (id, options) => send(() => apiClient(`/api/branches/${seg(id)}`, req(options, 'GET')));
export const create = (data, options) => send(() => apiClient('/api/branches', req(options, 'POST', data)));
export const update = (id, data, options) =>
  send(() => apiClient(`/api/branches/${seg(id)}`, req(options, 'PATCH', data)));
// The backend reads `reassignBranchId` from the query or the body; the query is enough.
export const remove = (id, params = {}, options) =>
  send(() =>
    apiClient(
      withQuery(`/api/branches/${seg(id)}`, { reassignBranchId: params?.reassignBranchId }),
      req(options, 'DELETE'),
    ),
  );
