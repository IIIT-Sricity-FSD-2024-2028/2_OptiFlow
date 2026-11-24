import { describe, it, expect } from "vitest";
import reducer, {
  fetchAuditLogs,
  fetchAuditLogById,
  clearAuditLogErrors,
  clearCurrentAuditLog,
  selectAllAuditLogs,
  selectCurrentAuditLog,
  selectAuditLogsStatus,
  selectAuditLogsError,
  selectIsAuditLogsLoading,
} from "./index";

describe("auditLogs slice", () => {
  const initialState = {
    items: [],
    currentLog: null,
    status: "idle",
    error: null,
    loadedAt: null,
    mutations: {},
  };

  it("returns initial state by default", () => {
    expect(reducer(undefined, { type: "UNKNOWN" })).toEqual(initialState);
  });

  describe("fetchAuditLogs", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchAuditLogs.pending());
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();
    });

    it("populates items and sets status to succeeded on fulfilled", () => {
      const mockLogs = [
        { id: "log-1", action: "CREATE", entityType: "ComplianceRule" },
        { id: "log-2", action: "DELETE", entityType: "ComplianceBinding" },
      ];
      const state = reducer(initialState, fetchAuditLogs.fulfilled(mockLogs));
      expect(state.status).toBe("succeeded");
      expect(state.items).toEqual(mockLogs);
      expect(typeof state.loadedAt).toBe("number");
    });

    it("sets status to failed and sets error on rejected", () => {
      const mockError = { message: "Unauthorized", status: 401 };
      const state = reducer(
        initialState,
        fetchAuditLogs.rejected(null, "", undefined, mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("fetchAuditLogById", () => {
    it("sets status to loading on pending", () => {
      const state = reducer(initialState, fetchAuditLogById.pending());
      expect(state.status).toBe("loading");
    });

    it("populates currentLog and sets status to succeeded on fulfilled", () => {
      const mockLog = { id: "log-1", action: "CREATE" };
      const state = reducer(initialState, fetchAuditLogById.fulfilled(mockLog));
      expect(state.status).toBe("succeeded");
      expect(state.currentLog).toEqual(mockLog);
    });

    it("sets status to failed on rejected", () => {
      const mockError = { message: "Not found", status: 404 };
      const state = reducer(
        initialState,
        fetchAuditLogById.rejected(null, "", "log-1", mockError),
      );
      expect(state.status).toBe("failed");
      expect(state.error).toEqual(mockError);
    });
  });

  describe("clearAuditLogErrors & clearCurrentAuditLog", () => {
    it("clears error and currentLog", () => {
      const stateWithData = {
        ...initialState,
        error: { message: "Error" },
        currentLog: { id: "log-1" },
      };
      expect(reducer(stateWithData, clearAuditLogErrors()).error).toBeNull();
      expect(reducer(stateWithData, clearCurrentAuditLog()).currentLog).toBeNull();
    });
  });

  describe("selectors", () => {
    const mockState = {
      auditLogs: {
        items: [{ id: "log-1", action: "CREATE" }],
        currentLog: { id: "log-1" },
        status: "loading",
        error: null,
      },
    };

    it("selectAllAuditLogs selects items", () => {
      expect(selectAllAuditLogs(mockState)).toEqual(mockState.auditLogs.items);
    });

    it("selectCurrentAuditLog selects currentLog", () => {
      expect(selectCurrentAuditLog(mockState)).toEqual(mockState.auditLogs.currentLog);
    });

    it("selectAuditLogsStatus selects status", () => {
      expect(selectAuditLogsStatus(mockState)).toBe("loading");
    });

    it("selectIsAuditLogsLoading returns true when status is loading", () => {
      expect(selectIsAuditLogsLoading(mockState)).toBe(true);
    });
  });
});
