import { apiClient } from './client';

// Templates
export const listTemplates = () => apiClient('/api/process-templates');
export const getTemplate = (id) => apiClient(`/api/process-templates/${id}`);
export const createTemplate = (data) => apiClient('/api/process-templates', { method: 'POST', body: data });
export const updateTemplate = (id, data) => apiClient(`/api/process-templates/${id}`, { method: 'PATCH', body: data });
export const deleteTemplate = (id) => apiClient(`/api/process-templates/${id}`, { method: 'DELETE' });
export const addTemplateStep = (templateId, data) => apiClient(`/api/processes/templates/${templateId}/steps`, { method: 'POST', body: data });

// Instances
export const listInstances = (params) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiClient(`/api/process-instances${query}`);
};
export const getInstance = (id) => apiClient(`/api/process-instances/${id}`);
export const createInstance = (data) => apiClient('/api/process-instances', { method: 'POST', body: data });
export const updateInstance = (id, data) => apiClient(`/api/process-instances/${id}`, { method: 'PATCH', body: data });
export const deleteInstance = (id) => apiClient(`/api/process-instances/${id}`, { method: 'DELETE' });

// Steps & Actions
export const actionStep = (stepId, data) => apiClient(`/api/process-instance-steps/${stepId}/action`, { method: 'PATCH', body: data });
export const createInstanceStep = (data) => apiClient('/api/process-instance-steps', { method: 'POST', body: data });

// Default generic alias exports for backward compatibility
export const list = listInstances;
export const get = getInstance;
export const create = createInstance;
export const update = updateInstance;
export const remove = deleteInstance;
