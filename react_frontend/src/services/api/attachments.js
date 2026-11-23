import { apiClient } from './client';

export function list({ entityType, entityId } = {}, options) {
  const query = new URLSearchParams();
  if (entityType) query.set('entityType', entityType);
  if (entityId) query.set('entityId', entityId);
  return apiClient('/api/attachments' + (query.size ? '?' + query : ''), options);
}

export const get = (id, options) => apiClient(`/api/attachments/${id}`, options);
export const create = (data, options) => apiClient('/api/attachments', { ...options, method: 'POST', body: data });
export const remove = (id, options) => apiClient(`/api/attachments/${id}`, { ...options, method: 'DELETE' });
