import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./client", async (importOriginal) => ({
  ...(await importOriginal()),
  apiClient: vi.fn().mockResolvedValue({ ok: true }),
}));

import { apiClient } from "./client";
import * as session from "../auth/session";
import * as platformApi from "./platform";

beforeEach(() => apiClient.mockClear());
afterEach(() => vi.restoreAllMocks());

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

describe("toQueryString", () => {
  it("drops empty values and the UI's All placeholder", () => {
    expect(
      platformApi.toQueryString({ page: 2, q: "  ", status: "All", planId: "p1", x: null, y: undefined }),
    ).toBe("?page=2&planId=p1");
  });

  it("returns an empty string when nothing is left", () => {
    expect(platformApi.toQueryString({})).toBe("");
    expect(platformApi.toQueryString()).toBe("");
  });
});

describe("platform service: lists", () => {
  it.each([
    ["listCompanies", "/api/platform/companies"],
    ["listSubscriptions", "/api/platform/subscriptions"],
    ["listAdminUsers", "/api/platform/admin-users"],
    ["listSupportAccess", "/api/platform/support-access"],
    ["listAuditLogs", "/api/platform/audit-logs"],
  ])("%s builds the query string and forwards options", async (fn, path) => {
    const signal = new AbortController().signal;
    await platformApi[fn]({ page: 1, pageSize: 10, q: "acme", status: "All" }, { signal });
    expect(apiClient).toHaveBeenCalledWith(`${path}?page=1&pageSize=10&q=acme`, { signal });
  });

  it("a list with no query has no question mark", async () => {
    await platformApi.listCompanies();
    expect(apiClient).toHaveBeenCalledWith("/api/platform/companies", undefined);
  });
});

describe("platform service: companies", () => {
  it("getCompany reads one company", async () => {
    await platformApi.getCompany("c1");
    expect(apiClient).toHaveBeenCalledWith("/api/platform/companies/c1", undefined);
  });

  it("createCompany POSTs and updateCompany PATCHes", async () => {
    await platformApi.createCompany({ legalName: "Acme" });
    await platformApi.updateCompany("c1", { status: "Suspended" });
    expect(apiClient).toHaveBeenNthCalledWith(1, "/api/platform/companies", {
      method: "POST",
      body: { legalName: "Acme" },
    });
    expect(apiClient).toHaveBeenNthCalledWith(2, "/api/platform/companies/c1", {
      method: "PATCH",
      body: { status: "Suspended" },
    });
  });
});

describe("platform service: subscriptions, admin users, support access", () => {
  it("subscriptions: create POSTs, update PATCHes", async () => {
    await platformApi.createSubscription({ companyId: "c1", planId: "p1" });
    await platformApi.updateSubscription("s1", { status: "Cancelled" });
    expect(apiClient).toHaveBeenNthCalledWith(1, "/api/platform/subscriptions", {
      method: "POST",
      body: { companyId: "c1", planId: "p1" },
    });
    expect(apiClient).toHaveBeenNthCalledWith(2, "/api/platform/subscriptions/s1", {
      method: "PATCH",
      body: { status: "Cancelled" },
    });
  });

  it("admin users: create, update and reset password", async () => {
    await platformApi.createAdminUser({ email: "a@b.c" });
    await platformApi.updateAdminUser("a1", { isActive: false });
    await platformApi.resetAdminPassword("a1");
    expect(apiClient).toHaveBeenNthCalledWith(1, "/api/platform/admin-users", {
      method: "POST",
      body: { email: "a@b.c" },
    });
    expect(apiClient).toHaveBeenNthCalledWith(2, "/api/platform/admin-users/a1", {
      method: "PATCH",
      body: { isActive: false },
    });
    expect(apiClient).toHaveBeenNthCalledWith(3, "/api/platform/admin-users/a1/reset-password", {
      method: "POST",
    });
  });

  it("support access: grant and revoke", async () => {
    await platformApi.createSupportGrant({ companyId: "c1", reason: "debugging a bug", durationHours: 4 });
    await platformApi.revokeSupportGrant("g1");
    expect(apiClient).toHaveBeenNthCalledWith(1, "/api/platform/support-access", {
      method: "POST",
      body: { companyId: "c1", reason: "debugging a bug", durationHours: 4 },
    });
    expect(apiClient).toHaveBeenNthCalledWith(2, "/api/platform/support-access/g1/revoke", {
      method: "POST",
    });
  });
});

describe("exportAuditLogsCsv", () => {
  it("calls the API server (not the page origin) with the token and the filters", async () => {
    vi.spyOn(session, "getToken").mockReturnValue("tok");
    const blob = new Blob(["a,b"]);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, blob: async () => blob });
    const result = await platformApi.exportAuditLogsCsv({ action: "plan", startDate: "2026-01-01" });
    expect(result).toBe(blob);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/^https?:\/\/.+\/api\/platform\/audit-logs\/export\?action=plan&startDate=2026-01-01$/);
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(init.credentials).toBe("include");
  });

  it("throws the server's message when the export fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Forbidden here" }),
    });
    await expect(platformApi.exportAuditLogsCsv({})).rejects.toMatchObject({
      message: "Forbidden here",
      status: 403,
    });
  });

  it("throws a network error when the server cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fail"));
    await expect(platformApi.exportAuditLogsCsv({})).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

describe("compactQuery", () => {
  it("keeps real filters as text and drops empty ones and All", () => {
    expect(platformApi.compactQuery({ page: 2, q: " acme ", status: "All", planId: "", x: null })).toEqual({
      page: "2",
      q: "acme",
    });
  });
});
