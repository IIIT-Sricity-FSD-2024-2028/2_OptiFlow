import { describe, it, expect } from "vitest";
import reducer, {
  fetchComplianceBindings,
  createComplianceBinding,
  deleteComplianceBinding,
  clearComplianceBindingErrors,
  selectAllComplianceBindings,
  selectComplianceBindingsStatus,
  selectComplianceBindingsError,
  selectIsComplianceBindingsLoading,
  selectComplianceBindingsByRuleId,
} from "./index";

describe("complianceBindings slice", () => {
  const initialState = {
    items: [],
    status: "idle",
    error: null,
    loadedAt: null,
    mutations: {},
  };

  it("returns initial state by default", () => {
    expect(reducer(undefined, { type: "UNKNOWN" })).toEqual(initialState);
  });

  describe("fetchComplianceBindings", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchComplianceBindings.pending());
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();
    });

    it("populates items and sets status to succeeded on fulfilled", () => {
      const mockBindings = [
        { id: "b-1", ruleId: "rule-1", scopeType: "Company" },
        { id: "b-2", ruleId: "rule-2", scopeType: "Branch", scopeId: "br-1" },
      ];
      const state = reducer(
        initialState,
        fetchComplianceBindings.fulfilled(mockBindings),
      );
      expect(state.status).toBe("succeeded");
      expect(state.items).toEqual(mockBindings);
      expect(typeof state.loadedAt).toBe("number");
    });

    it("sets status to failed and sets error on rejected", () => {
      const mockError = { message: "Network error", status: 500 };
      const state = reducer(
        initialState,
        fetchComplianceBindings.rejected(null, "", undefined, mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("createComplianceBinding", () => {
    it("prepends new binding to items on fulfilled", () => {
      const existing = [{ id: "b-1", ruleId: "rule-1" }];
      const previousState = { ...initialState, items: existing };
      const newBinding = { id: "b-2", ruleId: "rule-2", scopeType: "Project" };

      const state = reducer(
        previousState,
        createComplianceBinding.fulfilled(newBinding),
      );
      expect(state.items).toHaveLength(2);
      expect(state.items[0]).toEqual(newBinding);
      expect(state.items[1]).toEqual(existing[0]);
    });
  });

  describe("deleteComplianceBinding", () => {
    it("filters out deleted binding on fulfilled", () => {
      const previousState = {
        ...initialState,
        items: [
          { id: "b-1", ruleId: "rule-1" },
          { id: "b-2", ruleId: "rule-2" },
        ],
      };

      const state = reducer(
        previousState,
        deleteComplianceBinding.fulfilled({ id: "b-1" }),
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe("b-2");
    });
  });

  describe("selectors", () => {
    const mockState = {
      complianceBindings: {
        items: [
          { id: "b-1", ruleId: "rule-1", scopeType: "Company" },
          { id: "b-2", ruleId: "rule-2", scopeType: "Team", scopeId: "team-1" },
        ],
        status: "succeeded",
        error: null,
      },
    };

    it("selectAllComplianceBindings selects items", () => {
      expect(selectAllComplianceBindings(mockState)).toEqual(
        mockState.complianceBindings.items,
      );
    });

    it("selectComplianceBindingsStatus selects status", () => {
      expect(selectComplianceBindingsStatus(mockState)).toBe("succeeded");
    });

    it("selectIsComplianceBindingsLoading returns false when succeeded", () => {
      expect(selectIsComplianceBindingsLoading(mockState)).toBe(false);
    });

    it("selectComplianceBindingsByRuleId filters bindings by ruleId", () => {
      expect(selectComplianceBindingsByRuleId("rule-1")(mockState)).toEqual([
        mockState.complianceBindings.items[0],
      ]);
      expect(selectComplianceBindingsByRuleId("non-existent")(mockState)).toEqual([]);
    });
  });

  describe("clearComplianceBindingErrors", () => {
    it("clears error", () => {
      const stateWithError = {
        ...initialState,
        error: { message: "Error" },
      };
      expect(reducer(stateWithError, clearComplianceBindingErrors()).error).toBeNull();
    });
  });
});
