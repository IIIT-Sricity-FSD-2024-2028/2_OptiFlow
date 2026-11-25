import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as api from "../../services/api/roleAssignments";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import {
  fetchRoleAssignments, createRoleAssignment, removeRoleAssignment,
  selectAllRoleAssignments, selectRoleAssignmentById, selectRoleAssignmentsStatus,
  selectRoleAssignmentsError, selectRoleAssignmentsLoadedAt,
  selectCreateRoleAssignmentStatus, selectCreateRoleAssignmentError,
  selectRemoveRoleAssignmentStatus, selectRemoveRoleAssignmentError,
} from "./index";

const NOW = new Date("2026-11-25T10:00:00Z");
const ROWS = [{ id: "ra2", userId: "u2" }, { id: "ra1", userId: "u1", role: { label: "HR" }, scopeType: "Company" }];
const BODY = { userId: "u3", roleId: "r1", scopeType: "Company", scopeId: "c1" };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
const denied = () => new ApiError("No", { status: 403, code: "FORBIDDEN" });
const DENIED = { message: "No", status: 403, code: "FORBIDDEN", details: null };

async function loadedStore() {
  const list = vi.spyOn(api, "list").mockResolvedValue(ROWS);
  const store = makeStore();
  await store.dispatch(fetchRoleAssignments());
  return { store, list };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("roleAssignments reads", () => {
  it("replaces the stub and starts idle", () => {
    const state = makeStore().getState();
    expect(selectAllRoleAssignments(state)).toEqual([]);
    expect(selectRoleAssignmentsStatus(state)).toBe("idle");
    expect(selectRoleAssignmentsError(state)).toBeNull();
    expect(selectRoleAssignmentsLoadedAt(state)).toBeNull();
  });

  it("loads rows verbatim, in server order, forwarding the thunk options", async () => {
    const { store, list } = await loadedStore();
    expect(selectAllRoleAssignments(store.getState())).toEqual(ROWS);
    expect(selectRoleAssignmentById(store.getState(), "ra1")).toEqual(ROWS[1]);
    expect(selectRoleAssignmentsLoadedAt(store.getState())).toBe(NOW.getTime());
    expect(list).toHaveBeenCalledWith({}, expect.objectContaining({ abortKey: "roleAssignments/fetch:null", signal: expect.anything() }));
  });

  it("sends the filters without force", async () => {
    const list = vi.spyOn(api, "list").mockResolvedValue([]);
    await makeStore().dispatch(fetchRoleAssignments({ userId: "u1", roleId: "r1", force: true }));
    expect(list.mock.calls[0][0]).toEqual({ userId: "u1", roleId: "r1" });
  });

  it("skips a fresh list and refetches with force", async () => {
    const { store, list } = await loadedStore();
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(1);
    await store.dispatch(fetchRoleAssignments({ force: true }));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("stores a normalised error", async () => {
    vi.spyOn(api, "list").mockRejectedValue(denied());
    const store = makeStore();
    await store.dispatch(fetchRoleAssignments());
    expect(selectRoleAssignmentsStatus(store.getState())).toBe("failed");
    expect(selectRoleAssignmentsError(store.getState())).toEqual(DENIED);
  });

  it("resetStore returns to the initial state", async () => {
    const { store } = await loadedStore();
    store.dispatch(resetStore());
    expect(store.getState().roleAssignments).toEqual(makeStore().getState().roleAssignments);
  });
});

describe("createRoleAssignment", () => {
  it("sends the body, tracks status and returns the row through unwrap", async () => {
    const d = deferred();
    const create = vi.spyOn(api, "create").mockReturnValue(d.promise);
    const store = makeStore();
    const p = store.dispatch(createRoleAssignment(BODY)).unwrap();
    expect(selectCreateRoleAssignmentStatus(store.getState())).toBe("loading");
    d.resolve({ id: "ra3", ...BODY });
    await expect(p).resolves.toEqual({ id: "ra3", ...BODY });
    expect(selectCreateRoleAssignmentStatus(store.getState())).toBe("succeeded");
    expect(create).toHaveBeenCalledWith(BODY, expect.objectContaining({ signal: expect.anything() }));
    expect(create.mock.calls[0][1]).not.toHaveProperty("abortKey");
  });

  it("makes the list stale, so the next plain fetch reloads it", async () => {
    const { store, list } = await loadedStore();
    vi.spyOn(api, "create").mockResolvedValue({ id: "ra3" });
    await store.dispatch(createRoleAssignment(BODY));
    expect(selectAllRoleAssignments(store.getState())).toEqual(ROWS);
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("a list request started before the write is discarded and does not block the refetch", async () => {
    const old = deferred();
    const list = vi.spyOn(api, "list").mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ id: "ra3" }]);
    vi.spyOn(api, "create").mockResolvedValue({ id: "ra3" });
    const store = makeStore();
    const first = store.dispatch(fetchRoleAssignments());
    await store.dispatch(createRoleAssignment(BODY));
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(2);
    old.resolve([{ id: "old" }]);
    await first;
    expect(selectAllRoleAssignments(store.getState())).toEqual([{ id: "ra3" }]);
  });

  it("a list response read before the write is ignored even when nothing has refetched yet", async () => {
    const old = deferred();
    vi.spyOn(api, "list").mockReturnValue(old.promise);
    vi.spyOn(api, "create").mockResolvedValue({ id: "ra3" });
    const store = makeStore();
    const first = store.dispatch(fetchRoleAssignments());
    await store.dispatch(createRoleAssignment(BODY));
    old.resolve([{ id: "old" }]);
    await first;
    expect(selectAllRoleAssignments(store.getState())).toEqual([]);
    expect(selectRoleAssignmentsLoadedAt(store.getState())).toBeNull();
  });

  it("a failure stores the error and leaves the list fresh", async () => {
    const { store, list } = await loadedStore();
    vi.spyOn(api, "create").mockRejectedValue(denied());
    await expect(store.dispatch(createRoleAssignment(BODY)).unwrap()).rejects.toEqual(DENIED);
    expect(selectCreateRoleAssignmentError(store.getState())).toEqual(DENIED);
    expect(selectRoleAssignmentsError(store.getState())).toBeNull();
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("a retry clears the previous error", async () => {
    const d = deferred();
    vi.spyOn(api, "create").mockRejectedValueOnce(denied()).mockReturnValueOnce(d.promise);
    const store = makeStore();
    await store.dispatch(createRoleAssignment(BODY));
    const p = store.dispatch(createRoleAssignment(BODY));
    expect(selectCreateRoleAssignmentError(store.getState())).toBeNull();
    d.resolve({ id: "ra3" });
    await p;
  });

  it("with overlapping creates, the older success still makes the list stale and the newest sets the status", async () => {
    const { store } = await loadedStore();
    const a = deferred();
    const b = deferred();
    vi.spyOn(api, "create").mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const first = store.dispatch(createRoleAssignment(BODY));
    const second = store.dispatch(createRoleAssignment(BODY));
    a.resolve({ id: "ra3" });
    await first;
    expect(selectRoleAssignmentsLoadedAt(store.getState())).toBeNull();
    expect(selectCreateRoleAssignmentStatus(store.getState())).toBe("loading");
    b.reject(denied());
    await second;
    expect(selectCreateRoleAssignmentStatus(store.getState())).toBe("failed");
  });
});

describe("removeRoleAssignment", () => {
  it("removes the row and makes the list stale", async () => {
    const { store, list } = await loadedStore();
    const remove = vi.spyOn(api, "remove").mockResolvedValue({ message: "ok" });
    await store.dispatch(removeRoleAssignment("ra1"));
    expect(remove).toHaveBeenCalledWith("ra1", expect.objectContaining({ signal: expect.anything() }));
    expect(selectAllRoleAssignments(store.getState())).toEqual([ROWS[0]]);
    expect(selectRoleAssignmentById(store.getState(), "ra1")).toBeUndefined();
    expect(selectRemoveRoleAssignmentStatus(store.getState(), "ra1")).toBe("succeeded");
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("keeps the row until the server confirms, and keeps it on failure", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, "remove").mockReturnValue(d.promise);
    const p = store.dispatch(removeRoleAssignment("ra1"));
    expect(selectRemoveRoleAssignmentStatus(store.getState(), "ra1")).toBe("loading");
    expect(selectAllRoleAssignments(store.getState())).toHaveLength(2);
    d.reject(denied());
    await p;
    expect(selectAllRoleAssignments(store.getState())).toEqual(ROWS);
    expect(selectRemoveRoleAssignmentError(store.getState(), "ra1")).toEqual(DENIED);
  });

  it("tracks each id separately", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "remove").mockRejectedValue(denied());
    await store.dispatch(removeRoleAssignment("ra1"));
    expect(selectRemoveRoleAssignmentStatus(store.getState(), "ra2")).toBe("idle");
    expect(selectRemoveRoleAssignmentError(store.getState(), "ra2")).toBeNull();
  });

  it("a second click on the same row does not send a second request", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    const remove = vi.spyOn(api, "remove").mockReturnValue(d.promise);
    const p = store.dispatch(removeRoleAssignment("ra1"));
    await store.dispatch(removeRoleAssignment("ra1"));
    expect(remove).toHaveBeenCalledTimes(1);
    d.resolve({});
    await p;
  });

  it("an invalid id is refused with BAD_ID and no request", async () => {
    await expect(makeStore().dispatch(removeRoleAssignment("..")).unwrap()).rejects.toMatchObject({ code: "BAD_ID" });
  });
});

describe("writes that finish after logout", () => {
  it.each([
    ["create", () => createRoleAssignment(BODY)],
    ["remove", () => removeRoleAssignment("ra1")],
  ])("a late %s success changes nothing", async (method, action) => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action());
    store.dispatch(resetStore());
    await store.dispatch(fetchRoleAssignments());
    const before = store.getState().roleAssignments;
    d.resolve({ id: "ra3" });
    await p;
    expect(store.getState().roleAssignments).toEqual(before);
  });

  it("a late failure changes nothing", async () => {
    const d = deferred();
    vi.spyOn(api, "create").mockReturnValue(d.promise);
    const store = makeStore();
    const p = store.dispatch(createRoleAssignment(BODY));
    store.dispatch(resetStore());
    d.reject(denied());
    await p;
    expect(store.getState().roleAssignments).toEqual(makeStore().getState().roleAssignments);
  });
});
