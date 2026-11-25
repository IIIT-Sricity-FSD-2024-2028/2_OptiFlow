import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { describeKeyedListSlice } from "../core/keyedListSuite";
import {
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  selectSubscriptionsEntry,
  selectSubscriptionMutation,
} from "./index";
import { createCompany, updateCompany } from "../platformCompanies/thunks";
import { updatePlan } from "../platformPlans/thunks";

describeKeyedListSlice({
  title: "platformSubscriptions",
  sliceName: "platformSubscriptions",
  service: "listSubscriptions",
  fetchList: fetchSubscriptions,
  selectEntry: selectSubscriptionsEntry,
});

afterEach(() => vi.restoreAllMocks());

const SUB = { id: "s1", status: "Active", plan: { name: "Basic" } };
const query = { page: 1, status: "Active" };

const loaded = async () => {
  vi.spyOn(platformApi, "listSubscriptions").mockResolvedValue({ items: [SUB], total: 1, summary: { active: 1 } });
  const store = makeStore();
  await store.dispatch(fetchSubscriptions(query));
  return store;
};
const stale = (store) => selectSubscriptionsEntry(store.getState(), query).loadedAt === null;
const mutation = (store, key) => selectSubscriptionMutation(store.getState(), key);

describe("platformSubscriptions: writes", () => {
  it("starts with idle mutations", () => {
    expect(makeStore().getState().platformSubscriptions.mutations).toEqual({
      create: { status: "idle", error: null },
      update: { status: "idle", error: null },
    });
  });

  it("createSubscription sends the body and marks the cache stale, keeping rows and summary", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "createSubscription").mockResolvedValue({ id: "s2" });
    await store.dispatch(createSubscription({ companyId: "c1", planId: "p1", billingCycle: "Monthly" }));
    expect(spy.mock.calls[0][0]).toEqual({ companyId: "c1", planId: "p1", billingCycle: "Monthly" });
    expect(mutation(store, "create")).toEqual({ status: "succeeded", error: null });
    expect(stale(store)).toBe(true);
    expect(selectSubscriptionsEntry(store.getState(), query)).toMatchObject({ items: [SUB], summary: { active: 1 } });
  });

  it("updateSubscription unpacks { id, body }", async () => {
    const store = await loaded();
    const spy = vi.spyOn(platformApi, "updateSubscription").mockResolvedValue({ ...SUB, status: "Cancelled" });
    await store.dispatch(updateSubscription({ id: "s1", body: { status: "Cancelled", reason: "x" } }));
    expect(spy.mock.calls[0][0]).toBe("s1");
    expect(spy.mock.calls[0][1]).toEqual({ status: "Cancelled", reason: "x" });
    expect(stale(store)).toBe(true);
  });

  it("a failed write keeps the cache fresh and stores the error on the mutation", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "createSubscription").mockRejectedValue(
      new ApiError("Already has one", { status: 400, code: "BAD_REQUEST", details: null }),
    );
    await store.dispatch(createSubscription({ companyId: "c1", planId: "p1" }));
    expect(mutation(store, "create").status).toBe("failed");
    expect(mutation(store, "create").error).toMatchObject({ message: "Already has one", status: 400 });
    expect(stale(store)).toBe(false);
  });

  it.each([
    ["createCompany", createCompany, { legalName: "X" }],
    ["updateCompany", updateCompany, { id: "c1", body: {} }],
    ["updatePlan", updatePlan, { id: "p1", body: {} }],
  ])("%s elsewhere marks subscriptions stale", async (service, thunk, arg) => {
    const store = await loaded();
    vi.spyOn(platformApi, service).mockResolvedValue({ id: "x" });
    await store.dispatch(thunk(arg));
    expect(stale(store)).toBe(true);
  });
});
