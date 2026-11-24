import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import {
  fetchComplianceViolations,
  fetchComplianceViolationById,
  resolveComplianceViolation,
} from "./thunks";

const initialState = {
  ...baseState(),
  items: [],
  currentViolation: null,
};

export const complianceViolationsSlice = createSlice({
  name: "complianceViolations",
  initialState,
  reducers: {
    clearComplianceViolationErrors: (state) => {
      state.error = null;
    },
    clearCurrentViolation: (state) => {
      state.currentViolation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 1. Fetch All Violations Lifecycle
      .addCase(fetchComplianceViolations.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchComplianceViolations.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchComplianceViolations.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 2. Fetch Single Violation Lifecycle
      .addCase(fetchComplianceViolationById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchComplianceViolationById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentViolation = action.payload;
      })
      .addCase(fetchComplianceViolationById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 3. Resolve Violation / Grant Waiver Lifecycle
      .addCase(resolveComplianceViolation.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (
          state.currentViolation &&
          state.currentViolation.id === action.payload.id
        ) {
          state.currentViolation = action.payload;
        }
      });
  },
});

export const { clearComplianceViolationErrors, clearCurrentViolation } =
  complianceViolationsSlice.actions;

// Re-export so components only need to import from ".../store/complianceViolations"
export * from "./thunks";
export * from "./selectors";

export default complianceViolationsSlice.reducer;
