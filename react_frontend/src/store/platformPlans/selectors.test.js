import { describe, it, expect, vi, afterEach } from "vitest";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import {
  fetchPlans, createPlan,
  selectPlans, selectPlansStatus, selectPlansError, selectPlansLoadedAt,
  selectActivePlans, selectArchivedPlans, selectPlanById,
  selectCreatePlanMutation, selectUpdatePlanMutation,
} from "./index";

const BASIC = { id: "p1", name: "Basic", isActive: true };
const OLD = { id: "p2", name: "Old", isActive: false };
const LEGACY = { id: "p3", name: "Legacy" }; // no isActive field

afterEach(() => vi.restoreAllMocks());

const loaded = async () => {
  vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [BASIC, OLD, LEGACY] });
  const store = makeStore();
  await store.dispatch(fetchPlans());
  return store;
};

describe("platformPlans selectors", () => {
  it("read the list, status, error and loadedAt", async () => {
    const state = (await loaded()).getState();
    expect(selectPlans(state)).toHaveLength(3);
    expect(selectPlansStatus(state)).toBe("succeeded");
    expect(selectPlansError(state)).toBeNull();
    expect(selectPlansLoadedAt(state)).toEqual(expect.any(Number));
  });

  it("active plans include plans without an isActive field; archived are only isActive === false", async () => {
    const state = (await loaded()).getState();
    expect(selectActivePlans(state).map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(selectArchivedPlans(state).map((p) => p.id)).toEqual(["p2"]);
  });

  it("returns the same array until the list changes", async () => {
    const store = await loaded();
    const first = selectActivePlans(store.getState());
    expect(selectActivePlans(store.getState())).toBe(first);
    vi.spyOn(platformApi, "createPlan").mockResolvedValue({ id: "p4", name: "Zed", isActive: true });
    await store.dispatch(createPlan({ name: "Zed" }));
    expect(selectActivePlans(store.getState())).not.toBe(first);
  });

  it("selectPlanById finds a plan or returns undefined", async () => {
    const state = (await loaded()).getState();
    expect(selectPlanById(state, "p2")).toEqual(OLD);
    expect(selectPlanById(state, "nope")).toBeUndefined();
  });

  it("mutation selectors return { status, error }", () => {
    const state = makeStore().getState();
    expect(selectCreatePlanMutation(state)).toEqual({ status: "idle", error: null });
    expect(selectUpdatePlanMutation(state)).toEqual({ status: "idle", error: null });
  });
});