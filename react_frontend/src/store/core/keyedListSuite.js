// Shared test suite for the keyed-list slices. Each slice test file calls
// describeKeyedListSlice(...) so every list slice is held to the same behaviour.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { resetStore } from "./resetStore";
import { MAX_ENTRIES } from "./keyedList";

const ROW = { id: "r1", name: "Row 1" };

export function describeKeyedListSlice({ title, sliceName, service, fetchList, selectEntry }) {
  describe(`${title}: list cache`, () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-25T10:00:00Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const entryOf = (store, query) => selectEntry(store.getState(), query);

    it("starts empty and idle for any query", () => {
      const entry = entryOf(makeStore(), { page: 1 });
      expect(entry).toMatchObject({ status: "idle", error: null, items: [], total: 0, summary: null, loadedAt: null });
    });

    it("pending sets loading, fulfilled stores items, total, summary and loadedAt", async () => {
      let release;
      vi.spyOn(platformApi, service).mockImplementation(() => new Promise((r) => (release = r)));
      const store = makeStore();
      const query = { page: 1, pageSize: 10 };
      const p = store.dispatch(fetchList(query));
      expect(entryOf(store, query).status).toBe("loading");
      release({ items: [ROW], total: 41, summary: { total: 41 } });
      await p;
      expect(entryOf(store, query)).toMatchObject({
        status: "succeeded",
        items: [ROW],
        total: 41,
        summary: { total: 41 },
        loadedAt: Date.now(),
        error: null,
      });
    });

    it("sends the query to the service with { signal, abortKey } and without `force`", async () => {
      const spy = vi.spyOn(platformApi, service).mockResolvedValue({ items: [] });
      await makeStore().dispatch(fetchList({ page: 2, force: true }));
      expect(spy.mock.calls[0][0]).toEqual({ page: 2 });
      expect(spy.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
      expect(spy.mock.calls[0][1].abortKey).toContain(":");
    });

    it("works with no query at all", async () => {
      const spy = vi.spyOn(platformApi, service).mockResolvedValue({ items: [ROW] });
      const store = makeStore();
      await store.dispatch(fetchList());
      expect(spy.mock.calls[0][0]).toBeUndefined();
      expect(entryOf(store, undefined).items).toEqual([ROW]);
    });

    it("total falls back to the number of rows, and a bare array is accepted", async () => {
      vi.spyOn(platformApi, service).mockResolvedValue([ROW, { id: "r2" }]);
      const store = makeStore();
      await store.dispatch(fetchList({ page: 1 }));
      expect(entryOf(store, { page: 1 })).toMatchObject({ total: 2, items: [ROW, { id: "r2" }] });
    });

    it("is skipped while the same query is loading", async () => {
      const spy = vi.spyOn(platformApi, service).mockImplementation(() => new Promise(() => {}));
      const store = makeStore();
      store.dispatch(fetchList({ page: 1 }));
      const second = await store.dispatch(fetchList({ page: 1 }));
      expect(second.meta.condition).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("uses fresh data, and force or a new query fetches again", async () => {
      const spy = vi.spyOn(platformApi, service).mockResolvedValue({ items: [ROW] });
      const store = makeStore();
      await store.dispatch(fetchList({ page: 1 }));
      await store.dispatch(fetchList({ page: 1 }));
      expect(spy).toHaveBeenCalledTimes(1);
      await store.dispatch(fetchList({ page: 1, force: true }));
      expect(spy).toHaveBeenCalledTimes(2);
      await store.dispatch(fetchList({ page: 2 }));
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it("fetches again once the data is older than the freshness window", async () => {
      const spy = vi.spyOn(platformApi, service).mockResolvedValue({ items: [ROW] });
      const store = makeStore();
      await store.dispatch(fetchList({ page: 1 }));
      vi.setSystemTime(new Date("2026-11-25T10:02:00Z"));
      await store.dispatch(fetchList({ page: 1 }));
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("different queries keep separate entries, and an old answer never replaces another page", async () => {
      const releases = {};
      vi.spyOn(platformApi, service).mockImplementation(
        (query) => new Promise((r) => (releases[query.page] = r)),
      );
      const store = makeStore();
      const first = store.dispatch(fetchList({ page: 1 }));
      const second = store.dispatch(fetchList({ page: 2 }));
      releases[2]({ items: [{ id: "p2" }], total: 2 });
      await second;
      releases[1]({ items: [{ id: "p1" }], total: 2 });
      await first;
      expect(entryOf(store, { page: 1 }).items).toEqual([{ id: "p1" }]);
      expect(entryOf(store, { page: 2 }).items).toEqual([{ id: "p2" }]);
    });

    it("the same query written in a different key order is the same entry", async () => {
      const spy = vi.spyOn(platformApi, service).mockResolvedValue({ items: [ROW] });
      const store = makeStore();
      await store.dispatch(fetchList({ page: 1, q: "a" }));
      await store.dispatch(fetchList({ q: "a", page: 1 }));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(entryOf(store, { q: "a", page: 1 }).items).toEqual([ROW]);
    });

    it("rejected stores the normalised error and keeps the older rows", async () => {
      const spy = vi.spyOn(platformApi, service).mockResolvedValueOnce({ items: [ROW] });
      const store = makeStore();
      await store.dispatch(fetchList({ page: 1 }));
      spy.mockRejectedValueOnce(new ApiError("Boom", { status: 500, code: "SERVER", details: null }));
      await store.dispatch(fetchList({ page: 1, force: true }));
      const entry = entryOf(store, { page: 1 });
      expect(entry.status).toBe("failed");
      expect(entry.items).toEqual([ROW]);
      expect(entry.error).toMatchObject({ message: "Boom", status: 500, code: "SERVER" });
    });

    it("a cancelled load goes back to idle, never failed", async () => {
      vi.spyOn(platformApi, service).mockRejectedValue(new ApiError("Aborted", { code: "ABORTED" }));
      const store = makeStore();
      await store.dispatch(fetchList({ page: 1 }));
      expect(entryOf(store, { page: 1 })).toMatchObject({ status: "idle", error: null });
    });

    it("keeps at most MAX_ENTRIES queries", async () => {
      vi.spyOn(platformApi, service).mockResolvedValue({ items: [] });
      const store = makeStore();
      for (let page = 1; page <= MAX_ENTRIES + 5; page += 1) {
        await store.dispatch(fetchList({ page }));
      }
      const state = store.getState()[sliceName];
      expect(Object.keys(state.lists)).toHaveLength(MAX_ENTRIES);
      expect(state.order).toHaveLength(MAX_ENTRIES);
      expect(entryOf(store, { page: 1 }).status).toBe("idle"); // the oldest was dropped
      expect(entryOf(store, { page: MAX_ENTRIES + 5 }).status).toBe("succeeded");
    });

    it("a late answer after logout is ignored", async () => {
      let release;
      vi.spyOn(platformApi, service).mockImplementation(() => new Promise((r) => (release = r)));
      const store = makeStore();
      const p = store.dispatch(fetchList({ page: 1 }));
      store.dispatch(resetStore());
      release({ items: [ROW] });
      await p;
      expect(store.getState()[sliceName].lists).toEqual({});
    });

    it("resetStore clears the cache", async () => {
      vi.spyOn(platformApi, service).mockResolvedValue({ items: [ROW] });
      const store = makeStore();
      await store.dispatch(fetchList({ page: 1 }));
      store.dispatch(resetStore());
      expect(entryOf(store, { page: 1 }).status).toBe("idle");
    });
  });
}
