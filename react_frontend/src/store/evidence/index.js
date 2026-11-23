import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import {
  fetchEvidence,
  fetchEvidenceById,
  reviewEvidence,
  uploadEvidenceFile,
  deleteEvidence,
} from "./thunks";

const initialState = {
  ...baseState(),
  items: [],
  currentEvidence: null,
};

export const evidenceSlice = createSlice({
  name: "evidence",
  initialState,
  reducers: {
    clearEvidenceErrors: (state) => {
      state.error = null;
    },
    clearCurrentEvidence: (state) => {
      state.currentEvidence = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 1. Fetch All Evidence
      .addCase(fetchEvidence.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchEvidence.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchEvidence.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 2. Fetch Evidence by ID
      .addCase(fetchEvidenceById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchEvidenceById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentEvidence = action.payload;
      })
      .addCase(fetchEvidenceById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 3. Review / Adjudicate Evidence
      .addCase(reviewEvidence.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated?.id) return;
        const index = state.items.findIndex((item) => item.id === updated.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updated };
        }
        if (state.currentEvidence && state.currentEvidence.id === updated.id) {
          state.currentEvidence = { ...state.currentEvidence, ...updated };
        }
      })

      // 4. Upload Evidence File
      .addCase(uploadEvidenceFile.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated?.id) return;
        const index = state.items.findIndex((item) => item.id === updated.id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updated };
        }
        if (state.currentEvidence && state.currentEvidence.id === updated.id) {
          state.currentEvidence = { ...state.currentEvidence, ...updated };
        }
      })

      // 5. Delete Evidence
      .addCase(deleteEvidence.fulfilled, (state, action) => {
        const id = action.payload;
        state.items = state.items.filter((item) => item.id !== id);
        if (state.currentEvidence?.id === id) {
          state.currentEvidence = null;
        }
      });
  },
});

export const { clearEvidenceErrors, clearCurrentEvidence } =
  evidenceSlice.actions;

export * from "./thunks";
export * from "./selectors";

export default evidenceSlice.reducer;
