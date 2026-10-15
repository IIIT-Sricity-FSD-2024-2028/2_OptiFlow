import { apiClient } from './client';

export const getMetrics = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiClient(qs ? `/executive/metrics?${qs}` : '/executive/metrics');
};

export const getBranches = () => apiClient('/executive/branches');
