import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import { fetchPlans, createPlan, updatePlan } from "./thunks";

const BASIC = { id: "p1", name: "Basic", isActive: true };
const PRO = { id: "p3", name: "Pro", isActive: true };
const LIST = { items: [BASIC, PRO] };
const slice = (store) => store.getState().platformPlans;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-25T10:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("platformPlans slice: read", () => {
  it("starts idle with an empty list", () => {
    expect(slice(makeStore())).toMatchObject({
      status: "idle", error: null, loadedAt: null, data: [],
      mutations: { create: { status: "idle", error: null }, update: { status: "idle", error: null } },
    });
  });

  it("pending sets loading, fulfilled stores the items and loadedAt", async () => {
    let release;
    vi.spyOn(platformApi, "listPlans").mockImplementation(() => new Promise((r) => (release = r)));
    const store = makeStore();
    const p = store.dispatch(fetchPlans());
    expect(slice(store).status).toBe("loading");
    release(LIST);
    await p;
    expect(slice(store)).toMatchObject({ status: "succeeded", data: [BASIC, PRO], loadedAt: Date.now(), error: null });
  });

  it("is skipped while the same load is running", async () => {
    const spy = vi.spyOn(platformApi, "listPlans").mockImplementation(() => new Promise(() => {}));
    const store = makeStore();
    store.dispatch(fetchPlans());
    const second = await store.dispatch(fetchPlans());
    expect(second.meta.condition).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("uses fresh data, and force fetches again", async () => {
    const spy = vi.spyOn(platformApi, "listPlans").mockResolvedValue(LIST);
    const store = makeStore();
    await store.dispatch(fetchPlans());
    await store.dispatch(fetchPlans());
    expect(spy).toHaveBeenCalledTimes(1);
    await store.dispatch(fetchPlans({ force: true }));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("ignores an older response that arrives after a newer one", async () => {
    const releases = [];
    vi.spyOn(platformApi, "listPlans").mockImplementation(() => new Promise((r) => releases.push(r)));
    const store = makeStore();
    const first = store.dispatch(fetchPlans({ tag: "a" }));
    const second = store.dispatch(fetchPlans({ tag: "b" }));
    releases[1]({ items: [PRO] });
    await second;
    releases[0]({ items: [BASIC] });
    await first;
    expect(slice(store).data).toEqual([PRO]);
    });

  it("rejected stores the error and keeps the older list", async () => {
    const spy = vi.spyOn(platformApi, "listPlans").mockResolvedValueOnce(LIST);
    const store = makeStore();
    await store.dispatch(fetchPlans());
    spy.mockRejectedValueOnce(new ApiError("Boom", { status: 500, code: "SERVER", details: null }));
    await store.dispatch(fetchPlans({ force: true }));
    expect(slice(store)).toMatchObject({ status: "failed", data: [BASIC, PRO] });
    expect(slice(store).error).toMatchObject({ message: "Boom", status: 500, code: "SERVER" });
  });

  it("a cancelled load goes back to idle, never failed", async () => {
    vi.spyOn(platformApi, "listPlans").mockRejectedValue(new ApiError("Aborted", { code: "ABORTED" }));
    const store = makeStore();
    await store.dispatch(fetchPlans());
    expect(slice(store)).toMatchObject({ status: "idle", error: null });
  });
});

describe("platformPlans slice: mutations", () => {
  const loaded = async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue(LIST);
    const store = makeStore();
    await store.dispatch(fetchPlans());
    return store;
  };

  it("createPlan adds the saved plan to the list in name order", async () => {
    const store = await loaded();
    const GROWTH = { id: "p2", name: "Growth", isActive: true };
    vi.spyOn(platformApi, "createPlan").mockResolvedValue(GROWTH);
    await store.dispatch(createPlan({ name: "Growth" }));
    expect(slice(store).data.map((p) => p.name)).toEqual(["Basic", "Growth", "Pro"]);
    expect(slice(store).mutations.create).toEqual({ status: "succeeded", error: null });
  });

  it("the list does not change before the server answers", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "createPlan").mockImplementation(() => new Promise(() => {}));
    store.dispatch(createPlan({ name: "Growth" }));
    expect(slice(store).data).toHaveLength(2);
    expect(slice(store).mutations.create.status).toBe("loading");
  });

  it("updatePlan replaces the plan, which is how archiving shows up", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "updatePlan").mockResolvedValue({ ...BASIC, isActive: false });
    await store.dispatch(updatePlan({ id: "p1", body: { isActive: false } }));
    expect(slice(store).data.find((p) => p.id === "p1").isActive).toBe(false);
    expect(slice(store).data).toHaveLength(2);
  });

  it("a failed save keeps the list and the read status, and stores the error on the mutation", async () => {
    const store = await loaded();
    vi.spyOn(platformApi, "createPlan").mockRejectedValue(
      new ApiError("Name taken", { status: 409, code: "CONFLICT", details: null }),
    );
    await store.dispatch(createPlan({ name: "Pro" }));
    expect(slice(store).data).toEqual([BASIC, PRO]);
    expect(slice(store).status).toBe("succeeded");
    expect(slice(store).mutations.create.status).toBe("failed");
    expect(slice(store).mutations.create.error).toMatchObject({ message: "Name taken", status: 409 });
  });

  it("resetStore returns the slice to its initial state", async () => {
    const store = await loaded();
    store.dispatch(resetStore());
    expect(slice(store)).toMatchObject({ status: "idle", data: [], loadedAt: null });
  });
});