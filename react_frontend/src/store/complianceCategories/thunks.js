import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

// 1. Fetch Categories (with 60-second cache check)
export const fetchComplianceCategories = createAsyncThunk(
  "complianceCategories/fetchAll",
  async (force = false, { getState, rejectWithValue }) => {
    const state = getState().complianceCategories;
    if (!force && isFresh(state.loadedAt)) {
      return state.items;
    }
    try {
      const res = await apiClient("/api/compliance-categories");
      return Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 2. Create Category
export const createComplianceCategory = createAsyncThunk(
  "complianceCategories/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiClient("/api/compliance-categories", {
        method: "POST",
        body: data,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 3. Update Category
export const updateComplianceCategory = createAsyncThunk(
  "complianceCategories/update",
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const res = await apiClient(`/api/compliance-categories/${id}`, {
        method: "PATCH",
        body: data,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 4. Delete Category
export const deleteComplianceCategory = createAsyncThunk(
  "complianceCategories/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient(`/api/compliance-categories/${id}`, {
        method: "DELETE",
      });
      return { id };
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);
