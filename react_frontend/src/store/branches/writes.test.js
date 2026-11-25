import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as api from "../../services/api/branches";
import * as roleAssignmentsApi from "../../services/api/roleAssignments";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import { createRoleAssignment, fetchRoleAssignments } from "../roleAssignments";
import {
  createBranch, updateBranch, removeBranch, fetchBranches, fetchBranchById, selectAllBranches, selectBranchById, selectBranchesLoadedAt, selectBranchDetailStatus, selectBranchWriteStatus, selectBranchWriteError, clearBranchWriteStatus, branchWriteKeys,
} from "./index";

const ROWS = [{ id: "x1" }, { id: "x2" }];
const DENIED = { message: "No", status: 429, code: "RATE_LIMITED", details: null };
const denied = () => new ApiError("No", { status: 429, code: "RATE_LIMITED" });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
async function loadedStore() {
  const list = vi.spyOn(api, "list").mockResolvedValue(ROWS);
  const store = makeStore();
  await store.dispatch(fetchBranches());
  return { store, list };
}

// name, action, wrapper, wrapper arguments before options, key
const WRITES = [
  ["createBranch", () => createBranch({ name: "N" }), "create", [{ name: "N" }], branchWriteKeys.create()],
  ["updateBranch", () => updateBranch({ id: "x1", data: { name: "N" } }), "update", ["x1", { name: "N" }], branchWriteKeys.update("x1")],
  ["removeBranch", () => removeBranch({ id: "x1", reassignBranchId: "x2" }), "remove", ["x1", { reassignBranchId: "x2" }], branchWriteKeys.remove("x1")],
];

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(WRITES)("%s", (_name, action, method, args, key) => {
  it("calls its wrapper, is never abortable by key, tracks status and unwraps the response", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    const spy = vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action()).unwrap();
    expect(selectBranchWriteStatus(store.getState(), key)).toBe("loading");
    d.resolve({ id: "new" });
    await expect(p).resolves.toEqual({ id: "new" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual([...args, { signal: expect.anything() }]);
    expect(selectBranchWriteStatus(store.getState(), key)).toBe("succeeded");
  });

  it("makes this list and the role assignments list stale", async () => {
    const { store, list } = await loadedStore();
    const raList = vi.spyOn(roleAssignmentsApi, "list").mockResolvedValue([]);
    await store.dispatch(fetchRoleAssignments());
    vi.spyOn(api, method).mockResolvedValue({ id: "new" });
    await store.dispatch(action());
    expect(selectBranchesLoadedAt(store.getState())).toBeNull();
    await store.dispatch(fetchBranches());
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(2);
    expect(raList).toHaveBeenCalledTimes(2);
  });

  it("a failure stores the error and leaves the list fresh", async () => {
    const { store, list } = await loadedStore();
    vi.spyOn(api, method).mockRejectedValue(denied());
    await expect(store.dispatch(action()).unwrap()).rejects.toEqual(DENIED);
    expect(selectBranchWriteStatus(store.getState(), key)).toBe("failed");
    expect(selectBranchWriteError(store.getState(), key)).toEqual(DENIED);
    await store.dispatch(fetchBranches());
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("a success that lands after logout changes nothing", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action());
    store.dispatch(resetStore());
    await store.dispatch(fetchBranches());
    const before = store.getState();
    d.resolve({ id: "new" });
    await p;
    expect(store.getState()).toEqual(before);
  });
});

