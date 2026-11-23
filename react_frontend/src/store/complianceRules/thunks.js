import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

// 1. Fetch All Rules (with 60-second cache check)
export const fetchComplianceRules = createAsyncThunk(
  "complianceRules/fetchAll",
  async (arg = {}, { getState, rejectWithValue }) => {
    const { force = false, ...params } =
      typeof arg === "object" ? arg : { force: Boolean(arg) };
    const state = getState().complianceRules;

    // If cache is still fresh and user didn't hit manual Refresh, return cached items
    if (!force && isFresh(state.loadedAt) && state.items.length > 0) {
      return state.items;
    }
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient(`/api/compliance-rules${qs ? `?${qs}` : ""}`);
      return Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 2. Fetch Single Rule By ID (for RuleDetail page)
export const fetchComplianceRuleById = createAsyncThunk(
  "complianceRules/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiClient(`/api/compliance-rules/${id}`);
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 3. Create Rule
export const createComplianceRule = createAsyncThunk(
  "complianceRules/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiClient("/api/compliance-rules", {
        method: "POST",
        body: data,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 4. Update Rule (used for edits & active/inactive status toggle)
export const updateComplianceRule = createAsyncThunk(
  "complianceRules/update",
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const res = await apiClient(`/api/compliance-rules/${id}`, {
        method: "PATCH",
        body: data,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 5. Delete Rule
export const deleteComplianceRule = createAsyncThunk(
  "complianceRules/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient(`/api/compliance-rules/${id}`, {
        method: "DELETE",
      });
      return { id }; // Return id so reducer can remove from items
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 6. Run Compliance Engine
export const runComplianceEngine = createAsyncThunk(
  "complianceRules/runEngine",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient("/api/compliance-rules/run-engine", {
        method: "POST",
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);
