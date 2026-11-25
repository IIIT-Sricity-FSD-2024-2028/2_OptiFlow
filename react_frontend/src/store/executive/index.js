import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { isAbortedRejection } from "../core/createApiThunk";
import {
  fetchExecutiveMetrics,
  fetchExecutiveBranches,
  fetchExecutivePortfolio,
  fetchBranchPerformance,
  fetchProjectManagers,
  assignProjectManager,
} from "./thunks";

// Each extra executive view keeps its own status/error so one failing panel does not blank the
// whole dashboard.
const subState = (data) => ({ data, status: "idle", error: null });

const initialState = {
  ...baseState(),
  metrics: null,
  branches: [],
  portfolio: subState({ summary: null, projects: [] }),
  branchPerformance: subState([]),
  projectManagers: subState([]),
};

const trackSub = (builder, thunk, key, toData = (payload) => payload) => {
  builder
    .addCase(thunk.pending, (state) => {
      state[key].status = "loading";
      state[key].error = null;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state[key].status = "succeeded";
      state[key].data = toData(action.payload, state[key].data);
    })
    .addCase(thunk.rejected, (state, action) => {
      if (isAbortedRejection(action)) return;
      state[key].status = "failed";
      state[key].error = action.payload || { message: action.error?.message };
    });
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

    trackSub(builder, fetchExecutivePortfolio, "portfolio", (payload) => ({
      summary: payload?.summary || null,
      projects: payload?.projects || [],
    }));
    trackSub(builder, fetchBranchPerformance, "branchPerformance", (payload) =>
      Array.isArray(payload) ? payload : [],
    );
    trackSub(builder, fetchProjectManagers, "projectManagers", (payload) =>
      Array.isArray(payload) ? payload : [],
    );

    // A new PM shows up in the portfolio row at once; the next fetch recomputes health.
    builder
      .addCase(assignProjectManager.pending, (state, action) => {
        state.mutations[`assignPm:${action.meta.arg.projectId}`] = "pending";
      })
      .addCase(assignProjectManager.fulfilled, (state, action) => {
        const { projectId } = action.meta.arg;
        delete state.mutations[`assignPm:${projectId}`];
        const row = state.portfolio.data.projects.find((p) => p.id === projectId);
        if (row && action.payload?.projectManager) {
          row.projectManager = action.payload.projectManager;
          row.reasons = (row.reasons || []).filter((r) => r !== "No Project Manager assigned");
        }
      })
      .addCase(assignProjectManager.rejected, (state, action) => {
        delete state.mutations[`assignPm:${action.meta.arg.projectId}`];
      });
  },
});

export const { clearExecutiveErrors } = executiveSlice.actions;

export * from "./thunks";
export * from "./selectors";

export default executiveSlice.reducer;
