import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import {
  fetchComplianceBindings,
  createComplianceBinding,
  deleteComplianceBinding,
} from "./thunks";

const initialState = {
  ...baseState(),
  items: [],
};

export const complianceBindingsSlice = createSlice({
  name: "complianceBindings",
  initialState,
  reducers: {
    clearComplianceBindingErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Lifecycle
      .addCase(fetchComplianceBindings.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchComplianceBindings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchComplianceBindings.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Create Lifecycle
      .addCase(createComplianceBinding.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      // Delete Lifecycle
      .addCase(deleteComplianceBinding.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.id !== action.payload.id,
        );
      });
  },
});

export const { clearComplianceBindingErrors } = complianceBindingsSlice.actions;

export * from "./thunks";
export * from "./selectors";

export default complianceBindingsSlice.reducer;