describe("branches writes", () => {
  it.each(WRITES)("a second %s while one is running sends no request", async (_name, action, method) => {
    const d = deferred();
    const spy = vi.spyOn(api, method).mockReturnValue(d.promise);
    const store = makeStore();
    const p = store.dispatch(action());
    await store.dispatch(action());
    expect(spy).toHaveBeenCalledTimes(1);
    d.resolve({});
    await p;
  });

  it("removeBranch drops the row only once the server confirms", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, "remove").mockReturnValue(d.promise);
    const p = store.dispatch(removeBranch({ id: "x1" }));
    expect(selectAllBranches(store.getState())).toHaveLength(2);
    d.resolve({});
    await p;
    expect(selectAllBranches(store.getState())).toEqual([ROWS[1]]);
    expect(selectBranchById(store.getState(), "x1")).toBeUndefined();
  });

  it("a failed removeBranch keeps the row", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "remove").mockRejectedValue(denied());
    await store.dispatch(removeBranch({ id: "x1" }));
    expect(selectAllBranches(store.getState())).toEqual(ROWS);
  });

  it("a role assignment write makes this list stale too", async () => {
    vi.spyOn(roleAssignmentsApi, "create").mockResolvedValue({ id: "ra1" });
    const { store, list } = await loadedStore();
    await store.dispatch(createRoleAssignment({ userId: "u1", roleId: "r1" }));
    await store.dispatch(fetchBranches());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("a detail read started before a write does not block the reload and cannot overwrite it", async () => {
    const old = deferred();
    vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce({ id: "x1", v: "new" });
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    const store = makeStore();
    const first = store.dispatch(fetchBranchById("x1"));
    await store.dispatch(createBranch({ name: "N" }));
    await store.dispatch(fetchBranchById("x1"));
    old.resolve({ id: "x1", v: "old" });
    await first;
    expect(selectBranchById(store.getState(), "x1")).toEqual({ id: "x1", v: "new" });
  });

  it("a detail read overtaken by a write repeats itself, nested data included", async () => {
    const old = deferred();
    const fresh = { id: "x1", nested: [{ full: true }] };
    const get = vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce(fresh);
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "list").mockResolvedValue([{ id: "x1", nested: [{}] }]);
    const store = makeStore();
    const first = store.dispatch(fetchBranchById("x1"));
    await store.dispatch(createBranch({}));
    await store.dispatch(fetchBranches());
    old.resolve({ id: "x1", nested: [{ full: "old" }] });
    await first;
    expect(get).toHaveBeenCalledTimes(2);
    expect(selectBranchById(store.getState(), "x1")).toEqual(fresh);
    expect(selectBranchDetailStatus(store.getState(), "x1")).toBe("succeeded");
  });

  it("a detail read that gives up repeating does not overwrite a stored row", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "get").mockImplementation(async () => {
      await store.dispatch(createBranch({}));
      return { id: "x1", v: "old" };
    });
    await store.dispatch(fetchBranchById("x1"));
    expect(selectBranchById(store.getState(), "x1")).toEqual({ id: "x1" });
  });

  it("a deleted row is never fetched again", async () => {
    vi.spyOn(api, "remove").mockResolvedValue({});
    const get = vi.spyOn(api, "get").mockResolvedValue({ id: "x1" });
    const store = makeStore();
    await store.dispatch(removeBranch({ id: "x1" }));
    await store.dispatch(fetchBranchById("x1"));
    expect(get).not.toHaveBeenCalled();
  });

  it("clearBranchWriteStatus forgets an old error", async () => {
    vi.spyOn(api, "create").mockRejectedValue(denied());
    const store = makeStore();
    await store.dispatch(createBranch({}));
    store.dispatch(clearBranchWriteStatus(branchWriteKeys.create()));
    expect(selectBranchWriteStatus(store.getState(), branchWriteKeys.create())).toBe("idle");
    expect(selectBranchWriteError(store.getState(), branchWriteKeys.create())).toBeNull();
  });

  it("a removed row does not come back when an older detail read lands", async () => {
    const { store } = await loadedStore();
    const old = deferred();
    vi.spyOn(api, "get").mockReturnValue(old.promise);
    vi.spyOn(api, "remove").mockResolvedValue({});
    const first = store.dispatch(fetchBranchById("x1"));
    await store.dispatch(removeBranch({ id: "x1" }));
    old.resolve({ id: "x1" });
    await first;
    expect(selectBranchById(store.getState(), "x1")).toBeUndefined();
    expect(selectBranchDetailStatus(store.getState(), "x1")).toBe("idle");
  });
});
