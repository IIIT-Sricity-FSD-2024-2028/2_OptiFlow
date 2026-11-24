import { createSlice } from "@reduxjs/toolkit";
import { baseState } from "../core/createStubSlice";
import { fetchAuditLogs, fetchAuditLogById } from "./thunks";

const initialState = {
  ...baseState(),
  items: [],
  currentLog: null,
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
