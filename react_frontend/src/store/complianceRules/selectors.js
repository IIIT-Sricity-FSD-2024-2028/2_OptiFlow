export const selectAllComplianceRules = (state) =>
  state.complianceRules.items;

export const selectCurrentComplianceRule = (state) =>
  state.complianceRules.currentRule;

export const selectComplianceRulesStatus = (state) =>
  state.complianceRules.status;

export const selectComplianceRulesError = (state) =>
  state.complianceRules.error;

export const selectIsComplianceRulesLoading = (state) =>
  state.complianceRules.status === "loading";

export const selectComplianceRuleById = (id) => (state) =>
  state.complianceRules.items.find((r) => r.id === id) ||
  (state.complianceRules.currentRule?.id === id
    ? state.complianceRules.currentRule
    : null);
