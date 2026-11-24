import { apiClient } from './client';
import { req, seg, send, withQuery } from './hrRequest';

export const list = (params = {}, options) =>
  send(() => apiClient(withQuery('/api/teams', { branchId: params?.branchId }), req(options, 'GET')));
export const get = (id, options) => send(() => apiClient(`/api/teams/${seg(id)}`, req(options, 'GET')));
export const create = (data, options) => send(() => apiClient('/api/teams', req(options, 'POST', data)));
export const update = (id, data, options) =>
  send(() => apiClient(`/api/teams/${seg(id)}`, req(options, 'PATCH', data)));
export const remove = (id, options) => send(() => apiClient(`/api/teams/${seg(id)}`, req(options, 'DELETE')));
export const addMember = (teamId, data, options) =>
  send(() => apiClient(`/api/teams/${seg(teamId)}/members`, req(options, 'POST', data)));
export const updateMemberRole = (teamId, userId, role, options) =>
  send(() => apiClient(`/api/teams/${seg(teamId)}/members/${seg(userId)}`, req(options, 'PATCH', { role })));
export const removeMember = (teamId, userId, options) =>
  send(() => apiClient(`/api/teams/${seg(teamId)}/members/${seg(userId)}`, req(options, 'DELETE')));
