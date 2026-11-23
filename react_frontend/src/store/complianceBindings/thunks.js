import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

// 1. Fetch All Bindings (with optional filters: ruleId, scopeType, scopeId)
export const fetchComplianceBindings = createAsyncThunk(
  "complianceBindings/fetchAll",
  async (arg = {}, { getState, rejectWithValue }) => {
    const { force = false, ...params } =
      typeof arg === "object" ? arg : { force: Boolean(arg) };
    const state = getState().complianceBindings;

    // Cache guard: skip network if cache is fresh and no query params changed
    if (!force && isFresh(state.loadedAt) && state.items.length > 0 && Object.keys(params).length === 0) {
      return state.items;
    }

    try {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient(`/api/compliance-bindings${qs ? `?${qs}` : ""}`);
      return Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 2. Create Binding (ruleId, scopeType, scopeId)
export const createComplianceBinding = createAsyncThunk(
  "complianceBindings/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiClient("/api/compliance-bindings", {
        method: "POST",
        body: data,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 3. Delete Binding (Unbind rule from scope)
export const deleteComplianceBinding = createAsyncThunk(
  "complianceBindings/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient(`/api/compliance-bindings/${id}`, {
        method: "DELETE",
      });
      return { id };
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);
