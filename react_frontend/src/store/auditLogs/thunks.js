import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

import { getProcessAuditLogs } from "../../services/api/audit";
import { createApiThunk } from "../core/createApiThunk";
import { shouldFetch } from "../core/shouldFetch";

export const fetchProcessAuditLogs = createApiThunk(
  "auditLogs/fetchProcess",
  async (_arg, options) => {
    const response = await getProcessAuditLogs({}, options);
    return Array.isArray(response) ? response : response?.data || [];
  },
  {
    abortable: true,
    condition: (arg, { getState }) => shouldFetch(getState().auditLogs.processFeed, arg),
  },
);

// 1. Fetch Audit Logs (with pagination & filter params)
export const fetchAuditLogs = createAsyncThunk(
  "auditLogs/fetchAll",
  async (arg = {}, { getState, rejectWithValue }) => {
    const { force = false, ...params } =
      typeof arg === "object" ? arg : { force: Boolean(arg) };
    const state = getState().auditLogs;

    // Cache guard: skip network if fresh and no query params provided
    if (!force && isFresh(state.loadedAt) && state.items.length > 0 && Object.keys(params).length === 0) {
      return state.items;
    }

    try {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient(`/api/audit-logs${qs ? `?${qs}` : ""}`);
      return Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 2. Fetch Single Audit Log by ID
export const fetchAuditLogById = createAsyncThunk(
  "auditLogs/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiClient(`/api/audit-logs/${id}`);
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);
