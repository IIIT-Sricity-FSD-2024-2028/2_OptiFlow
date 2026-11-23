// 1. All Evidence Items
export const selectAllEvidence = (state) => state.evidence.items;

// 2. Current Selected Evidence Item
export const selectCurrentEvidence = (state) => state.evidence.currentEvidence;

// 3. Status and Error
export const selectEvidenceStatus = (state) => state.evidence.status;
export const selectEvidenceError = (state) => state.evidence.error;
export const selectIsEvidenceLoading = (state) =>
  state.evidence.status === "loading";

// 4. Parameterized Selectors
export const selectEvidenceByTaskId = (taskId) => (state) =>
  state.evidence.items.filter((e) => e.taskId === taskId);

export const selectEvidenceByViolationId = (violationId) => (state) =>
  state.evidence.items.filter((e) => e.violationId === violationId);

// 5. Counters for Review Queue
export const selectPendingEvidenceCount = (state) =>
  state.evidence.items.filter((e) =>
    ["Under_Review", "Pending"].includes(e.status)
  ).length;

export const selectApprovedEvidenceCount = (state) =>
  state.evidence.items.filter((e) => e.status === "Approved").length;

export const selectRejectedEvidenceCount = (state) =>
  state.evidence.items.filter((e) => e.status === "Rejected").length;
