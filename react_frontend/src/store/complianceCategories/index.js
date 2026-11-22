import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { baseState } from "../core/createStubSlice";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

const initialState = {
  ...baseState(),
  items: [],
};

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
      return { id }; // We return the ID so the reducer knows who to remove
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

export const complianceCategoriesSlice = createSlice({
  name: "complianceCategories",
  initialState,
  reducers: {
    clearComplianceErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      //FetchLifeCyle
      .addCase(fetchComplianceCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchComplianceCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchComplianceCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      // Create Lifecycle (optimistic insertion)
      .addCase(createComplianceCategory.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      // Update Lifecycle
      .addCase(updateComplianceCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      // Delete Lifecycle
      .addCase(deleteComplianceCategory.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.id !== action.payload.id,
        );
      });
  },
});

// Selectors
export const selectAllComplianceCategories = (state) =>
  state.complianceCategories.items;

export const selectComplianceCategoriesStatus = (state) =>
  state.complianceCategories.status;

export const selectComplianceCategoriesError = (state) =>
  state.complianceCategories.error;

export const selectIsComplianceCategoriesLoading = (state) =>
  state.complianceCategories.status === "loading";

export default complianceCategoriesSlice.reducer;
