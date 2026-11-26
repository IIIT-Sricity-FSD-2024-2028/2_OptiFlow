import { apiClient } from './client';

export const getPolicy = (opts = {}) => apiClient('/api/scheduling/policy', opts);

export const updatePolicy = (data, opts = {}) =>
  apiClient('/api/scheduling/policy', { ...opts, method: 'PATCH', body: data });

export const addHoliday = (data, opts = {}) =>
  apiClient('/api/scheduling/holidays', { ...opts, body: data });

export const removeHoliday = (id, opts = {}) =>
  apiClient(`/api/scheduling/holidays/${id}`, { ...opts, method: 'DELETE' });

export const getTaskScheduleAnalysis = (taskId, opts = {}) =>
  apiClient(`/api/tasks/${taskId}/schedule-analysis`, opts);

export const autoScheduleTask = (taskId, data = { apply: true }, opts = {}) =>
  apiClient(`/api/tasks/${taskId}/auto-schedule`, { ...opts, body: data });
