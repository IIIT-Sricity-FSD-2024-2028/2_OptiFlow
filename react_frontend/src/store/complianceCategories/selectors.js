export const selectAllComplianceCategories = (state) =>
  state.complianceCategories.items;

export const selectComplianceCategoriesStatus = (state) =>
  state.complianceCategories.status;

export const selectComplianceCategoriesError = (state) =>
  state.complianceCategories.error;

export const selectIsComplianceCategoriesLoading = (state) =>
  state.complianceCategories.status === "loading";
