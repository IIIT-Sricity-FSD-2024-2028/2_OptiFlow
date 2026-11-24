import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as usersApi from "../../services/api/users";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import {
  fetchUsers, fetchUserById,
  selectAllUsers, selectUserById, selectUsersStatus, selectUsersError, selectUsersLoadedAt,
  selectUserDetailStatus, selectUserDetailError,
} from "./index";

const NOW = new Date("2026-11-23T10:00:00Z");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("users slice", () => {
  it("replaces the stub and starts idle", () => {
    const state = makeStore().getState();
    expect(state.users).toMatchObject({ listIds: [], details: {} });
    expect(selectUsersStatus(state)).toBe("idle");
    expect(selectAllUsers(state)).toEqual([]);
    expect(selectUsersLoadedAt(state)).toBeNull();
  });

  it("fetchUsers loads the list through usersApi.list with the thunk options", async () => {
    const spy = vi.spyOn(usersApi, "list").mockResolvedValue([{ id: "u1", fullName: "Asha" }]);
    const store = makeStore();
    await store.dispatch(fetchUsers());
    expect(selectAllUsers(store.getState())).toEqual([{ id: "u1", fullName: "Asha" }]);
    expect(selectUsersStatus(store.getState())).toBe("succeeded");
    expect(selectUsersLoadedAt(store.getState())).toBe(NOW.getTime());
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.anything(), abortKey: "users/fetch:null" }));
  });

  it("the list wrapper never receives the query", async () => {
    const spy = vi.spyOn(usersApi, "list").mockResolvedValue([]);
    await makeStore().dispatch(fetchUsers({ force: true }));
    expect(spy.mock.calls[0]).toHaveLength(1);
  });

  it("an empty list is a success and a second fetch within 60 s is skipped", async () => {
    const spy = vi.spyOn(usersApi, "list").mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(fetchUsers());
    await store.dispatch(fetchUsers());
    expect(selectUsersStatus(store.getState())).toBe("succeeded");
    expect(selectAllUsers(store.getState())).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("a failure stores the normalised error", async () => {
    vi.spyOn(usersApi, "list").mockRejectedValue(new ApiError("No", { status: 500, code: "SERVER_ERROR" }));
    const store = makeStore();
    await store.dispatch(fetchUsers());
    expect(selectUsersStatus(store.getState())).toBe("failed");
    expect(selectUsersError(store.getState())).toEqual({ message: "No", status: 500, code: "SERVER_ERROR", details: null });
  });

  it("keeps rows verbatim, including inactive users and role assignments", async () => {
    const row = { id: "u2", isActive: false, roleAssignments: [{ id: "ra1", role: { name: "hr_manager" } }] };
    vi.spyOn(usersApi, "list").mockResolvedValue([row]);
    const store = makeStore();
    await store.dispatch(fetchUsers());
    expect(selectUserById(store.getState(), "u2")).toEqual(row);
  });

  it("fetchUserById loads one user through usersApi.get", async () => {
    const spy = vi.spyOn(usersApi, "get").mockResolvedValue({ id: "u9", reports: [] });
    const store = makeStore();
    await store.dispatch(fetchUserById("u9"));
    expect(selectUserById(store.getState(), "u9")).toEqual({ id: "u9", reports: [] });
    expect(selectUserDetailStatus(store.getState(), "u9")).toBe("succeeded");
    expect(selectUserDetailError(store.getState(), "u9")).toBeNull();
    expect(spy).toHaveBeenCalledWith("u9", expect.objectContaining({ signal: expect.anything() }));
  });

  it("resetStore returns users to its initial state", async () => {
    vi.spyOn(usersApi, "list").mockResolvedValue([{ id: "u1" }]);
    const store = makeStore();
    await store.dispatch(fetchUsers());
    store.dispatch(resetStore());
    expect(store.getState().users).toEqual(makeStore().getState().users);
  });
});
