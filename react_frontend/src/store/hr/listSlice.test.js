import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore, createEntityAdapter, createSlice } from "@reduxjs/toolkit";
import { ApiError } from "../../services/api/client";
import { resetStore } from "../core/resetStore";
import {
  createListState,
  createListThunks,
  addListCases,
  addDetailCases,
  makeListSelectors,
} from "./listSlice";

const NOW = new Date("2026-11-23T10:00:00Z");
const aborted = () => new ApiError("Request cancelled", { code: "ABORTED" });

// A held promise: the test decides when (and how) the "server" answers.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let api;
let thunks;
let sel;
let makeTestStore;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  api = { list: vi.fn(), get: vi.fn() };
  // Bind lazily so each test's vi.fn is the one the thunk calls.
  thunks = createListThunks("things", {
    list: (query, options) => api.list(query, options),
    get: (id, options) => api.get(id, options),
  });
  const adapter = createEntityAdapter();
  const slice = createSlice({
    name: "things",
    initialState: createListState(adapter),
    reducers: {},
    extraReducers: (builder) => {
      addListCases(builder, thunks.fetchList, adapter);
      addDetailCases(builder, thunks.fetchById, adapter);
    },
  });
  sel = makeListSelectors("things");
  // Mirrors store/index.js: resetStore hands every slice `undefined`.
  const root = (state, action) => ({
    things: slice.reducer(action.type === resetStore.type ? undefined : state?.things, action),
  });
  makeTestStore = () => configureStore({ reducer: root });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listSlice helper: list lifecycle", () => {
  it("starts idle and empty", () => {
    const s = makeTestStore().getState().things;
    expect(s).toMatchObject({
      status: "idle", error: null, loadedAt: null, queryKey: null, requestId: null,
      listIds: [], ids: [], entities: {}, details: {}, mutations: {},
    });
  });

  it("pending -> fulfilled stores rows in server order", async () => {
    const d = deferred();
    api.list.mockReturnValue(d.promise);
    const store = makeTestStore();
    const p = store.dispatch(thunks.fetchList());
    expect(sel.selectStatus(store.getState())).toBe("loading");
    d.resolve([{ id: "b" }, { id: "a" }]);
    await p;
    const state = store.getState();
    expect(sel.selectAll(state)).toEqual([{ id: "b" }, { id: "a" }]);
    expect(sel.selectStatus(state)).toBe("succeeded");
    expect(sel.selectLoadedAt(state)).toBe(NOW.getTime());
    expect(sel.selectError(state)).toBeNull();
  });

  it("passes no query and the thunk options to list", async () => {
    api.list.mockResolvedValue([]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList({ force: true }));
    expect(api.list).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ signal: expect.anything(), abortKey: 'things/fetch:{"force":true}' }),
    );
  });

  it("passes the query (without force) to list", async () => {
    api.list.mockResolvedValue([]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList({ branchId: "b1", force: true }));
    expect(api.list.mock.calls[0][0]).toEqual({ branchId: "b1" });
  });

  it("rejected stores the normalised error", async () => {
    api.list.mockRejectedValue(new ApiError("Nope", { status: 500, code: "SERVER_ERROR" }));
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    expect(sel.selectStatus(store.getState())).toBe("failed");
    expect(sel.selectError(store.getState())).toEqual({
      message: "Nope", status: 500, code: "SERVER_ERROR", details: null,
    });
  });

  it("an aborted request is not a failure", async () => {
    api.list.mockRejectedValue(aborted());
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    expect(sel.selectStatus(store.getState())).toBe("idle");
    expect(sel.selectError(store.getState())).toBeNull();
  });

  it("an aborted refresh keeps the loaded rows and goes back to succeeded", async () => {
    api.list.mockResolvedValueOnce([{ id: "a" }]).mockRejectedValueOnce(aborted());
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    await store.dispatch(thunks.fetchList({ force: true }));
    expect(sel.selectStatus(store.getState())).toBe("succeeded");
    expect(sel.selectAll(store.getState())).toEqual([{ id: "a" }]);
  });

  it("ignores a stale response from an older query", async () => {
    const a = deferred();
    const b = deferred();
    api.list.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const store = makeTestStore();
    const pa = store.dispatch(thunks.fetchList({ branchId: "A" }));
    const pb = store.dispatch(thunks.fetchList({ branchId: "B" }));
    b.resolve([{ id: "b1" }]);
    await pb;
    a.resolve([{ id: "a1" }]);
    await pa;
    expect(sel.selectAll(store.getState())).toEqual([{ id: "b1" }]);
  });

  it("a query change clears the visible list while the new query loads", async () => {
    const b = deferred();
    api.list.mockResolvedValueOnce([{ id: "a1" }]).mockReturnValueOnce(b.promise);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList({ branchId: "A" }));
    const pb = store.dispatch(thunks.fetchList({ branchId: "B" }));
    expect(sel.selectAll(store.getState())).toEqual([]);
    expect(sel.selectStatus(store.getState())).toBe("loading");
    b.resolve([]);
    await pb;
  });

  it("A -> B -> A while B is in flight ends with A's rows", async () => {
    const b = deferred();
    api.list
      .mockResolvedValueOnce([{ id: "a1" }])
      .mockReturnValueOnce(b.promise)
      .mockResolvedValueOnce([{ id: "a2" }]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList({ branchId: "A" }));
    const pb = store.dispatch(thunks.fetchList({ branchId: "B" }));
    await store.dispatch(thunks.fetchList({ branchId: "A" }));
    b.resolve([{ id: "b1" }]);
    await pb;
    expect(sel.selectAll(store.getState())).toEqual([{ id: "a2" }]);
    expect(sel.selectStatus(store.getState())).toBe("succeeded");
  });

  it("fresh data skips the call; force refetches", async () => {
    api.list.mockResolvedValue([{ id: "a" }]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    await store.dispatch(thunks.fetchList());
    expect(api.list).toHaveBeenCalledTimes(1);
    await store.dispatch(thunks.fetchList({ force: true }));
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it("refetches once the 60 s freshness window has passed", async () => {
    api.list.mockResolvedValue([]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    vi.setSystemTime(NOW.getTime() + 60_001);
    await store.dispatch(thunks.fetchList());
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it("force while the same query is loading is skipped", async () => {
    const d = deferred();
    api.list.mockReturnValue(d.promise);
    const store = makeTestStore();
    const p = store.dispatch(thunks.fetchList());
    await store.dispatch(thunks.fetchList({ force: true }));
    expect(api.list).toHaveBeenCalledTimes(1);
    d.resolve([]);
    await p;
  });

  it("a response after logout is ignored", async () => {
    const d = deferred();
    api.list.mockReturnValue(d.promise);
    const store = makeTestStore();
    const initial = store.getState().things;
    const p = store.dispatch(thunks.fetchList());
    store.dispatch(resetStore());
    d.resolve([{ id: "a" }]);
    await p;
    expect(store.getState().things).toEqual(initial);
  });

  it("null and non-array list payloads become an empty success", async () => {
    api.list.mockResolvedValueOnce(null).mockResolvedValueOnce({ items: [{ id: "x" }] });
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    expect(sel.selectStatus(store.getState())).toBe("succeeded");
    expect(sel.selectAll(store.getState())).toEqual([]);
    await store.dispatch(thunks.fetchList({ force: true }));
    expect(sel.selectAll(store.getState())).toEqual([]);
  });

  it("rows without an id are skipped", async () => {
    api.list.mockResolvedValue([{ id: "a" }, { name: "no id" }, null]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    expect(sel.selectAll(store.getState())).toEqual([{ id: "a" }]);
  });

  it("a row dropped by the server leaves the list but stays readable by id", async () => {
    api.list.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]).mockResolvedValueOnce([{ id: "a" }]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    await store.dispatch(thunks.fetchList({ force: true }));
    expect(sel.selectAll(store.getState())).toEqual([{ id: "a" }]);
    expect(sel.selectById(store.getState(), "b")).toEqual({ id: "b" });
  });

  it("selectAll is memoised", async () => {
    api.list.mockResolvedValue([{ id: "a" }]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    const state = store.getState();
    expect(sel.selectAll(state)).toBe(sel.selectAll(state));
  });
});

describe("listSlice helper: detail lifecycle", () => {
  it("a detail fetch adds the row but not to the list", async () => {
    api.list.mockResolvedValue([{ id: "a" }]);
    api.get.mockResolvedValue({ id: "z", extra: 1 });
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    await store.dispatch(thunks.fetchById("z"));
    const state = store.getState();
    expect(sel.selectById(state, "z")).toEqual({ id: "z", extra: 1 });
    expect(sel.selectAll(state)).toEqual([{ id: "a" }]);
    expect(sel.selectDetailStatus(state, "z")).toBe("succeeded");
    expect(api.get).toHaveBeenCalledWith("z", expect.objectContaining({ abortKey: 'things/fetchById:"z"' }));
  });

  it("a list refresh keeps detail-only fields (upsert, not replace)", async () => {
    api.get.mockResolvedValue({ id: "a", name: "A", reports: [1] });
    api.list.mockResolvedValue([{ id: "a", name: "A2" }]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchById("a"));
    await store.dispatch(thunks.fetchList());
    expect(sel.selectById(store.getState(), "a")).toEqual({ id: "a", name: "A2", reports: [1] });
  });

  it("a detail failure leaves the list alone", async () => {
    api.list.mockResolvedValue([{ id: "a" }]);
    api.get.mockRejectedValue(new ApiError("Not found", { status: 404, code: "NOT_FOUND" }));
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    await store.dispatch(thunks.fetchById("z"));
    const state = store.getState();
    expect(sel.selectDetailStatus(state, "z")).toBe("failed");
    expect(sel.selectDetailError(state, "z").status).toBe(404);
    expect(sel.selectStatus(state)).toBe("succeeded");
    expect(sel.selectError(state)).toBeNull();
  });

  it("an aborted detail goes back to idle with no error", async () => {
    api.get.mockRejectedValue(aborted());
    const store = makeTestStore();
    await store.dispatch(thunks.fetchById("z"));
    expect(sel.selectDetailStatus(store.getState(), "z")).toBe("idle");
    expect(sel.selectDetailError(store.getState(), "z")).toBeNull();
  });

  it("the same id is not fetched twice at once", async () => {
    const d = deferred();
    api.get.mockReturnValue(d.promise);
    const store = makeTestStore();
    const p = store.dispatch(thunks.fetchById("z"));
    await store.dispatch(thunks.fetchById("z"));
    expect(api.get).toHaveBeenCalledTimes(1);
    d.resolve({ id: "z" });
    await p;
  });

  it("a detail response after logout is ignored and does not throw", async () => {
    const d = deferred();
    api.get.mockReturnValue(d.promise);
    const store = makeTestStore();
    const initial = store.getState().things;
    const p = store.dispatch(thunks.fetchById("z"));
    store.dispatch(resetStore());
    d.resolve({ id: "z" });
    const action = await p;
    expect(action.type).toBe("things/fetchById/fulfilled");
    expect(store.getState().things).toEqual(initial);
  });

  it("a detail rejection after logout is ignored and does not throw", async () => {
    const d = deferred();
    api.get.mockReturnValue(d.promise);
    const store = makeTestStore();
    const initial = store.getState().things;
    const p = store.dispatch(thunks.fetchById("z"));
    store.dispatch(resetStore());
    d.reject(new ApiError("Boom", { status: 500 }));
    await p;
    expect(store.getState().things).toEqual(initial);
  });

  it("a null detail payload writes nothing and does not throw", async () => {
    api.get.mockResolvedValue(null);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchById("z"));
    expect(sel.selectById(store.getState(), "z")).toBeUndefined();
    expect(sel.selectDetailStatus(store.getState(), "z")).toBe("succeeded");
  });

  it.each(["__proto__", "constructor", "..", "", "a/b", 42, null])("fetchById(%j) is skipped and writes nothing", async (id) => {
    const store = makeTestStore();
    await store.dispatch(thunks.fetchById(id));
    expect(api.get).not.toHaveBeenCalled();
    const details = store.getState().things.details;
    expect(Object.keys(details)).toEqual([]);
    expect(Object.getPrototypeOf(details)).toBe(Object.prototype);
  });

  it("prototype names are never read through the prototype", () => {
    const state = makeTestStore().getState();
    for (const name of ["constructor", "toString", "hasOwnProperty", "__proto__"]) {
      expect(sel.selectById(state, name)).toBeUndefined();
      expect(sel.selectDetailStatus(state, name)).toBe("idle");
      expect(sel.selectDetailError(state, name)).toBeNull();
    }
  });

  it("rows whose id is not a string are skipped", async () => {
    api.list.mockResolvedValue([{ id: "a" }, { id: 7 }, { id: { x: 1 } }, { id: "__proto__" }]);
    const store = makeTestStore();
    await store.dispatch(thunks.fetchList());
    expect(sel.selectAll(store.getState())).toEqual([{ id: "a" }]);
  });

  it("selectors for an id never fetched return idle and null", () => {
    const state = makeTestStore().getState();
    expect(sel.selectDetailStatus(state, "nope")).toBe("idle");
    expect(sel.selectDetailError(state, "nope")).toBeNull();
    expect(sel.selectById(state, "nope")).toBeUndefined();
  });
});
