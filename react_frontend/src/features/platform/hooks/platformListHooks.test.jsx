import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import * as platformApi from "../../../services/api/platform";
import { makeStore } from "../../../store";
import { useCompanies, useCompanyOptions } from "./useCompanies";
import { useSubscriptions } from "./useSubscriptions";
import { useAdminUsers } from "./useAdminUsers";
import { useSupportAccess } from "./useSupportAccess";
import { useAuditLogs, useScopedAuditLogs } from "./useAuditLogs";
import { usePlanOptions } from "./usePlans";

afterEach(() => vi.restoreAllMocks());

const page = (items, extra = {}) => ({ items, total: items.length, page: 1, pageSize: 10, ...extra });

function setup(useHook, { store = makeStore(), route = "/" } = {}) {
  const wrapper = ({ children }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </Provider>
  );
  return { store, ...renderHook(useHook, { wrapper }) };
}

describe("useCompanies", () => {
  it("loads the first page with the default query and returns the same keys as before", async () => {
    const list = vi.spyOn(platformApi, "listCompanies").mockResolvedValue(page([{ id: "c1" }, { id: "c2" }]));
    const { result } = setup(() => useCompanies());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.companies).toHaveLength(2));
    expect(list.mock.calls[0][0]).toEqual({ page: "1", pageSize: "10" });
    expect(Object.keys(result.current).sort()).toEqual(
      ["companies", "total", "page", "setPage", "pageSize", "setPageSize", "search", "setSearch", "statusFilter", "setStatusFilter", "loading", "error", "refetch", "updateCompanyStatus"].sort(),
    );
  });

  it("filters by status, resets to page 1, and keeps the old rows while the new page loads", async () => {
    let release;
    const list = vi
      .spyOn(platformApi, "listCompanies")
      .mockResolvedValueOnce(page([{ id: "c1" }], { total: 25 }))
      .mockImplementationOnce(() => new Promise((r) => { release = r; }));
    const { result } = setup(() => useCompanies());
    await waitFor(() => expect(result.current.companies).toHaveLength(1));
    act(() => {
      result.current.setPage(3);
      result.current.setStatusFilter("Suspended");
    });
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(result.current.page).toBe(1);
    expect(list.mock.calls.at(-1)[0]).toEqual({ page: "1", pageSize: "10", status: "Suspended" });
    // old rows stay on screen, no empty flash
    expect(result.current.companies).toHaveLength(1);
    expect(result.current.loading).toBe(false);
    await act(async () => release(page([{ id: "c9" }])));
    await waitFor(() => expect(result.current.companies[0].id).toBe("c9"));
  });

  it("debounces the search and sends it as q", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const list = vi.spyOn(platformApi, "listCompanies").mockResolvedValue(page([]));
    const { result } = setup(() => useCompanies());
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    act(() => result.current.setSearch("acme"));
    expect(list).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    await waitFor(() => expect(list.mock.calls.at(-1)[0]).toMatchObject({ q: "acme" }));
    vi.useRealTimers();
  });

  it("updates a status through the store and then reloads the list by itself", async () => {
    const list = vi
      .spyOn(platformApi, "listCompanies")
      .mockResolvedValueOnce(page([{ id: "c1", status: "Active" }]))
      .mockResolvedValue(page([{ id: "c1", status: "Suspended" }]));
    const update = vi.spyOn(platformApi, "updateCompany").mockResolvedValue({ id: "c1", status: "Suspended" });
    const { result } = setup(() => useCompanies());
    await waitFor(() => expect(result.current.companies[0]?.status).toBe("Active"));
    await act(async () => { await result.current.updateCompanyStatus("c1", "Suspended"); });
    expect(update.mock.calls[0].slice(0, 2)).toEqual(["c1", { status: "Suspended" }]);
    await waitFor(() => expect(result.current.companies[0].status).toBe("Suspended"));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("throws the server error to the caller on a failed update", async () => {
    vi.spyOn(platformApi, "listCompanies").mockResolvedValue(page([{ id: "c1" }]));
    vi.spyOn(platformApi, "updateCompany").mockRejectedValue(new Error("Not allowed"));
    const { result } = setup(() => useCompanies());
    await waitFor(() => expect(result.current.companies).toHaveLength(1));
    await expect(result.current.updateCompanyStatus("c1", "Closed")).rejects.toMatchObject({ message: "Not allowed" });
  });

  it("exposes a load failure as a message", async () => {
    vi.spyOn(platformApi, "listCompanies").mockRejectedValue(new Error("down"));
    const { result } = setup(() => useCompanies());
    await waitFor(() => expect(result.current.error).toBe("down"));
    expect(result.current.loading).toBe(false);
  });
});

