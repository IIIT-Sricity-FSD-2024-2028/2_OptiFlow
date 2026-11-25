import { apiClient } from './client';

// `opts` passes request options (signal, abortKey) from the Redux thunks.
const withQuery = (path, params = {}) => {
  const query = new URLSearchParams();
  if (params?.branchId) query.set('branchId', params.branchId);
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
};

export const getMetrics = (params = {}, opts = {}) => apiClient(withQuery('/executive/metrics', params), opts);

export const getBranches = (opts = {}) => apiClient('/executive/branches', opts);

// Per-project health (on_track / at_risk / off_track / done) with the reasons behind it.
export const getPortfolio = (params = {}, opts = {}) => apiClient(withQuery('/executive/portfolio', params), opts);

// One row per branch: headcount, delivery, overdue work and open issues.
export const getBranchPerformance = (params = {}, opts = {}) =>
  apiClient(withQuery('/executive/branch-performance', params), opts);

// Active users holding the Project Manager role (for the assign-PM pickers).
export const getProjectManagers = (opts = {}) => apiClient('/executive/project-managers', opts);

// Appoint or replace a project's Project Manager.
export const assignProjectManager = (projectId, projectManagerId, opts = {}) =>
  apiClient(`/executive/projects/${projectId}/manager`, {
    ...opts,
    method: 'PATCH',
    body: { projectManagerId },
  });
