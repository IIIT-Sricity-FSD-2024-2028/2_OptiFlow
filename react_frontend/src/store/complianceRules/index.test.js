import { describe, it, expect } from "vitest";
import reducer, {
  fetchComplianceRules,
  fetchComplianceRuleById,
  createComplianceRule,
  updateComplianceRule,
  deleteComplianceRule,
  runComplianceEngine,
  clearComplianceRuleErrors,
  clearCurrentRule,
  selectAllComplianceRules,
  selectCurrentComplianceRule,
  selectComplianceRulesStatus,
  selectComplianceRulesError,
  selectIsComplianceRulesLoading,
  selectComplianceRuleById,
} from "./index";

describe("complianceRules slice", () => {
  const initialState = {
    items: [],
    currentRule: null,
    status: "idle",
    error: null,
    loadedAt: null,
    mutations: {},
  };

  it("returns initial state by default", () => {
    expect(reducer(undefined, { type: "UNKNOWN" })).toEqual(initialState);
  });

  describe("fetchComplianceRules", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchComplianceRules.pending());
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();
    });

    it("populates items and sets status to succeeded on fulfilled", () => {
      const mockRules = [
        { id: "rule-1", name: "Rule 1", severity: "High" },
        { id: "rule-2", name: "Rule 2", severity: "Medium" },
      ];
      const state = reducer(
        initialState,
        fetchComplianceRules.fulfilled(mockRules),
      );
      expect(state.status).toBe("succeeded");
      expect(state.items).toEqual(mockRules);
      expect(typeof state.loadedAt).toBe("number");
    });

    it("sets status to failed and sets error on rejected", () => {
      const mockError = { message: "Server error", status: 500 };
      const state = reducer(
        initialState,
        fetchComplianceRules.rejected(null, "", undefined, mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("fetchComplianceRuleById", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchComplianceRuleById.pending());
      expect(state.status).toBe("loading");
    });

    it("populates currentRule and sets status to succeeded on fulfilled", () => {
      const mockRule = { id: "rule-1", name: "Detailed Rule" };
      const state = reducer(
        initialState,
        fetchComplianceRuleById.fulfilled(mockRule),
      );
      expect(state.status).toBe("succeeded");
      expect(state.currentRule).toEqual(mockRule);
    });

    it("sets status to failed and sets error on rejected", () => {
      const mockError = { message: "Rule not found", status: 404 };
      const state = reducer(
        initialState,
        fetchComplianceRuleById.rejected(null, "", "rule-1", mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("createComplianceRule", () => {
    it("prepends new rule to items on fulfilled", () => {
      const existing = [{ id: "rule-1", name: "Rule 1" }];
      const previousState = { ...initialState, items: existing };
      const newRule = { id: "rule-2", name: "New Rule" };

      const state = reducer(
        previousState,
        createComplianceRule.fulfilled(newRule),
      );
      expect(state.items).toHaveLength(2);
      expect(state.items[0]).toEqual(newRule);
      expect(state.items[1]).toEqual(existing[0]);
    });
  });

  describe("updateComplianceRule", () => {
    it("updates target rule in items and currentRule on fulfilled", () => {
      const previousState = {
        ...initialState,
        items: [
          { id: "rule-1", name: "Old Name", isActive: true },
          { id: "rule-2", name: "Other Rule", isActive: true },
        ],
        currentRule: { id: "rule-1", name: "Old Name", isActive: true },
      };
      const updatedRule = { id: "rule-1", name: "Updated Name", isActive: false };

      const state = reducer(
        previousState,
        updateComplianceRule.fulfilled(updatedRule),
      );
      expect(state.items[0].name).toBe("Updated Name");
      expect(state.items[0].isActive).toBe(false);
      expect(state.items[1].name).toBe("Other Rule");
      expect(state.currentRule).toEqual(updatedRule);
    });
  });

  describe("deleteComplianceRule", () => {
    it("filters out deleted rule and clears currentRule if matched", () => {
      const previousState = {
        ...initialState,
        items: [
          { id: "rule-1", name: "Rule 1" },
          { id: "rule-2", name: "Rule 2" },
        ],
        currentRule: { id: "rule-1", name: "Rule 1" },
      };

      const state = reducer(
        previousState,
        deleteComplianceRule.fulfilled({ id: "rule-1" }),
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe("rule-2");
      expect(state.currentRule).toBeNull();
    });
  });

  describe("runComplianceEngine", () => {
    it("sets status to loading on pending and succeeded on fulfilled", () => {
      const pendingState = reducer(initialState, runComplianceEngine.pending());
      expect(pendingState.status).toBe("loading");

      const fulfilledState = reducer(pendingState, runComplianceEngine.fulfilled());
      expect(fulfilledState.status).toBe("succeeded");
    });
  });

  describe("synchronous actions", () => {
    it("clears error and currentRule", () => {
      const stateWithError = {
        ...initialState,
        error: { message: "Some error" },
        currentRule: { id: "rule-1" },
      };

      const clearedError = reducer(stateWithError, clearComplianceRuleErrors());
      expect(clearedError.error).toBeNull();

      const clearedRule = reducer(stateWithError, clearCurrentRule());
      expect(clearedRule.currentRule).toBeNull();
    });
  });

  describe("selectors", () => {
    const mockState = {
      complianceRules: {
        items: [{ id: "rule-1", name: "Rule 1" }],
        currentRule: { id: "rule-2", name: "Rule 2" },
        status: "loading",
        error: { message: "Failed" },
      },
    };

    it("selectAllComplianceRules selects items", () => {
      expect(selectAllComplianceRules(mockState)).toEqual(
        mockState.complianceRules.items,
      );
    });

    it("selectCurrentComplianceRule selects currentRule", () => {
      expect(selectCurrentComplianceRule(mockState)).toEqual(
        mockState.complianceRules.currentRule,
      );
    });

    it("selectComplianceRulesStatus selects status", () => {
      expect(selectComplianceRulesStatus(mockState)).toBe("loading");
    });

    it("selectComplianceRulesError selects error", () => {
      expect(selectComplianceRulesError(mockState)).toEqual({
        message: "Failed",
      });
    });

    it("selectIsComplianceRulesLoading returns true when loading", () => {
      expect(selectIsComplianceRulesLoading(mockState)).toBe(true);
    });

    it("selectComplianceRuleById finds from items or currentRule", () => {
      expect(selectComplianceRuleById("rule-1")(mockState)).toEqual({
        id: "rule-1",
        name: "Rule 1",
      });
      expect(selectComplianceRuleById("rule-2")(mockState)).toEqual({
        id: "rule-2",
        name: "Rule 2",
      });
      expect(selectComplianceRuleById("non-existent")(mockState)).toBeNull();
    });
  });
});
