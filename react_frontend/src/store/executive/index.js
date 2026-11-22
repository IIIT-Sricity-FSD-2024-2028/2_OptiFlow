import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { fetchExecutiveMetrics, fetchExecutiveBranches } from "./thunks";

const initialState = {
  ...baseState(),
  metrics: null,
  branches: [],
};

export const executiveSlice = createSlice({
  name: "executive",
  initialState,
  reducers: {
    clearExecutiveErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Metrics Lifecycle
      .addCase(fetchExecutiveMetrics.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchExecutiveMetrics.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.metrics = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchExecutiveMetrics.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch Branches Lifecycle
      .addCase(fetchExecutiveBranches.fulfilled, (state, action) => {
        state.branches = action.payload;
      });
  },
});

export const { clearExecutiveErrors } = executiveSlice.actions;

export * from "./thunks";
export * from "./selectors";

export default executiveSlice.reducer;
