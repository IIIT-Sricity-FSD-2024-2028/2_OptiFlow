import { describe, it, expect } from "vitest";
import reducer, {
  fetchExecutiveMetrics,
  fetchExecutiveBranches,
  clearExecutiveErrors,
  selectExecutiveMetrics,
  selectExecutiveBranches,
  selectExecutiveStatus,
  selectExecutiveError,
  selectIsExecutiveLoading,
} from "./index";

describe("executive slice", () => {
  const initialState = {
    metrics: null,
    branches: [],
    status: "idle",
    error: null,
    loadedAt: null,
    mutations: {},
    portfolio: { data: { summary: null, projects: [] }, status: "idle", error: null },
    branchPerformance: { data: [], status: "idle", error: null },
    projectManagers: { data: [], status: "idle", error: null },
  };

  it("returns initial state by default", () => {
    expect(reducer(undefined, { type: "UNKNOWN" })).toEqual(initialState);
  });

  describe("fetchExecutiveMetrics", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchExecutiveMetrics.pending());
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();
    });

    it("populates metrics and sets status to succeeded on fulfilled", () => {
      const mockMetrics = {
        totalUsers: 45,
        totalComplianceRules: 12,
        planName: "Enterprise",
      };
      const state = reducer(
        initialState,
        fetchExecutiveMetrics.fulfilled(mockMetrics),
      );
      expect(state.status).toBe("succeeded");
      expect(state.metrics).toEqual(mockMetrics);
      expect(typeof state.loadedAt).toBe("number");
    });

    it("sets status to failed and sets error on rejected", () => {
      const mockError = { message: "Internal server error", status: 500 };
      const state = reducer(
        initialState,
        fetchExecutiveMetrics.rejected(null, "", undefined, mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("fetchExecutiveBranches", () => {
    it("populates branches on fulfilled", () => {
      const mockBranches = [
        { id: "br-1", name: "HQ London" },
        { id: "br-2", name: "NY Office" },
      ];
      const state = reducer(
        initialState,
        fetchExecutiveBranches.fulfilled(mockBranches),
      );
      expect(state.branches).toEqual(mockBranches);
    });
  });

  describe("clearExecutiveErrors", () => {
    it("clears error", () => {
      const stateWithError = {
        ...initialState,
        error: { message: "Error" },
      };
      expect(reducer(stateWithError, clearExecutiveErrors()).error).toBeNull();
    });
  });

  describe("selectors", () => {
    const mockState = {
      executive: {
        metrics: { totalUsers: 10 },
        branches: [{ id: "b-1" }],
        status: "succeeded",
        error: null,
      },
    };

    it("selectExecutiveMetrics selects metrics", () => {
      expect(selectExecutiveMetrics(mockState)).toEqual({ totalUsers: 10 });
    });

    it("selectExecutiveBranches selects branches", () => {
      expect(selectExecutiveBranches(mockState)).toEqual([{ id: "b-1" }]);
    });

    it("selectExecutiveStatus selects status", () => {
      expect(selectExecutiveStatus(mockState)).toBe("succeeded");
    });

    it("selectIsExecutiveLoading returns false when succeeded", () => {
      expect(selectIsExecutiveLoading(mockState)).toBe(false);
    });
  });
});
