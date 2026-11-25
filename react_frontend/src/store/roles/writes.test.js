import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as api from "../../services/api/roles";
import * as roleAssignmentsApi from "../../services/api/roleAssignments";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import { createRoleAssignment, fetchRoleAssignments } from "../roleAssignments";
import {
  createRole, updateRole, setRolePermissions, removeRole, fetchRoles, fetchRoleById, selectAllRoles, selectRoleById, selectRolesLoadedAt, selectRoleDetailStatus, selectRoleWriteStatus, selectRoleWriteError, clearRoleWriteStatus, roleWriteKeys,
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
  await store.dispatch(fetchRoles());
  return { store, list };
}

// name, action, wrapper, wrapper arguments before options, key
const WRITES = [
  ["createRole", () => createRole({ name: "N" }), "create", [{ name: "N" }], roleWriteKeys.create()],
  ["updateRole", () => updateRole({ id: "x1", data: { name: "N" } }), "update", ["x1", { name: "N" }], roleWriteKeys.update("x1")],
  ["setRolePermissions", () => setRolePermissions({ id: "x1", permissionSlugs: ["a"] }), "setPermissions", ["x1", ["a"]], roleWriteKeys.permissions("x1")],
  ["removeRole", () => removeRole("x1"), "remove", ["x1"], roleWriteKeys.remove("x1")],
];

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(WRITES)("%s", (_name, action, method, args, key) => {
  it("calls its wrapper, is never abortable by key, tracks status and unwraps the response", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    const spy = vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action()).unwrap();
    expect(selectRoleWriteStatus(store.getState(), key)).toBe("loading");
    d.resolve({ id: "new" });
    await expect(p).resolves.toEqual({ id: "new" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual([...args, { signal: expect.anything() }]);
    expect(selectRoleWriteStatus(store.getState(), key)).toBe("succeeded");
  });

  it("makes this list and the role assignments list stale", async () => {
    const { store, list } = await loadedStore();
    const raList = vi.spyOn(roleAssignmentsApi, "list").mockResolvedValue([]);
    await store.dispatch(fetchRoleAssignments());
    vi.spyOn(api, method).mockResolvedValue({ id: "new" });
    await store.dispatch(action());
    expect(selectRolesLoadedAt(store.getState())).toBeNull();
    await store.dispatch(fetchRoles());
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(2);
    expect(raList).toHaveBeenCalledTimes(2);
  });

  it("a failure stores the error and leaves the list fresh", async () => {
    const { store, list } = await loadedStore();
    vi.spyOn(api, method).mockRejectedValue(denied());
    await expect(store.dispatch(action()).unwrap()).rejects.toEqual(DENIED);
    expect(selectRoleWriteStatus(store.getState(), key)).toBe("failed");
    expect(selectRoleWriteError(store.getState(), key)).toEqual(DENIED);
    await store.dispatch(fetchRoles());
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("a success that lands after logout changes nothing", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action());
    store.dispatch(resetStore());
    await store.dispatch(fetchRoles());
    const before = store.getState();
    d.resolve({ id: "new" });
    await p;
    expect(store.getState()).toEqual(before);
  });
});

describe("roles writes", () => {
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

  it("removeRole drops the row only once the server confirms", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, "remove").mockReturnValue(d.promise);
    const p = store.dispatch(removeRole("x1"));
    expect(selectAllRoles(store.getState())).toHaveLength(2);
    d.resolve({});
    await p;
    expect(selectAllRoles(store.getState())).toEqual([ROWS[1]]);
    expect(selectRoleById(store.getState(), "x1")).toBeUndefined();
  });

  it("a failed removeRole keeps the row", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "remove").mockRejectedValue(denied());
    await store.dispatch(removeRole("x1"));
    expect(selectAllRoles(store.getState())).toEqual(ROWS);
  });

  it("a role assignment write makes this list stale too", async () => {
    vi.spyOn(roleAssignmentsApi, "create").mockResolvedValue({ id: "ra1" });
    const { store, list } = await loadedStore();
    await store.dispatch(createRoleAssignment({ userId: "u1", roleId: "r1" }));
    await store.dispatch(fetchRoles());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("a detail read started before a write does not block the reload and cannot overwrite it", async () => {
    const old = deferred();
    vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce({ id: "x1", v: "new" });
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    const store = makeStore();
    const first = store.dispatch(fetchRoleById("x1"));
    await store.dispatch(createRole({ name: "N" }));
    await store.dispatch(fetchRoleById("x1"));
    old.resolve({ id: "x1", v: "old" });
    await first;
    expect(selectRoleById(store.getState(), "x1")).toEqual({ id: "x1", v: "new" });
  });

  it("a detail read overtaken by a write repeats itself, nested data included", async () => {
    const old = deferred();
    const fresh = { id: "x1", nested: [{ full: true }] };
    const get = vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce(fresh);
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "list").mockResolvedValue([{ id: "x1", nested: [{}] }]);
    const store = makeStore();
    const first = store.dispatch(fetchRoleById("x1"));
    await store.dispatch(createRole({}));
    await store.dispatch(fetchRoles());
    old.resolve({ id: "x1", nested: [{ full: "old" }] });
    await first;
    expect(get).toHaveBeenCalledTimes(2);
    expect(selectRoleById(store.getState(), "x1")).toEqual(fresh);
    expect(selectRoleDetailStatus(store.getState(), "x1")).toBe("succeeded");
  });

  it("a detail read that gives up repeating does not overwrite a stored row", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "get").mockImplementation(async () => {
      await store.dispatch(createRole({}));
      return { id: "x1", v: "old" };
    });
    await store.dispatch(fetchRoleById("x1"));
    expect(selectRoleById(store.getState(), "x1")).toEqual({ id: "x1" });
  });

  it("a deleted row is never fetched again", async () => {
    vi.spyOn(api, "remove").mockResolvedValue({});
    const get = vi.spyOn(api, "get").mockResolvedValue({ id: "x1" });
    const store = makeStore();
    await store.dispatch(removeRole("x1"));
    await store.dispatch(fetchRoleById("x1"));
    expect(get).not.toHaveBeenCalled();
  });

  it("clearRoleWriteStatus forgets an old error", async () => {
    vi.spyOn(api, "create").mockRejectedValue(denied());
    const store = makeStore();
    await store.dispatch(createRole({}));
    store.dispatch(clearRoleWriteStatus(roleWriteKeys.create()));
    expect(selectRoleWriteStatus(store.getState(), roleWriteKeys.create())).toBe("idle");
    expect(selectRoleWriteError(store.getState(), roleWriteKeys.create())).toBeNull();
  });

  it("a removed row does not come back when an older detail read lands", async () => {
    const { store } = await loadedStore();
    const old = deferred();
    vi.spyOn(api, "get").mockReturnValue(old.promise);
    vi.spyOn(api, "remove").mockResolvedValue({});
    const first = store.dispatch(fetchRoleById("x1"));
    await store.dispatch(removeRole("x1"));
    old.resolve({ id: "x1" });
    await first;
    expect(selectRoleById(store.getState(), "x1")).toBeUndefined();
    expect(selectRoleDetailStatus(store.getState(), "x1")).toBe("idle");
  });
});
