import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { describeKeyedListSlice } from "../core/keyedListSuite";
import {
  fetchSupportGrants,
  createSupportGrant,
  revokeSupportGrant,
  selectSupportGrantsEntry,
  selectSupportGrantMutation,
} from "./index";

describeKeyedListSlice({
  title: "platformSupportAccess",
  sliceName: "platformSupportAccess",
  service: "listSupportAccess",
  fetchList: fetchSupportGrants,
  selectEntry: selectSupportGrantsEntry,
});

afterEach(() => vi.restoreAllMocks());

const GRANT = { id: "g1", companyId: "c1", reason: "debugging" };
const query = { page: 1, status: "active" };

const loaded = async () => {
  vi.spyOn(platformApi, "listSupportAccess").mockResolvedValue({ items: [GRANT], total: 1, summary: { active: 1 } });
  const store = makeStore();
  await store.dispatch(fetchSupportGrants(query));
  return store;
};
const stale = (store) => selectSupportGrantsEntry(store.getState(), query).loadedAt === null;
const mutation = (store, key) => selectSupportGrantMutation(store.getState(), key);

describe("platformSupportAccess: writes", () => {
  it("starts with idle mutations", () => {
    expect(makeStore().getState().platformSupportAccess.mutations).toEqual({
      create: { status: "idle", error: null },
      revoke: { status: "idle", error: null },
    });
  });

  it("createSupportGrant sends the body and marks the cache stale", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "createSupportGrant").mockResolvedValue({ id: "g2" });
    await store.dispatch(createSupportGrant({ companyId: "c1", reason: "debugging a bug", durationHours: 4 }));
    expect(spy.mock.calls[0][0]).toEqual({ companyId: "c1", reason: "debugging a bug", durationHours: 4 });
    expect(mutation(store, "create")).toEqual({ status: "succeeded", error: null });
    expect(stale(store)).toBe(true);
  });

  it("revokeSupportGrant takes the id", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "revokeSupportGrant").mockResolvedValue({ id: "g1", revokedAt: "now" });
    await store.dispatch(revokeSupportGrant("g1"));
    expect(spy.mock.calls[0][0]).toBe("g1");
    expect(mutation(store, "revoke").status).toBe("succeeded");
    expect(stale(store)).toBe(true);
  });

  it("a failed write stores the error and leaves the cache fresh", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "createSupportGrant").mockRejectedValue(
      new ApiError("Active grant exists", { status: 400, code: "BAD_REQUEST", details: null }),
    );
    await store.dispatch(createSupportGrant({ companyId: "c1", reason: "debugging a bug" }));
    expect(mutation(store, "create").error).toMatchObject({ message: "Active grant exists", status: 400 });
    expect(stale(store)).toBe(false);
  });
});
