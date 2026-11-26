import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";
import * as evidenceApi from "../../services/api/evidence";
import { downloadBlob } from "../../shared/utils/downloadBlob";

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

// 3. Create Evidence Record
export const createEvidence = createAsyncThunk(
  "evidence/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiClient("/api/evidence", {
        method: "POST",
        body: data,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);

// 4. Update Evidence Record
export const updateEvidence = createAsyncThunk(
  "evidence/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await apiClient(`/api/evidence/${id}`, {
        method: "PATCH",
        body: data,
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);

// 5. Review / Adjudicate Evidence (Approve / Reject)
export const reviewEvidence = createAsyncThunk(
  "evidence/review",
  async ({ id, status, rejectionReason }, { rejectWithValue }) => {
    try {
      const payload = { status };
      if (rejectionReason !== undefined) {
        payload.rejectionReason = rejectionReason;
        payload.notes = rejectionReason;
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

// 6. Upload Evidence File (Multipart FormData)
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

// 7. Delete Evidence Record
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

// 8. Export the evidence audit log as CSV. The file is saved straight away and never stored:
// the action payload is only the filename, so the store stays serializable.
export const exportEvidenceCsv = createAsyncThunk(
  "evidence/exportCsv",
  async (_arg, { signal, rejectWithValue }) => {
    try {
      const blob = await evidenceApi.exportCsv({ signal });
      const filename = `compliance-evidence-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadBlob(blob, filename);
      return { filename };
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  }
);
