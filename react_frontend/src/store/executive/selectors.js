export const selectExecutiveMetrics = (state) => state.executive.metrics;

export const selectExecutiveBranches = (state) => state.executive.branches;

export const selectExecutiveStatus = (state) => state.executive.status;

export const selectExecutiveError = (state) => state.executive.error;

export const selectIsExecutiveLoading = (state) =>
  state.executive.status === "loading";

// Portfolio health
export const selectPortfolioSummary = (state) => state.executive.portfolio.data.summary;
export const selectPortfolioProjects = (state) => state.executive.portfolio.data.projects;
export const selectPortfolioStatus = (state) => state.executive.portfolio.status;
export const selectPortfolioError = (state) => state.executive.portfolio.error;

// Branch comparison
export const selectBranchPerformance = (state) => state.executive.branchPerformance.data;
export const selectBranchPerformanceStatus = (state) => state.executive.branchPerformance.status;
export const selectBranchPerformanceError = (state) => state.executive.branchPerformance.error;

// Project Managers (assign-PM pickers)
export const selectProjectManagers = (state) => state.executive.projectManagers.data;
export const selectProjectManagersStatus = (state) => state.executive.projectManagers.status;

export const selectIsAssigningPm = (projectId) => (state) =>
  state.executive.mutations[`assignPm:${projectId}`] === "pending";
