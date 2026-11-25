import { createAsyncThunk } from "@reduxjs/toolkit";
import * as executiveApi from "../../services/api/executive";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";
import { createApiThunk } from "../core/createApiThunk";

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

const unwrap = (res) => (res && !Array.isArray(res) && "data" in res ? res.data : res);

// 3. Portfolio health: every project with its rating and reasons (+ a summary).
export const fetchExecutivePortfolio = createApiThunk(
  "executive/fetchPortfolio",
  async (params, options) => unwrap(await executiveApi.getPortfolio(params || {}, options)),
  { abortable: true },
);

// 4. Branch comparison rows.
export const fetchBranchPerformance = createApiThunk(
  "executive/fetchBranchPerformance",
  async (params, options) => unwrap(await executiveApi.getBranchPerformance(params || {}, options)) || [],
  { abortable: true },
);

// 5. Project Managers available for appointment.
export const fetchProjectManagers = createApiThunk(
  "executive/fetchProjectManagers",
  async (_arg, options) => unwrap(await executiveApi.getProjectManagers(options)) || [],
  { abortable: true },
);

// 6. Appoint / replace a project's PM. A write: never aborted by another call.
export const assignProjectManager = createApiThunk(
  "executive/assignProjectManager",
  async ({ projectId, projectManagerId }, options) =>
    unwrap(await executiveApi.assignProjectManager(projectId, projectManagerId, options)),
);
