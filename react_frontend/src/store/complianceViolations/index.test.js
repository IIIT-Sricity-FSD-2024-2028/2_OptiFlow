import { describe, it, expect } from "vitest";
import reducer, {
  fetchComplianceViolations,
  fetchComplianceViolationById,
  resolveComplianceViolation,
  clearComplianceViolationErrors,
  clearCurrentViolation,
  selectAllComplianceViolations,
  selectCurrentComplianceViolation,
  selectComplianceViolationsStatus,
  selectComplianceViolationsError,
  selectIsComplianceViolationsLoading,
  selectComplianceViolationsByRuleId,
} from "./index";

describe("complianceViolations slice", () => {
  const initialState = {
    items: [],
    currentViolation: null,
    status: "idle",
    error: null,
    loadedAt: null,
    mutations: {},
  };

  it("returns initial state by default", () => {
    expect(reducer(undefined, { type: "UNKNOWN" })).toEqual(initialState);
  });

  describe("fetchComplianceViolations", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchComplianceViolations.pending());
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();
    });

    it("populates items and sets status to succeeded on fulfilled", () => {
      const mockViolations = [
        { id: "v-1", severity: "High", status: "Open" },
        { id: "v-2", severity: "Critical", status: "Open" },
      ];
      const state = reducer(
        initialState,
        fetchComplianceViolations.fulfilled(mockViolations),
      );
      expect(state.status).toBe("succeeded");
      expect(state.items).toEqual(mockViolations);
      expect(typeof state.loadedAt).toBe("number");
    });

    it("sets status to failed and sets error on rejected", () => {
      const mockError = { message: "Server error", status: 500 };
      const state = reducer(
        initialState,
        fetchComplianceViolations.rejected(null, "", undefined, mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("fetchComplianceViolationById", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(
        initialState,
        fetchComplianceViolationById.pending(),
      );
      expect(state.status).toBe("loading");
    });

    it("populates currentViolation and sets status to succeeded on fulfilled", () => {
      const mockViolation = { id: "v-1", severity: "Critical" };
      const state = reducer(
        initialState,
        fetchComplianceViolationById.fulfilled(mockViolation),
      );
      expect(state.status).toBe("succeeded");
      expect(state.currentViolation).toEqual(mockViolation);
    });

    it("sets status to failed on rejected", () => {
      const mockError = { message: "Violation not found", status: 404 };
      const state = reducer(
        initialState,
        fetchComplianceViolationById.rejected(null, "", "v-1", mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("resolveComplianceViolation", () => {
    it("updates target violation in items and currentViolation on fulfilled", () => {
      const previousState = {
        ...initialState,
        items: [
          { id: "v-1", status: "Open", resolutionRemarks: null },
          { id: "v-2", status: "Open", resolutionRemarks: null },
        ],
        currentViolation: { id: "v-1", status: "Open" },
      };
      const resolvedViolation = {
        id: "v-1",
        status: "Resolved",
        resolutionRemarks: "Approved by VP",
      };

      const state = reducer(
        previousState,
        resolveComplianceViolation.fulfilled(resolvedViolation),
      );
      expect(state.items[0].status).toBe("Resolved");
      expect(state.items[0].resolutionRemarks).toBe("Approved by VP");
      expect(state.items[1].status).toBe("Open"); // Other items unaffected
      expect(state.currentViolation).toEqual(resolvedViolation);
    });
  });

  describe("synchronous actions", () => {
    it("clears error and currentViolation", () => {
      const stateWithData = {
        ...initialState,
        error: { message: "Some error" },
        currentViolation: { id: "v-1" },
      };

      const clearedError = reducer(
        stateWithData,
        clearComplianceViolationErrors(),
      );
      expect(clearedError.error).toBeNull();

      const clearedViolation = reducer(stateWithData, clearCurrentViolation());
      expect(clearedViolation.currentViolation).toBeNull();
    });
  });

  describe("selectors", () => {
    const mockState = {
      complianceViolations: {
        items: [
          { id: "v-1", ruleId: "rule-10", status: "Open" },
          { id: "v-2", ruleId: "rule-20", status: "Resolved" },
        ],
        currentViolation: { id: "v-1", ruleId: "rule-10" },
        status: "succeeded",
        error: null,
      },
    };

    it("selectAllComplianceViolations selects items", () => {
      expect(selectAllComplianceViolations(mockState)).toEqual(
        mockState.complianceViolations.items,
      );
    });

    it("selectCurrentComplianceViolation selects currentViolation", () => {
      expect(selectCurrentComplianceViolation(mockState)).toEqual(
        mockState.complianceViolations.currentViolation,
      );
    });

    it("selectComplianceViolationsByRuleId filters violations by ruleId", () => {
      expect(selectComplianceViolationsByRuleId("rule-10")(mockState)).toEqual([
        mockState.complianceViolations.items[0],
      ]);
      expect(selectComplianceViolationsByRuleId("rule-999")(mockState)).toEqual(
        [],
      );
    });

    it("selectIsComplianceViolationsLoading returns false when succeeded", () => {
      expect(selectIsComplianceViolationsLoading(mockState)).toBe(false);
    });
  });
});
