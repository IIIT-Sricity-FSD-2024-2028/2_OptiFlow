export const selectAllComplianceBindings = (state) =>
  state.complianceBindings.items;

export const selectComplianceBindingsStatus = (state) =>
  state.complianceBindings.status;

export const selectComplianceBindingsError = (state) =>
  state.complianceBindings.error;

export const selectIsComplianceBindingsLoading = (state) =>
  state.complianceBindings.status === "loading";

export const selectComplianceBindingsByRuleId = (ruleId) => (state) =>
  state.complianceBindings.items.filter((b) => b.ruleId === ruleId || b.rule?.id === ruleId);
