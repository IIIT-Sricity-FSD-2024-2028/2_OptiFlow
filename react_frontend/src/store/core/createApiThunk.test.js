import { describe, it, expect, vi, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { ApiError, apiRequest } from "../../services/api/client";
import { createApiThunk, isAbortedRejection } from "./createApiThunk";

const makeTestStore = () => configureStore({ reducer: (s = {}) => s });

afterEach(() => vi.unstubAllGlobals());

describe("createApiThunk", () => {
  it("resolves with the service result as the fulfilled payload", async () => {
    const thunk = createApiThunk("t/ok", async () => ({ total: 3 }));
    const action = await makeTestStore().dispatch(thunk());
    expect(action.type).toBe("t/ok/fulfilled");
    expect(action.payload).toEqual({ total: 3 });
  });

  it("passes the argument and an abort signal to the service call", async () => {
    const call = vi.fn().mockResolvedValue(null);
    await makeTestStore().dispatch(createApiThunk("t/args", call)({ id: 7 }));
    expect(call).toHaveBeenCalledTimes(1);
    const [arg, options] = call.mock.calls[0];
    expect(arg).toEqual({ id: 7 });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("gives reads an abortKey of type:arguments", async () => {
    const call = vi.fn().mockResolvedValue(null);
    const thunk = createApiThunk("t/read", call, { abortable: true });
    await makeTestStore().dispatch(thunk({ page: 2 }));
    expect(call.mock.calls[0][1].abortKey).toBe('t/read:{"page":2}');
  });

  it("different arguments give different abortKeys", async () => {
    const call = vi.fn().mockResolvedValue(null);
    const thunk = createApiThunk("t/read", call, { abortable: true });
    const store = makeTestStore();
    await store.dispatch(thunk({ page: 1 }));
    await store.dispatch(thunk({ page: 2 }));
    expect(call.mock.calls[0][1].abortKey).not.toBe(call.mock.calls[1][1].abortKey);
  });

  it("never gives mutations an abortKey", async () => {
    const call = vi.fn().mockResolvedValue(null);
    await makeTestStore().dispatch(createApiThunk("t/write", call)({ name: "x" }));
    expect(call.mock.calls[0][1]).not.toHaveProperty("abortKey");
  });

  it("rejects with a normalised payload that keeps code and details", async () => {
    const thunk = createApiThunk("t/fail", async () => {
      throw new ApiError("Blocked", { status: 403, code: "COMPLIANCE_BLOCK", details: [{ id: 1 }] });
    });
    const action = await makeTestStore().dispatch(thunk());
    expect(action.type).toBe("t/fail/rejected");
    expect(action.payload).toEqual({
      message: "Blocked",
      status: 403,
      code: "COMPLIANCE_BLOCK",
      details: [{ id: 1 }],
    });
    expect(isAbortedRejection(action)).toBe(false);
  });

  it("normalises a non-ApiError into UNKNOWN_ERROR", async () => {
    const thunk = createApiThunk("t/boom", async () => {
      throw new Error("boom");
    });
    const action = await makeTestStore().dispatch(thunk());
    expect(action.payload).toMatchObject({ message: "boom", status: 0, code: "UNKNOWN_ERROR" });
  });

  it("skips the call when condition returns false", async () => {
    const call = vi.fn().mockResolvedValue(null);
    const thunk = createApiThunk("t/cond", call, { condition: () => false });
    const store = makeTestStore();
    const result = await store.dispatch(thunk());
    expect(call).not.toHaveBeenCalled();
    expect(result.meta.condition).toBe(true);
  });

  it("treats a rejected action cancelled via the thunk's own abort as an abort", async () => {
    const thunk = createApiThunk("t/cancel", (_a, { signal }) =>
      new Promise((_res, rej) =>
        signal.addEventListener("abort", () => rej(new DOMException("x", "AbortError"))),
      ),
    );
    const promise = makeTestStore().dispatch(thunk());
    promise.abort();
    const action = await promise;
    expect(isAbortedRejection(action)).toBe(true);
  });

  it("passes thunkAPI (dispatch, getState) as a third argument", async () => {
    const call = vi.fn().mockResolvedValue(null);
    await makeTestStore().dispatch(createApiThunk("t/api", call)());
    const thirdArg = call.mock.calls[0][2];
    expect(typeof thirdArg.dispatch).toBe("function");
    expect(typeof thirdArg.getState).toBe("function");
  });

  it("with the real apiRequest, a newer read cancels the older one", async () => {
    // fetch that stays pending until aborted, or resolves when told to.
    const resolvers = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener("abort", () =>
              reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            );
            resolvers.push(() =>
              resolve(
                new Response(JSON.stringify({ ok: true }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }),
              ),
            );
          }),
      ),
    );

    const thunk = createApiThunk("t/real", (_a, options) => apiRequest("/metrics", options), {
      abortable: true,
    });
    const store = makeTestStore();

    const older = store.dispatch(thunk({ q: 1 }));
    const newer = store.dispatch(thunk({ q: 1 }));

    const olderAction = await older;
    expect(olderAction.type).toBe("t/real/rejected");
    expect(olderAction.payload.code).toBe("ABORTED");
    expect(isAbortedRejection(olderAction)).toBe(true);

    resolvers[1]();
    const newerAction = await newer;
    expect(newerAction.type).toBe("t/real/fulfilled");
  });
});
