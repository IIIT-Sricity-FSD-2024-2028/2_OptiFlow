import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import {
  fetchComplianceCategories,
  createComplianceCategory,
  updateComplianceCategory,
  deleteComplianceCategory,
} from "./thunks";

const initialState = {
  ...baseState(),
  items: [],
};

export const complianceCategoriesSlice = createSlice({
  name: "complianceCategories",
  initialState,
  reducers: {
    clearComplianceErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Lifecycle
      .addCase(fetchComplianceCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchComplianceCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchComplianceCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Create Lifecycle
      .addCase(createComplianceCategory.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      // Update Lifecycle
      .addCase(updateComplianceCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      // Delete Lifecycle
      .addCase(deleteComplianceCategory.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.id !== action.payload.id,
        );
      });
  },
});

export const { clearComplianceErrors } = complianceCategoriesSlice.actions;

// Re-export thunks and selectors so consumers can import directly from this folder
export * from "./thunks";
export * from "./selectors";

export default complianceCategoriesSlice.reducer;
