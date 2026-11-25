import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { fetchAuditLogs, fetchAuditLogById, fetchProcessAuditLogs } from "./thunks";

import { isAbortedRejection } from "../core/createApiThunk";
import { queryKeyOf } from "../core/shouldFetch";

const initialState = {
  ...baseState(),
  items: [],
  currentLog: null,
  processFeed: {
    items: [],
    status: "idle",
    error: null,
    loadedAt: null,
    queryKey: null,
    requestId: null,
  },
};

export const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {
    clearAuditLogErrors: (state) => {
      state.error = null;
    },
    clearCurrentAuditLog: (state) => {
      state.currentLog = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProcessAuditLogs.pending, ({ processFeed }, action) => {
        processFeed.status = "loading";
        processFeed.error = null;
        processFeed.queryKey = queryKeyOf(action.meta.arg);
        processFeed.requestId = action.meta.requestId;
      })
      .addCase(fetchProcessAuditLogs.fulfilled, ({ processFeed }, action) => {
        if (processFeed.requestId !== action.meta.requestId) return;
        processFeed.items = action.payload;
        processFeed.status = "succeeded";
        processFeed.loadedAt = Date.now();
        processFeed.requestId = null;
      })
      .addCase(fetchProcessAuditLogs.rejected, ({ processFeed }, action) => {
        if (processFeed.requestId !== action.meta.requestId) return;
        processFeed.requestId = null;
        if (isAbortedRejection(action)) {
          processFeed.status = processFeed.loadedAt ? "succeeded" : "idle";
          return;
        }
        processFeed.status = "failed";
        processFeed.error = action.payload || action.error;
        processFeed.loadedAt = null;
      })

      // Fetch All Logs Lifecycle
      .addCase(fetchAuditLogs.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch Single Log Lifecycle
      .addCase(fetchAuditLogById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAuditLogById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentLog = action.payload;
      })
      .addCase(fetchAuditLogById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearAuditLogErrors, clearCurrentAuditLog } =
  auditLogsSlice.actions;

export * from "./thunks";
export * from "./selectors";

export default auditLogsSlice.reducer;
