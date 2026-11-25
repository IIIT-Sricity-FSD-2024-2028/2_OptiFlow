import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { fetchPlans, createPlan, updatePlan } from "./thunks";

const PLANS = { items: [{ id: "p1", name: "Basic", isActive: true }] };

afterEach(() => vi.restoreAllMocks());

describe("platformPlans thunks", () => {
  it("fetchPlans calls listPlans with { signal, abortKey }", async () => {
    const spy = vi.spyOn(platformApi, "listPlans").mockResolvedValue(PLANS);
    const action = await makeStore().dispatch(fetchPlans());
    expect(action.type).toBe("platformPlans/fetch/fulfilled");
    expect(action.payload).toEqual(PLANS);
    const options = spy.mock.calls[0][0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.abortKey).toBe("platformPlans/fetch:null");
  });

  it("createPlan sends the body and never gets an abortKey", async () => {
    const spy = vi.spyOn(platformApi, "createPlan").mockResolvedValue({ id: "p2" });
    const action = await makeStore().dispatch(createPlan({ name: "Pro" }));
    expect(action.payload).toEqual({ id: "p2" });
    expect(spy.mock.calls[0][0]).toEqual({ name: "Pro" });
    expect(spy.mock.calls[0][1].abortKey).toBeUndefined();
  });

  it("updatePlan unpacks { id, body }", async () => {
    const spy = vi.spyOn(platformApi, "updatePlan").mockResolvedValue({ id: "p1", isActive: false });
    await makeStore().dispatch(updatePlan({ id: "p1", body: { isActive: false } }));
    expect(spy.mock.calls[0][0]).toBe("p1");
    expect(spy.mock.calls[0][1]).toEqual({ isActive: false });
  });

  it("a failing mutation is rejected with a normalised error", async () => {
    vi.spyOn(platformApi, "createPlan").mockRejectedValue(
      new ApiError("Name taken", { status: 409, code: "CONFLICT", details: null }),
    );
    const action = await makeStore().dispatch(createPlan({ name: "Pro" }));
    expect(action.type).toBe("platformPlans/create/rejected");
    expect(action.payload).toMatchObject({ message: "Name taken", status: 409, code: "CONFLICT" });
  });
});