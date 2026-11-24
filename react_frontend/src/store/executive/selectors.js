export const selectExecutiveMetrics = (state) => state.executive.metrics;

export const selectExecutiveBranches = (state) => state.executive.branches;

export const selectExecutiveStatus = (state) => state.executive.status;

export const selectExecutiveError = (state) => state.executive.error;

export const selectIsExecutiveLoading = (state) =>
  state.executive.status === "loading";
