import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import {
  fetchPlatformMetrics,
  selectPlatformMetrics,
  selectPlatformMetricsStatus,
  selectPlatformMetricsError,
  selectPlatformMetricsLoadedAt,
} from "./index";

const DATA = { totalCompanies: 4, planDistribution: [] };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-21T10:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("platformMetrics slice", () => {
  it("starts idle with no data", () => {
    const s = makeStore().getState().platformMetrics;
    expect(s).toMatchObject({ status: "idle", error: null, loadedAt: null, data: null, mutations: {} });
  });

  it("pending sets loading, fulfilled stores data and loadedAt", async () => {
    let release;
    vi.spyOn(platformApi, "getMetrics").mockImplementation(() => new Promise((r) => (release = r)));
    const store = makeStore();
    const p = store.dispatch(fetchPlatformMetrics());
    expect(selectPlatformMetricsStatus(store.getState())).toBe("loading");
    release(DATA);
    await p;
    const state = store.getState();
    expect(selectPlatformMetricsStatus(state)).toBe("succeeded");
    expect(selectPlatformMetrics(state)).toEqual(DATA);
    expect(selectPlatformMetricsLoadedAt(state)).toBe(Date.now());
    expect(selectPlatformMetricsError(state)).toBeNull();
  });

  it("calls the service with { signal, abortKey }", async () => {
    const spy = vi.spyOn(platformApi, "getMetrics").mockResolvedValue(DATA);
    await makeStore().dispatch(fetchPlatformMetrics());
    const options = spy.mock.calls[0][0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.abortKey).toBe("platformMetrics/fetch:null");
  });

  it("rejected stores the normalised error and keeps older data", async () => {
    const spy = vi.spyOn(platformApi, "getMetrics").mockResolvedValueOnce(DATA);
    const store = makeStore();
    await store.dispatch(fetchPlatformMetrics());
    spy.mockRejectedValueOnce(new ApiError("Boom", { status: 500, code: "SERVER", details: null }));
    await store.dispatch(fetchPlatformMetrics({ force: true }));
    const state = store.getState();
    expect(selectPlatformMetricsStatus(state)).toBe("failed");
    expect(selectPlatformMetricsError(state)).toEqual({ message: "Boom", status: 500, code: "SERVER", details: null });
    expect(selectPlatformMetrics(state)).toEqual(DATA);
  });

  it("an aborted request never sets failed", async () => {
    vi.spyOn(platformApi, "getMetrics").mockImplementation(
      (_o) => Promise.reject(new ApiError("Request cancelled", { code: "ABORTED" })),
    );
    const store = makeStore();
    await store.dispatch(fetchPlatformMetrics());
    expect(selectPlatformMetricsStatus(store.getState())).toBe("idle");
    expect(selectPlatformMetricsError(store.getState())).toBeNull();
  });

  it("an aborted refresh goes back to succeeded, not loading", async () => {
    const spy = vi.spyOn(platformApi, "getMetrics").mockResolvedValueOnce(DATA);
    const store = makeStore();
    await store.dispatch(fetchPlatformMetrics());
    spy.mockRejectedValueOnce(new ApiError("Request cancelled", { code: "ABORTED" }));
    await store.dispatch(fetchPlatformMetrics({ force: true }));
    expect(selectPlatformMetricsStatus(store.getState())).toBe("succeeded");
  });

  it("skips the request while data is fresh, refetches after 60 s", async () => {
    const spy = vi.spyOn(platformApi, "getMetrics").mockResolvedValue(DATA);
    const store = makeStore();
    await store.dispatch(fetchPlatformMetrics());
    await store.dispatch(fetchPlatformMetrics());
    expect(spy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(61_000);
    await store.dispatch(fetchPlatformMetrics());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("force refetches even when fresh", async () => {
    const spy = vi.spyOn(platformApi, "getMetrics").mockResolvedValue(DATA);
    const store = makeStore();
    await store.dispatch(fetchPlatformMetrics());
    await store.dispatch(fetchPlatformMetrics({ force: true }));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("two calls at once share one request", async () => {
    let release;
    const spy = vi.spyOn(platformApi, "getMetrics").mockImplementation(() => new Promise((r) => (release = r)));
    const store = makeStore();
    const a = store.dispatch(fetchPlatformMetrics());
    const b = store.dispatch(fetchPlatformMetrics());
    release(DATA);
    await Promise.all([a, b]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("resetStore clears it", async () => {
    vi.spyOn(platformApi, "getMetrics").mockResolvedValue(DATA);
    const store = makeStore();
    await store.dispatch(fetchPlatformMetrics());
    store.dispatch(resetStore());
    expect(store.getState().platformMetrics).toMatchObject({ status: "idle", data: null, loadedAt: null });
  });
});

describe("platformMetrics: stale after platform writes", () => {
  it.each([
    ["createCompany", () => import("../platformCompanies/thunks").then((m) => m.createCompany({}))],
    ["updateCompany", () => import("../platformCompanies/thunks").then((m) => m.updateCompany({ id: "c1", body: {} }))],
    ["createPlan", () => import("../platformPlans/thunks").then((m) => m.createPlan({}))],
    ["updatePlan", () => import("../platformPlans/thunks").then((m) => m.updatePlan({ id: "p1", body: {} }))],
    ["createSubscription", () => import("../platformSubscriptions/thunks").then((m) => m.createSubscription({}))],
    ["updateSubscription", () => import("../platformSubscriptions/thunks").then((m) => m.updateSubscription({ id: "s1", body: {} }))],
    ["createAdminUser", () => import("../platformAdminUsers/thunks").then((m) => m.createAdminUser({}))],
    ["updateAdminUser", () => import("../platformAdminUsers/thunks").then((m) => m.updateAdminUser({ id: "a1", body: {} }))],
    ["createSupportGrant", () => import("../platformSupportAccess/thunks").then((m) => m.createSupportGrant({}))],
    ["revokeSupportGrant", () => import("../platformSupportAccess/thunks").then((m) => m.revokeSupportGrant("g1"))],
  ])("%s makes the next plain read fetch again", async (service, makeThunk) => {
    const read = vi.spyOn(platformApi, "getMetrics").mockResolvedValue(DATA);
    vi.spyOn(platformApi, service).mockResolvedValue({ id: "x" });
    const store = makeStore();
    await store.dispatch(fetchPlatformMetrics());
    await store.dispatch(fetchPlatformMetrics()); // still fresh: skipped
    expect(read).toHaveBeenCalledTimes(1);
    await store.dispatch(await makeThunk());
    expect(selectPlatformMetricsLoadedAt(store.getState())).toBeNull();
    expect(selectPlatformMetrics(store.getState())).toEqual(DATA); // still shown until the refetch
    await store.dispatch(fetchPlatformMetrics());
    expect(read).toHaveBeenCalledTimes(2);
  });
});
