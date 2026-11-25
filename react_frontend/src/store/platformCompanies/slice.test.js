import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import { describeKeyedListSlice } from "../core/keyedListSuite";
import {
  fetchCompanies,
  fetchCompany,
  createCompany,
  updateCompany,
  selectCompaniesEntry,
  selectCompanyMutation,
  selectCompanyDetail,
} from "./index";
import { createSubscription, updateSubscription } from "../platformSubscriptions/thunks";
import { createSupportGrant, revokeSupportGrant } from "../platformSupportAccess/thunks";
import { createPlan } from "../platformPlans/thunks";

describeKeyedListSlice({
  title: "platformCompanies",
  sliceName: "platformCompanies",
  service: "listCompanies",
  fetchList: fetchCompanies,
  selectEntry: selectCompaniesEntry,
});

const COMPANY = { id: "c1", legalName: "Acme", status: "Active", subscriptions: [] };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T10:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("platformCompanies: one company", () => {
  const detail = (store, id = "c1") => selectCompanyDetail(store.getState(), id);

  it("is idle with no data before anything is fetched", () => {
    expect(detail(makeStore())).toMatchObject({ status: "idle", data: null, error: null, loadedAt: null });
  });

  it("pending sets loading, fulfilled stores the company", async () => {
    let release;
    vi.spyOn(platformApi, "getCompany").mockImplementation(() => new Promise((r) => (release = r)));
    const store = makeStore();
    const p = store.dispatch(fetchCompany({ id: "c1" }));
    expect(detail(store).status).toBe("loading");
    release(COMPANY);
    await p;
    expect(detail(store)).toMatchObject({ status: "succeeded", data: COMPANY, loadedAt: Date.now() });
  });

  it("calls the service with the id and { signal, abortKey }", async () => {
    const spy = vi.spyOn(platformApi, "getCompany").mockResolvedValue(COMPANY);
    await makeStore().dispatch(fetchCompany({ id: "c1" }));
    expect(spy.mock.calls[0][0]).toBe("c1");
    expect(spy.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("never fetches without a valid id", async () => {
    const spy = vi.spyOn(platformApi, "getCompany").mockResolvedValue(COMPANY);
    const store = makeStore();
    await store.dispatch(fetchCompany({ id: "" }));
    await store.dispatch(fetchCompany({}));
    await store.dispatch(fetchCompany());
    expect(spy).not.toHaveBeenCalled();
  });

  it("uses fresh data, and force fetches again", async () => {
    const spy = vi.spyOn(platformApi, "getCompany").mockResolvedValue(COMPANY);
    const store = makeStore();
    await store.dispatch(fetchCompany({ id: "c1" }));
    await store.dispatch(fetchCompany({ id: "c1" }));
    expect(spy).toHaveBeenCalledTimes(1);
    await store.dispatch(fetchCompany({ id: "c1", force: true }));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("keeps companies apart", async () => {
    vi.spyOn(platformApi, "getCompany").mockImplementation(async (id) => ({ ...COMPANY, id }));
    const store = makeStore();
    await store.dispatch(fetchCompany({ id: "c1" }));
    await store.dispatch(fetchCompany({ id: "c2" }));
    expect(detail(store, "c1").data.id).toBe("c1");
    expect(detail(store, "c2").data.id).toBe("c2");
  });

  it("rejected stores the error and keeps the older data", async () => {
    const spy = vi.spyOn(platformApi, "getCompany").mockResolvedValueOnce(COMPANY);
    const store = makeStore();
    await store.dispatch(fetchCompany({ id: "c1" }));
    spy.mockRejectedValueOnce(new ApiError("Not found", { status: 404, code: "NOT_FOUND", details: null }));
    await store.dispatch(fetchCompany({ id: "c1", force: true }));
    expect(detail(store)).toMatchObject({ status: "failed", data: COMPANY });
    expect(detail(store).error).toMatchObject({ message: "Not found", status: 404 });
  });

  it("a cancelled load goes back to idle", async () => {
    vi.spyOn(platformApi, "getCompany").mockRejectedValue(new ApiError("Aborted", { code: "ABORTED" }));
    const store = makeStore();
    await store.dispatch(fetchCompany({ id: "c1" }));
    expect(detail(store)).toMatchObject({ status: "idle", error: null });
  });

  it("a late answer after logout is ignored", async () => {
    let release;
    vi.spyOn(platformApi, "getCompany").mockImplementation(() => new Promise((r) => (release = r)));
    const store = makeStore();
    const p = store.dispatch(fetchCompany({ id: "c1" }));
    store.dispatch(resetStore());
    release(COMPANY);
    await p;
    expect(store.getState().platformCompanies.details).toEqual({});
  });
});

describe("platformCompanies: writes", () => {
  const mutation = (store, key) => selectCompanyMutation(store.getState(), key);

  const loaded = async () => {
    vi.spyOn(platformApi, "listCompanies").mockResolvedValue({ items: [COMPANY], total: 1 });
    vi.spyOn(platformApi, "getCompany").mockResolvedValue(COMPANY);
    const store = makeStore();
    await store.dispatch(fetchCompanies({ page: 1 }));
    await store.dispatch(fetchCompany({ id: "c1" }));
    return store;
  };
  const isStale = (store) =>
    selectCompaniesEntry(store.getState(), { page: 1 }).loadedAt === null &&
    selectCompanyDetail(store.getState(), "c1").loadedAt === null;

  it("starts with idle mutations", () => {
    const state = makeStore().getState().platformCompanies;
    expect(state.mutations).toEqual({
      create: { status: "idle", error: null },
      update: { status: "idle", error: null },
    });
  });

  it("createCompany sends the body, marks lists and details stale, and keeps the one-time link out of the store", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "createCompany").mockResolvedValue({
      company: { id: "c9" },
      setPasswordUrl: "http://app/set-password?token=secret-token",
    });
    const action = await store.dispatch(createCompany({ legalName: "New Co" }));
    expect(spy.mock.calls[0][0]).toEqual({ legalName: "New Co" });
    expect(action.payload.setPasswordUrl).toContain("secret-token"); // the caller gets it...
    expect(mutation(store, "create")).toEqual({ status: "succeeded", error: null });
    expect(isStale(store)).toBe(true);
    expect(JSON.stringify(store.getState().platformCompanies)).not.toContain("secret-token"); // ...the store does not
    expect(selectCompaniesEntry(store.getState(), { page: 1 }).items).toEqual([COMPANY]); // rows stay visible
  });

  it("a stale list is fetched again by the next plain read", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "updateCompany").mockResolvedValue({ ...COMPANY, status: "Suspended" });
    await store.dispatch(updateCompany({ id: "c1", body: { status: "Suspended" } }));
    const list = vi.spyOn(platformApi, "listCompanies").mockResolvedValue({ items: [], total: 0 });
    list.mockClear(); // the same spy loaded the list above
    await store.dispatch(fetchCompanies({ page: 1 }));
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("updateCompany unpacks { id, body }", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "updateCompany").mockResolvedValue(COMPANY);
    await store.dispatch(updateCompany({ id: "c1", body: { status: "Closed" } }));
    expect(spy.mock.calls[0][0]).toBe("c1");
    expect(spy.mock.calls[0][1]).toEqual({ status: "Closed" });
    expect(mutation(store, "update").status).toBe("succeeded");
  });

  it("a failed write stores the error on the mutation and leaves the data fresh", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "updateCompany").mockRejectedValue(
      new ApiError("Invalid transition", { status: 400, code: "BAD_REQUEST", details: null }),
    );
    await store.dispatch(updateCompany({ id: "c1", body: { status: "Active" } }));
    expect(mutation(store, "update").status).toBe("failed");
    expect(mutation(store, "update").error).toMatchObject({ message: "Invalid transition", status: 400 });
    expect(isStale(store)).toBe(false);
  });

  it.each([
    ["createSubscription", createSubscription, "createSubscription", { companyId: "c1" }],
    ["updateSubscription", updateSubscription, "updateSubscription", { id: "s1", body: {} }],
    ["createSupportGrant", createSupportGrant, "createSupportGrant", { companyId: "c1" }],
    ["revokeSupportGrant", revokeSupportGrant, "revokeSupportGrant", "g1"],
    ["createPlan", createPlan, "createPlan", { name: "P" }],
  ])("%s elsewhere marks companies stale", async (_label, thunk, service, arg) => {
    const store = await loaded();
    vi.spyOn(platformApi, service).mockResolvedValue({ id: "x" });
    await store.dispatch(thunk(arg));
    expect(isStale(store)).toBe(true);
  });
});
