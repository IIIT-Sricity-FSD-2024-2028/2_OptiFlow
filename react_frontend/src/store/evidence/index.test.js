import { describe, it, expect, vi, beforeEach } from "vitest";
import evidenceReducer, {
  clearEvidenceErrors,
  clearCurrentEvidence,
  fetchEvidence,
  fetchEvidenceById,
  reviewEvidence,
  uploadEvidenceFile,
  deleteEvidence,
  selectAllEvidence,
  selectCurrentEvidence,
  selectEvidenceStatus,
  selectEvidenceError,
  selectIsEvidenceLoading,
  selectEvidenceByTaskId,
  selectEvidenceByViolationId,
  selectPendingEvidenceCount,
  selectApprovedEvidenceCount,
  selectRejectedEvidenceCount,
} from "./index";
import * as client from "../../services/api/client";

describe("evidence slice", () => {
  let initialState;

  beforeEach(() => {
    initialState = {
      items: [],
      currentEvidence: null,
      status: "idle",
      error: null,
      loadedAt: null,
      mutations: {},
    };
    vi.restoreAllMocks();
  });

  describe("reducers", () => {
    it("returns the initial state", () => {
      expect(evidenceReducer(undefined, { type: "UNKNOWN" })).toEqual({
        items: [],
        currentEvidence: null,
        status: "idle",
        error: null,
        loadedAt: null,
        mutations: {},
      });
    });

    it("handles clearEvidenceErrors", () => {
      const state = { ...initialState, error: "Something failed" };
      const next = evidenceReducer(state, clearEvidenceErrors());
      expect(next.error).toBeNull();
    });

    it("handles clearCurrentEvidence", () => {
      const state = {
        ...initialState,
        currentEvidence: { id: "ev-1", title: "Security Scan" },
      };
      const next = evidenceReducer(state, clearCurrentEvidence());
      expect(next.currentEvidence).toBeNull();
    });
  });

  describe("extraReducers & thunks", () => {
    it("handles fetchEvidence.pending, fulfilled, and rejected", () => {
      // Pending
      let state = evidenceReducer(initialState, {
        type: fetchEvidence.pending.type,
      });
      expect(state.status).toBe("loading");
      expect(state.error).toBeNull();

      // Fulfilled
      const mockList = [
        { id: "ev-1", title: "Doc 1", status: "Pending", taskId: "t-1", violationId: "v-1" },
        { id: "ev-2", title: "Doc 2", status: "Approved", taskId: "t-1", violationId: "v-2" },
      ];
      state = evidenceReducer(state, {
        type: fetchEvidence.fulfilled.type,
        payload: mockList,
      });
      expect(state.status).toBe("succeeded");
      expect(state.items).toEqual(mockList);
      expect(state.loadedAt).toBeTypeOf("number");

      // Rejected
      state = evidenceReducer(state, {
        type: fetchEvidence.rejected.type,
        payload: { message: "Network error" },
      });
      expect(state.status).toBe("failed");
      expect(state.error).toEqual({ message: "Network error" });
    });

    it("skips network fetch if data is fresh and no filters requested", async () => {
      const dispatch = vi.fn();
      const getState = () => ({
        evidence: {
          items: [{ id: "ev-1", title: "Existing" }],
          loadedAt: Date.now(), // fresh
          status: "succeeded",
          error: null,
        },
      });

      const apiClientSpy = vi.spyOn(client, "apiClient");
      const result = await fetchEvidence()(dispatch, getState, undefined);

      expect(apiClientSpy).not.toHaveBeenCalled();
      expect(result.payload).toEqual([{ id: "ev-1", title: "Existing" }]);
    });

    it("bypasses cache when force=true is passed", async () => {
      const dispatch = vi.fn();
      const getState = () => ({
        evidence: {
          items: [{ id: "ev-1" }],
          loadedAt: Date.now(),
          status: "succeeded",
          error: null,
        },
      });

      const freshItems = [{ id: "ev-1" }, { id: "ev-2" }];
      vi.spyOn(client, "apiClient").mockResolvedValue(freshItems);

      const result = await fetchEvidence({ force: true })(
        dispatch,
        getState,
        undefined
      );
      expect(client.apiClient).toHaveBeenCalled();
      expect(result.payload).toEqual(freshItems);
    });

    it("handles fetchEvidenceById.pending, fulfilled, and rejected", () => {
      let state = evidenceReducer(initialState, {
        type: fetchEvidenceById.pending.type,
      });
      expect(state.status).toBe("loading");

      const single = { id: "ev-1", title: "Audit Cert" };
      state = evidenceReducer(state, {
        type: fetchEvidenceById.fulfilled.type,
        payload: single,
      });
      expect(state.status).toBe("succeeded");
      expect(state.currentEvidence).toEqual(single);

      state = evidenceReducer(state, {
        type: fetchEvidenceById.rejected.type,
        payload: { message: "Not found" },
      });
      expect(state.status).toBe("failed");
      expect(state.error).toEqual({ message: "Not found" });
    });

    it("handles reviewEvidence.fulfilled updating status and rejectionReason", () => {
      const state = {
        ...initialState,
        items: [
          { id: "ev-1", status: "Pending", rejectionReason: null },
          { id: "ev-2", status: "Pending", rejectionReason: null },
        ],
        currentEvidence: { id: "ev-1", status: "Pending", rejectionReason: null },
      };

      const updated = {
        id: "ev-1",
        status: "Rejected",
        rejectionReason: "Proof blurred, please re-upload clear scan.",
      };

      const next = evidenceReducer(state, {
        type: reviewEvidence.fulfilled.type,
        payload: updated,
      });

      expect(next.items[0].status).toBe("Rejected");
      expect(next.items[0].rejectionReason).toBe(
        "Proof blurred, please re-upload clear scan."
      );
      expect(next.currentEvidence.status).toBe("Rejected");
      expect(next.items[1].status).toBe("Pending");
    });

    it("handles uploadEvidenceFile.fulfilled updating evidence", () => {
      const state = {
        ...initialState,
        items: [{ id: "ev-1", fileUrl: null, status: "Pending" }],
        currentEvidence: { id: "ev-1", fileUrl: null, status: "Pending" },
      };

      const uploaded = {
        id: "ev-1",
        fileUrl: "/uploads/evidence-123.pdf",
        status: "Under_Review",
      };

      const next = evidenceReducer(state, {
        type: uploadEvidenceFile.fulfilled.type,
        payload: uploaded,
      });

      expect(next.items[0].fileUrl).toBe("/uploads/evidence-123.pdf");
      expect(next.items[0].status).toBe("Under_Review");
      expect(next.currentEvidence.fileUrl).toBe("/uploads/evidence-123.pdf");
    });

    it("handles deleteEvidence.fulfilled removing item", () => {
      const state = {
        ...initialState,
        items: [{ id: "ev-1" }, { id: "ev-2" }],
        currentEvidence: { id: "ev-1" },
      };

      const next = evidenceReducer(state, {
        type: deleteEvidence.fulfilled.type,
        payload: "ev-1",
      });

      expect(next.items).toEqual([{ id: "ev-2" }]);
      expect(next.currentEvidence).toBeNull();
    });
  });

  describe("selectors", () => {
    const mockState = {
      evidence: {
        items: [
          { id: "ev-1", status: "Pending", taskId: "t-1", violationId: "v-1" },
          { id: "ev-2", status: "Under_Review", taskId: "t-1", violationId: "v-2" },
          { id: "ev-3", status: "Approved", taskId: "t-2", violationId: "v-3" },
          { id: "ev-4", status: "Rejected", taskId: "t-2", violationId: "v-4" },
        ],
        currentEvidence: { id: "ev-1", status: "Pending" },
        status: "succeeded",
        error: null,
      },
    };

    it("selects all items, current item, status, error, and loading flag", () => {
      expect(selectAllEvidence(mockState)).toHaveLength(4);
      expect(selectCurrentEvidence(mockState)).toEqual({
        id: "ev-1",
        status: "Pending",
      });
      expect(selectEvidenceStatus(mockState)).toBe("succeeded");
      expect(selectEvidenceError(mockState)).toBeNull();
      expect(selectIsEvidenceLoading(mockState)).toBe(false);
    });

    it("filters by taskId and violationId", () => {
      expect(selectEvidenceByTaskId("t-1")(mockState)).toHaveLength(2);
      expect(selectEvidenceByTaskId("t-2")(mockState)).toHaveLength(2);
      expect(selectEvidenceByViolationId("v-3")(mockState)).toEqual([
        { id: "ev-3", status: "Approved", taskId: "t-2", violationId: "v-3" },
      ]);
    });

    it("calculates pending, approved, and rejected counts", () => {
      expect(selectPendingEvidenceCount(mockState)).toBe(2); // Pending + Under_Review
      expect(selectApprovedEvidenceCount(mockState)).toBe(1); // Approved
      expect(selectRejectedEvidenceCount(mockState)).toBe(1); // Rejected
    });
  });
});
