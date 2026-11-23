// 1. Get all violations for the main table
export const selectAllComplianceViolations = (state) =>
  state.complianceViolations.items;

// 2. Get the currently selected single violation
export const selectCurrentComplianceViolation = (state) =>
  state.complianceViolations.currentViolation;

// 3. Status and Error states
export const selectComplianceViolationsStatus = (state) =>
  state.complianceViolations.status;

export const selectComplianceViolationsError = (state) =>
  state.complianceViolations.error;

export const selectIsComplianceViolationsLoading = (state) =>
  state.complianceViolations.status === "loading";

// 4. Parameterized Selector: Filter violations by a specific rule
export const selectComplianceViolationsByRuleId = (ruleId) => (state) =>
  state.complianceViolations.items.filter(
    (v) => v.ruleId === ruleId || v.rule?.id === ruleId,
  );
