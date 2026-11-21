import { describe, it, expect, vi, afterEach } from "vitest";
import { API_EVENT, ApiError } from "../../services/api/client";
import { makeStore } from "../index";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeError } from "./normalizeError";
import { FORBIDDEN_EVENT_TYPE } from "./listener";

const events = [];
const onEvent = (e) => events.push(e.detail);
window.addEventListener(API_EVENT, onEvent);
afterEach(() => { events.length = 0; vi.restoreAllMocks(); });

// Same shape the real helper produces: a rejected action whose payload is the normalised error.
const failing = (status, code, message = "Nope") =>
  createAsyncThunk("t/fail", async (_arg, { rejectWithValue }) =>
    rejectWithValue(normalizeError(new ApiError(message, { status, code }))),
  );

describe("403 listener", () => {
  it("announces a plain 403 on the API event with its message", async () => {
    await makeStore().dispatch(failing(403, "FORBIDDEN", "Not allowed")());
    expect(events).toEqual([{ type: FORBIDDEN_EVENT_TYPE, message: "Not allowed" }]);
  });

  it("stays quiet for COMPLIANCE_BLOCK (pages show it themselves)", async () => {
    await makeStore().dispatch(failing(403, "COMPLIANCE_BLOCK")());
    expect(events).toEqual([]);
  });

  it.each([401, 402, 404, 500])("ignores status %i (401 and 402 stay in the client)", async (s) => {
    await makeStore().dispatch(failing(s, null)());
    expect(events).toEqual([]);
  });

  it("ignores a fulfilled action", async () => {
    await makeStore().dispatch(createAsyncThunk("t/ok", async () => 1)());
    expect(events).toEqual([]);
  });

  it("still lets the thunk's rejected action reach the reducers (payload intact)", async () => {
    const action = await makeStore().dispatch(failing(403, "FORBIDDEN", "Not allowed")());
    expect(action.payload).toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});
