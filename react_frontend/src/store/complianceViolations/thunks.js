import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiClient } from "../../services/api/client";
import { isFresh } from "../core/freshness";
import { normalizeError } from "../core/normalizeError";

export const fetchComplianceViolations = createAsyncThunk(
  "complianceViolations/fetchAll",
  async (arg = {}, { getState, rejectWithValue }) => {
    const { force = false, ...params } =
      typeof arg === "object" ? arg : { force: Boolean(arg) };
    const state = getState().complianceViolations;
    // Cache guard: skip network if data is fresh (< 60s) and no search filters applied
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
      const res = await apiClient(
        `/api/compliance-violations${qs ? `?${qs}` : ""}`,
      );
      return Array.isArray(res) ? res : res?.data || [];
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);

// 2. Fetch Single Violation by ID
export const fetchComplianceViolationById = createAsyncThunk(
  "complianceViolations/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await apiClient(`/api/compliance-violations/${id}`);
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);
// 3. Resolve Violation / Grant Waiver
export const resolveComplianceViolation = createAsyncThunk(
  "complianceViolations/resolve",
  async (
    {
      id,
      waiverType = "PROVISIONAL_EXEMPTION",
      resolutionRemarks,
      notifyTeamLead = false,
      notifyUserIds,
      notifyMessage,
    },
    { rejectWithValue },
  ) => {
    try {
      const payload = {
        status: "Resolved",
        waiverType,
        resolutionRemarks,
      };
      if (notifyTeamLead) {
        payload.notifyTeamLead = true;
      }
      if (Array.isArray(notifyUserIds) && notifyUserIds.length > 0) {
        payload.notifyUserIds = notifyUserIds;
      }
      if (notifyMessage) {
        payload.notifyMessage = notifyMessage;
      }
      const res = await apiClient(`/api/compliance-violations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      return res?.data || res;
    } catch (err) {
      return rejectWithValue(normalizeError(err));
    }
  },
);
