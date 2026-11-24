import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

// 1. Fetch All Evidence (with caching & query parameters)
export const fetchEvidence = createAsyncThunk(
  "evidence/fetchAll",
  async (arg = {}, { getState, rejectWithValue }) => {
    const { force = false, ...params } =
      typeof arg === "object" ? arg : { force: Boolean(arg) };
    const state = getState().evidence;

    // Cache guard: skip network if fresh (< 60s) and no search filters applied
    if (
      !force &&
      isFresh(state.loadedAt) &&
      state.items.length > 0 &&
      Object.keys(params).length === 0
    ) {
      return state.items;
    }

    try {
      const qs = new URLSearchParams(params).toString();
      const res = await apiClient(`/api/evidence${qs ? `?${qs}` : ""}`);
      return Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);

// 2. Fetch Single Evidence Record by ID
export const fetchEvidenceById = createAsyncThunk(
  "evidence/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiClient(`/api/evidence/${id}`);
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);

// 3. Review / Adjudicate Evidence (Approve / Reject)
export const reviewEvidence = createAsyncThunk(
  "evidence/review",
  async ({ id, status, rejectionReason }, { rejectWithValue }) => {
    try {
      const payload = { status };
      if (rejectionReason !== undefined) {
        payload.rejectionReason = rejectionReason;
      }
      const res = await apiClient(`/api/evidence/${id}`, {
        method: "PATCH",
        body: payload,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);

// 4. Upload Evidence File (Multipart FormData)
export const uploadEvidenceFile = createAsyncThunk(
  "evidence/uploadFile",
  async ({ id, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient(`/api/evidence/${id}/upload`, {
        method: "POST",
        body: formData,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);

// 5. Delete Evidence Record
export const deleteEvidence = createAsyncThunk(
  "evidence/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiClient(`/api/evidence/${id}`, {
        method: "DELETE",
      });
      return id;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);
