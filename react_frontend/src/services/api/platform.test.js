import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({ apiClient: vi.fn().mockResolvedValue({ ok: true }) }));

import { apiClient } from "./client";
import * as platformApi from "./platform";

beforeEach(() => apiClient.mockClear());

describe("platform service: plans", () => {
  it("listPlans reads /api/platform/plans and forwards options", async () => {
    const signal = new AbortController().signal;
    await platformApi.listPlans({ signal });
    expect(apiClient).toHaveBeenCalledWith("/api/platform/plans", { signal });
  });

  it("createPlan POSTs the body", async () => {
    const body = { name: "Pro" };
    await platformApi.createPlan(body);
    expect(apiClient).toHaveBeenCalledWith("/api/platform/plans", { method: "POST", body });
  });

  it("updatePlan PATCHes /plans/:id with the body and keeps options", async () => {
    const signal = new AbortController().signal;
    await platformApi.updatePlan("p1", { isActive: false }, { signal });
    expect(apiClient).toHaveBeenCalledWith("/api/platform/plans/p1", {
      signal,
      method: "PATCH",
      body: { isActive: false },
    });
  });
});