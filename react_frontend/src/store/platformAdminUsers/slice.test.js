import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { describeKeyedListSlice } from "../core/keyedListSuite";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminPassword,
  selectAdminUsersEntry,
  selectAdminUserMutation,
} from "./index";

describeKeyedListSlice({
  title: "platformAdminUsers",
  sliceName: "platformAdminUsers",
  service: "listAdminUsers",
  fetchList: fetchAdminUsers,
  selectEntry: selectAdminUsersEntry,
});

afterEach(() => vi.restoreAllMocks());

const ADMIN = { id: "a1", fullName: "Ada", email: "ada@x.io", isActive: true };
const query = { page: 1 };

const loaded = async () => {
  vi.spyOn(platformApi, "listAdminUsers").mockResolvedValue({ items: [ADMIN], total: 1, summary: { total: 1, active: 1, inactive: 0 } });
  const store = makeStore();
  await store.dispatch(fetchAdminUsers(query));
  return store;
};
const stale = (store) => selectAdminUsersEntry(store.getState(), query).loadedAt === null;
const mutation = (store, key) => selectAdminUserMutation(store.getState(), key);

describe("platformAdminUsers: writes", () => {
  it("starts with idle mutations", () => {
    expect(makeStore().getState().platformAdminUsers.mutations).toEqual({
      create: { status: "idle", error: null },
      update: { status: "idle", error: null },
      resetPassword: { status: "idle", error: null },
    });
  });

  it("createAdminUser returns the temporary password to the caller but never stores it", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "createAdminUser").mockResolvedValue({ id: "a2", temporaryPassword: "Tmp-Secret-1!" });
    const action = await store.dispatch(createAdminUser({ fullName: "Bob", email: "bob@x.io" }));
    expect(spy.mock.calls[0][0]).toEqual({ fullName: "Bob", email: "bob@x.io" });
    expect(action.payload.temporaryPassword).toBe("Tmp-Secret-1!");
    expect(JSON.stringify(store.getState().platformAdminUsers)).not.toContain("Tmp-Secret-1!");
    expect(mutation(store, "create")).toEqual({ status: "succeeded", error: null });
    expect(stale(store)).toBe(true);
  });

  it("updateAdminUser unpacks { id, body } and marks the cache stale", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "updateAdminUser").mockResolvedValue({ ...ADMIN, isActive: false });
    await store.dispatch(updateAdminUser({ id: "a1", body: { isActive: false, reason: "left" } }));
    expect(spy.mock.calls[0][0]).toBe("a1");
    expect(spy.mock.calls[0][1]).toEqual({ isActive: false, reason: "left" });
    expect(stale(store)).toBe(true);
  });

  it("resetAdminPassword takes the id, tracks its own status, and keeps the password out of the store", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "resetAdminPassword").mockResolvedValue({ temporaryPassword: "Reset-Secret-9!" });
    const action = await store.dispatch(resetAdminPassword("a1"));
    expect(spy.mock.calls[0][0]).toBe("a1");
    expect(action.payload.temporaryPassword).toBe("Reset-Secret-9!");
    expect(mutation(store, "resetPassword").status).toBe("succeeded");
    expect(JSON.stringify(store.getState().platformAdminUsers)).not.toContain("Reset-Secret-9!");
  });

  it("a failed write stores the error on its own mutation only", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "createAdminUser").mockRejectedValue(
      new ApiError("Email exists", { status: 400, code: "BAD_REQUEST", details: null }),
    );
    await store.dispatch(createAdminUser({ email: "ada@x.io" }));
    expect(mutation(store, "create").error).toMatchObject({ message: "Email exists", status: 400 });
    expect(mutation(store, "update").status).toBe("idle");
    expect(stale(store)).toBe(false);
  });
});
