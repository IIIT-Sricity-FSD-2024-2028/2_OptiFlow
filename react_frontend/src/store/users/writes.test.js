import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as api from "../../services/api/users";
import * as roleAssignmentsApi from "../../services/api/roleAssignments";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import { createRoleAssignment, fetchRoleAssignments } from "../roleAssignments";
import {
  createUser, updateUser, deactivateUser, reactivateUser, fetchUsers, fetchUserById, selectAllUsers, selectUserById, selectUsersLoadedAt, selectUserDetailStatus, selectUserWriteStatus, selectUserWriteError, clearUserWriteStatus, userWriteKeys,
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
  await store.dispatch(fetchUsers());
  return { store, list };
}

// name, action, wrapper, wrapper arguments before options, key
const WRITES = [
  ["createUser", () => createUser({ name: "N" }), "create", [{ name: "N" }], userWriteKeys.create()],
  ["updateUser", () => updateUser({ id: "x1", data: { name: "N" } }), "update", ["x1", { name: "N" }], userWriteKeys.user("x1")],
  ["deactivateUser", () => deactivateUser("x1"), "remove", ["x1"], userWriteKeys.user("x1")],
  ["reactivateUser", () => reactivateUser("x1"), "reactivate", ["x1"], userWriteKeys.user("x1")],
];

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(WRITES)("%s", (_name, action, method, args, key) => {
  it("calls its wrapper, is never abortable by key, tracks status and unwraps the response", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    const spy = vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action()).unwrap();
    expect(selectUserWriteStatus(store.getState(), key)).toBe("loading");
    d.resolve({ id: "new" });
    await expect(p).resolves.toEqual({ id: "new" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual([...args, { signal: expect.anything() }]);
    expect(selectUserWriteStatus(store.getState(), key)).toBe("succeeded");
  });

  it("makes this list and the role assignments list stale", async () => {
    const { store, list } = await loadedStore();
    const raList = vi.spyOn(roleAssignmentsApi, "list").mockResolvedValue([]);
    await store.dispatch(fetchRoleAssignments());
    vi.spyOn(api, method).mockResolvedValue({ id: "new" });
    await store.dispatch(action());
    expect(selectUsersLoadedAt(store.getState())).toBeNull();
    await store.dispatch(fetchUsers());
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(2);
    expect(raList).toHaveBeenCalledTimes(2);
  });

  it("a failure stores the error and leaves the list fresh", async () => {
    const { store, list } = await loadedStore();
    vi.spyOn(api, method).mockRejectedValue(denied());
    await expect(store.dispatch(action()).unwrap()).rejects.toEqual(DENIED);
    expect(selectUserWriteStatus(store.getState(), key)).toBe("failed");
    expect(selectUserWriteError(store.getState(), key)).toEqual(DENIED);
    await store.dispatch(fetchUsers());
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("a success that lands after logout changes nothing", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action());
    store.dispatch(resetStore());
    await store.dispatch(fetchUsers());
    const before = store.getState();
    d.resolve({ id: "new" });
    await p;
    expect(store.getState()).toEqual(before);
  });
});

describe("users writes", () => {
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

  it("a deactivated user stays in the list until it is reloaded", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "remove").mockResolvedValue({});
    await store.dispatch(deactivateUser("x1"));
    expect(selectAllUsers(store.getState())).toEqual(ROWS);
  });

  it("a role assignment write makes this list stale too", async () => {
    vi.spyOn(roleAssignmentsApi, "create").mockResolvedValue({ id: "ra1" });
    const { store, list } = await loadedStore();
    await store.dispatch(createRoleAssignment({ userId: "u1", roleId: "r1" }));
    await store.dispatch(fetchUsers());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("a detail read started before a write does not block the reload and cannot overwrite it", async () => {
    const old = deferred();
    vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce({ id: "x1", v: "new" });
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    const store = makeStore();
    const first = store.dispatch(fetchUserById("x1"));
    await store.dispatch(createUser({ name: "N" }));
    await store.dispatch(fetchUserById("x1"));
    old.resolve({ id: "x1", v: "old" });
    await first;
    expect(selectUserById(store.getState(), "x1")).toEqual({ id: "x1", v: "new" });
  });

  it("a detail read overtaken by a write repeats itself, nested data included", async () => {
    const old = deferred();
    const fresh = { id: "x1", nested: [{ full: true }] };
    const get = vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce(fresh);
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "list").mockResolvedValue([{ id: "x1", nested: [{}] }]);
    const store = makeStore();
    const first = store.dispatch(fetchUserById("x1"));
    await store.dispatch(createUser({}));
    await store.dispatch(fetchUsers());
    old.resolve({ id: "x1", nested: [{ full: "old" }] });
    await first;
    expect(get).toHaveBeenCalledTimes(2);
    expect(selectUserById(store.getState(), "x1")).toEqual(fresh);
    expect(selectUserDetailStatus(store.getState(), "x1")).toBe("succeeded");
  });

  it("a detail read that gives up repeating does not overwrite a stored row", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "get").mockImplementation(async () => {
      await store.dispatch(createUser({}));
      return { id: "x1", v: "old" };
    });
    await store.dispatch(fetchUserById("x1"));
    expect(selectUserById(store.getState(), "x1")).toEqual({ id: "x1" });
  });

  it("clearUserWriteStatus forgets an old error", async () => {
    vi.spyOn(api, "create").mockRejectedValue(denied());
    const store = makeStore();
    await store.dispatch(createUser({}));
    store.dispatch(clearUserWriteStatus(userWriteKeys.create()));
    expect(selectUserWriteStatus(store.getState(), userWriteKeys.create())).toBe("idle");
    expect(selectUserWriteError(store.getState(), userWriteKeys.create())).toBeNull();
  });

  it("an update is not sent while a deactivate of the same user is running, other users are", async () => {
    const d = deferred();
    vi.spyOn(api, "remove").mockReturnValue(d.promise);
    const update = vi.spyOn(api, "update").mockResolvedValue({});
    const store = makeStore();
    const p = store.dispatch(deactivateUser("x1"));
    await store.dispatch(updateUser({ id: "x1", data: { isActive: true } }));
    expect(update).not.toHaveBeenCalled();
    await store.dispatch(updateUser({ id: "x2", data: { jobTitle: "New" } }));
    expect(update).toHaveBeenCalledTimes(1);
    d.resolve({});
    await p;
  });

  it("reactivate is not sent while a deactivate of the same user is running", async () => {
    const d = deferred();
    vi.spyOn(api, "remove").mockReturnValue(d.promise);
    const reactivate = vi.spyOn(api, "reactivate").mockResolvedValue({});
    const store = makeStore();
    const p = store.dispatch(deactivateUser("x1"));
    await store.dispatch(reactivateUser("x1"));
    expect(reactivate).not.toHaveBeenCalled();
    d.resolve({});
    await p;
  });
});
