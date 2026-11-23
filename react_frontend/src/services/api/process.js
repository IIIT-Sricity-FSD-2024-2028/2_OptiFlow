import { apiClient } from './client';

function read(path, options) {
  return options ? apiClient(path, options) : apiClient(path);
}

function queryString(params) {
  const query = new URLSearchParams(params).toString();
  return query ? '?' + query : '';
}

// Templates
export const listTemplates = (options) => read('/api/process-templates', options);
export const getTemplate = (id, options) => read(`/api/process-templates/${id}`, options);
export const createTemplate = (data, options) => apiClient('/api/process-templates', { ...options, method: 'POST', body: data });
export const updateTemplate = (id, data, options) => apiClient(`/api/process-templates/${id}`, { ...options, method: 'PATCH', body: data });
export const deleteTemplate = (id, options) => apiClient(`/api/process-templates/${id}`, { ...options, method: 'DELETE' });
export const listTemplateSteps = (id, options) => read(`/api/process-templates/${id}/steps`, options);
export const addTemplateStep = (templateId, data, options) => apiClient(`/api/process-templates/${templateId}/steps`, { ...options, method: 'POST', body: data });

// Instances
export const listInstances = (params, options) => read(`/api/process-instances${queryString(params)}`, options);
export const getInstance = (id, options) => read(`/api/process-instances/${id}`, options);
export const createInstance = (data, options) => apiClient('/api/process-instances', { ...options, method: 'POST', body: data });
export const updateInstance = (id, data, options) => apiClient(`/api/process-instances/${id}`, { ...options, method: 'PATCH', body: data });
export const deleteInstance = (id, options) => apiClient(`/api/process-instances/${id}`, { ...options, method: 'DELETE' });

// Steps & Actions
export const listInstanceSteps = (params, options) => read(`/api/process-instance-steps${queryString(params)}`, options);
export const getInstanceStep = (id, options) => read(`/api/process-instance-steps/${id}`, options);
export const actionStep = (stepId, data, options) => apiClient(`/api/process-instance-steps/${stepId}/action`, { ...options, method: 'PATCH', body: data });
export const createInstanceStep = (data, options) => apiClient('/api/process-instance-steps', { ...options, method: 'POST', body: data });

// Default generic alias exports for backward compatibility
export const list = listInstances;
export const get = getInstance;
export const create = createInstance;
export const update = updateInstance;
export const remove = deleteInstance;
