import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as branchesApi from "../../services/api/branches";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import {
  fetchBranches, fetchBranchById,
  selectAllBranches, selectBranchById, selectBranchesStatus, selectBranchesError, selectBranchesLoadedAt,
  selectBranchDetailStatus, selectBranchDetailError,
} from "./index";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-23T10:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("branches slice", () => {
  it("replaces the stub and starts idle", () => {
    const state = makeStore().getState();
    expect(state.branches).toMatchObject({ listIds: [], details: {} });
    expect(selectBranchesStatus(state)).toBe("idle");
    expect(selectBranchesError(state)).toBeNull();
    expect(selectBranchesLoadedAt(state)).toBeNull();
  });

  it("fetchBranches() calls list with empty params and the thunk options", async () => {
    const spy = vi.spyOn(branchesApi, "list").mockResolvedValue([{ id: "x1" }]);
    const store = makeStore();
    await store.dispatch(fetchBranches());
    expect(spy).toHaveBeenCalledWith({}, expect.objectContaining({ abortKey: "branches/fetch:null" }));
    expect(selectAllBranches(store.getState())).toEqual([{ id: "x1" }]);
  });

  it("forwards the branch filter and keys each filter separately", async () => {
    const spy = vi.spyOn(branchesApi, "list").mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(fetchBranches({ branchId: "b1" }));
    await store.dispatch(fetchBranches({ branchId: "b2" }));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toEqual({ branchId: "b1" });
    expect(spy.mock.calls[1][0]).toEqual({ branchId: "b2" });
  });

  it("switching the filter shows no rows from the previous filter", async () => {
    let release;
    vi.spyOn(branchesApi, "list")
      .mockResolvedValueOnce([{ id: "x1" }])
      .mockImplementationOnce(() => new Promise((r) => (release = r)));
    const store = makeStore();
    await store.dispatch(fetchBranches({ branchId: "b1" }));
    const p = store.dispatch(fetchBranches({ branchId: "b2" }));
    expect(selectAllBranches(store.getState())).toEqual([]);
    release([]);
    await p;
  });

  it("stores embedded data exactly as returned", async () => {
    const row = { id: "x1", teamMembers: [{ userId: "u1", role: "Lead", user: { fullName: "A" } }], _count: { teams: 2 } };
    vi.spyOn(branchesApi, "list").mockResolvedValue([row]);
    const store = makeStore();
    await store.dispatch(fetchBranches());
    expect(selectBranchById(store.getState(), "x1")).toEqual(row);
  });

  it("fetchBranchById loads one row", async () => {
    const spy = vi.spyOn(branchesApi, "get").mockResolvedValue({ id: "x9" });
    const store = makeStore();
    await store.dispatch(fetchBranchById("x9"));
    expect(selectBranchById(store.getState(), "x9")).toEqual({ id: "x9" });
    expect(selectBranchDetailStatus(store.getState(), "x9")).toBe("succeeded");
    expect(selectBranchDetailError(store.getState(), "x9")).toBeNull();
    expect(spy).toHaveBeenCalledWith("x9", expect.objectContaining({ signal: expect.anything() }));
  });

  it("resetStore returns branches to its initial state", async () => {
    vi.spyOn(branchesApi, "list").mockResolvedValue([{ id: "x1" }]);
    const store = makeStore();
    await store.dispatch(fetchBranches());
    store.dispatch(resetStore());
    expect(store.getState().branches).toEqual(makeStore().getState().branches);
  });
});
