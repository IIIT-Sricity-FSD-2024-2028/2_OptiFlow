import { createAsyncThunk } from "@reduxjs/toolkit";
import * as executiveApi from "../../services/api/executive";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

// 1. Fetch Executive Telemetry / Metrics (scoped by branch or tenant)
export const fetchExecutiveMetrics = createAsyncThunk(
  "executive/fetchMetrics",
  async (arg = {}, { getState, rejectWithValue }) => {
    const { force = false, ...params } =
      typeof arg === "object" ? arg : { force: Boolean(arg) };
    const state = getState().executive;

    // Cache guard: skip network if fresh and query hasn't changed
    if (!force && isFresh(state.loadedAt) && state.metrics && Object.keys(params).length === 0) {
      return state.metrics;
    }

    try {
      const res = await executiveApi.getMetrics(params);
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 2. Fetch Executive Branches for Filtering
export const fetchExecutiveBranches = createAsyncThunk(
  "executive/fetchBranches",
  async (_, { rejectWithValue }) => {
    try {
      const res = await executiveApi.getBranches();
      return Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);