describe("useCompanyOptions", () => {
  it("loads up to 100 companies", async () => {
    const list = vi.spyOn(platformApi, "listCompanies").mockResolvedValue(page([{ id: "c1" }]));
    const { result } = setup(() => useCompanyOptions());
    await waitFor(() => expect(result.current.companies).toHaveLength(1));
    expect(list.mock.calls[0][0]).toEqual({ pageSize: "100" });
  });

  it("does not fetch while disabled", () => {
    const list = vi.spyOn(platformApi, "listCompanies").mockResolvedValue(page([]));
    const { result } = setup(() => useCompanyOptions(false));
    expect(result.current.companies).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(list).not.toHaveBeenCalled();
  });
});

describe("useSubscriptions", () => {
  it("sends the plan, cycle and quick filters the way the backend expects", async () => {
    const list = vi.spyOn(platformApi, "listSubscriptions").mockResolvedValue(page([], { summary: { total: 3, active: 2 } }));
    const { result } = setup(() => useSubscriptions());
    await waitFor(() => expect(result.current.summary.total).toBe(3));
    act(() => result.current.setPlanFilter("p1"));
    act(() => result.current.setCycleFilter("Annual"));
    act(() => result.current.setQuickFilter("pastDue"));
    await waitFor(() =>
      expect(list.mock.calls.at(-1)[0]).toEqual({ page: "1", pageSize: "10", planId: "p1", billingCycle: "Annual", pastDue: "true" }),
    );
    act(() => result.current.setQuickFilter("expiring30"));
    await waitFor(() => expect(list.mock.calls.at(-1)[0]).toMatchObject({ expiringWithin: "30" }));
    expect(list.mock.calls.at(-1)[0]).not.toHaveProperty("pastDue");
  });

  it("returns an empty summary before the server has sent one", async () => {
    vi.spyOn(platformApi, "listSubscriptions").mockResolvedValue(page([]));
    const { result } = setup(() => useSubscriptions());
    expect(result.current.summary).toMatchObject({ total: 0, active: 0, pastDue: 0 });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("creates and updates through the store and reloads", async () => {
    const list = vi.spyOn(platformApi, "listSubscriptions").mockResolvedValue(page([{ id: "s1" }]));
    const create = vi.spyOn(platformApi, "createSubscription").mockResolvedValue({ id: "s2" });
    const update = vi.spyOn(platformApi, "updateSubscription").mockResolvedValue({ id: "s1" });
    const { result } = setup(() => useSubscriptions());
    await waitFor(() => expect(result.current.subscriptions).toHaveLength(1));
    await act(async () => { await result.current.createSubscription({ companyId: "c1", planId: "p1" }); });
    await act(async () => { await result.current.updateSubscription("s1", { status: "Cancelled" }); });
    expect(create.mock.calls[0][0]).toEqual({ companyId: "c1", planId: "p1" });
    expect(update.mock.calls[0].slice(0, 2)).toEqual(["s1", { status: "Cancelled" }]);
    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThanOrEqual(3));
  });
});

describe("useAdminUsers", () => {
  it("counts active admins from the rows when the server sends no summary", async () => {
    vi.spyOn(platformApi, "listAdminUsers").mockResolvedValue(page([{ id: "a1", isActive: true }, { id: "a2", isActive: false }, { id: "a3", isActive: true }]));
    const { result } = setup(() => useAdminUsers());
    await waitFor(() => expect(result.current.admins).toHaveLength(3));
    expect(result.current.summary).toEqual({ total: 3, active: 2, inactive: 1 });
  });

  it("hands the temporary password to the caller and keeps it out of the store", async () => {
    vi.spyOn(platformApi, "listAdminUsers").mockResolvedValue(page([]));
    vi.spyOn(platformApi, "createAdminUser").mockResolvedValue({ id: "a9", temporaryPassword: "Tmp-Secret-123" });
    vi.spyOn(platformApi, "resetAdminPassword").mockResolvedValue({ temporaryPassword: "Tmp-Reset-456" });
    const { result, store } = setup(() => useAdminUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let created, reset;
    await act(async () => { created = await result.current.createAdmin({ email: "x@y.z" }); });
    await act(async () => { reset = await result.current.resetPassword("a9"); });
    expect(created.temporaryPassword).toBe("Tmp-Secret-123");
    expect(reset.temporaryPassword).toBe("Tmp-Reset-456");
    expect(JSON.stringify(store.getState())).not.toMatch(/Tmp-Secret-123|Tmp-Reset-456/);
  });
});

describe("useSupportAccess", () => {
  it("sends company and date filters and exposes grant and revoke", async () => {
    const list = vi.spyOn(platformApi, "listSupportAccess").mockResolvedValue(page([{ id: "g1" }]));
    const create = vi.spyOn(platformApi, "createSupportGrant").mockResolvedValue({ id: "g2" });
    const revoke = vi.spyOn(platformApi, "revokeSupportGrant").mockResolvedValue({ id: "g1" });
    const { result } = setup(() => useSupportAccess());
    await waitFor(() => expect(result.current.grants).toHaveLength(1));
    act(() => result.current.setCompanyFilter("c1"));
    act(() => result.current.setStartDate("2026-11-01"));
    await waitFor(() =>
      expect(list.mock.calls.at(-1)[0]).toEqual({ page: "1", pageSize: "10", companyId: "c1", startDate: "2026-11-01" }),
    );
    await act(async () => { await result.current.createGrant({ companyId: "c1", reason: "Investigating", durationHours: 4 }); });
    await act(async () => { await result.current.revokeGrant("g1"); });
    expect(create).toHaveBeenCalled();
    expect(revoke.mock.calls[0][0]).toBe("g1");
  });
});

describe("useAuditLogs", () => {
  it("renames the admin filter, keeps filters in the URL and sends them to the list", async () => {
    const list = vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue(page([{ id: "l1" }], { pageSize: 20 }));
    const { result } = setup(() => useAuditLogs(), { route: "/platform/audit-logs?action=UPDATE&adminId=a1" });
    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    expect(list.mock.calls[0][0]).toEqual({ page: "1", pageSize: "20", action: "UPDATE", adminUserId: "a1" });
  });

  it("a 24h preset counts back from when it was picked and does not refetch on re-render", async () => {
    const list = vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue(page([]));
    const { result, rerender } = setup(() => useAuditLogs());
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    act(() => result.current.setDatePreset("24h"));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    const sent = list.mock.calls[1][0].startDate;
    expect(Date.now() - new Date(sent).getTime()).toBeGreaterThanOrEqual(24 * 3600 * 1000);
    expect(Date.now() - new Date(sent).getTime()).toBeLessThan(24 * 3600 * 1000 + 60_000);
    rerender();
    rerender();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("exports with the same filters as the table and frees the download link", async () => {
    vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue(page([]));
    const exporter = vi.spyOn(platformApi, "exportAuditLogsCsv").mockResolvedValue(new Blob(["id\n1"]));
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { result } = setup(() => useAuditLogs(), { route: "/?action=DELETE" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.exportCsv(); });
    expect(exporter.mock.calls[0][0]).toEqual({ action: "DELETE" });
    expect(click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
  });

  it("resetFilters clears everything", async () => {
    const list = vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue(page([]));
    const { result } = setup(() => useAuditLogs(), { route: "/?action=DELETE&entityType=Company" });
    await waitFor(() => expect(list).toHaveBeenCalled());
    act(() => result.current.resetFilters());
    await waitFor(() => expect(list.mock.calls.at(-1)[0]).toEqual({ page: "1", pageSize: "20" }));
  });
});

describe("useScopedAuditLogs", () => {
  it("loads one record's logs, and does not fetch without an id", async () => {
    const list = vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue(page([{ id: "l1" }]));
    const { result } = setup(() => useScopedAuditLogs({ companyId: "c1" }));
    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    expect(list.mock.calls[0][0]).toEqual({ companyId: "c1", pageSize: "20" });
    list.mockClear();
    const off = setup(() => useScopedAuditLogs({ adminUserId: undefined }, { enabled: false }));
    expect(off.result.current.logs).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it("does not show another record's rows while a new record loads", async () => {
    vi.spyOn(platformApi, "listAuditLogs").mockImplementation((q) =>
      q.companyId === "c1" ? Promise.resolve(page([{ id: "l1" }])) : new Promise(() => {}),
    );
    let id = "c1";
    const { result, rerender } = setup(() => useScopedAuditLogs({ companyId: id }));
    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    id = "c2";
    rerender();
    expect(result.current.logs).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("usePlanOptions", () => {
  it("shares the plan list and separates active plans", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [{ id: "p1", isActive: true }, { id: "p2", isActive: false }] });
    const { result } = setup(() => usePlanOptions());
    await waitFor(() => expect(result.current.plans).toHaveLength(2));
    expect(result.current.activePlans.map((p) => p.id)).toEqual(["p1"]);
  });
});
