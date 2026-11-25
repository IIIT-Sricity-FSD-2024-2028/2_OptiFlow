import { describe, it, expect, vi, afterEach } from "vitest";
import * as platformApi from "../../services/api/platform";
import { makeStore } from "../index";
import { describeKeyedListSlice } from "../core/keyedListSuite";
import { fetchAuditLogs, selectAuditLogsEntry } from "./index";
import { createCompany, updateCompany } from "../platformCompanies/thunks";
import { createPlan, updatePlan } from "../platformPlans/thunks";
import { createSubscription, updateSubscription } from "../platformSubscriptions/thunks";
import { createAdminUser, updateAdminUser, resetAdminPassword } from "../platformAdminUsers/thunks";
import { createSupportGrant, revokeSupportGrant } from "../platformSupportAccess/thunks";

describeKeyedListSlice({
  title: "platformAuditLogs",
  sliceName: "platformAuditLogs",
  service: "listAuditLogs",
  fetchList: fetchAuditLogs,
  selectEntry: selectAuditLogsEntry,
});

afterEach(() => vi.restoreAllMocks());

describe("platformAuditLogs: invalidated by every platform write", () => {
  it.each([
    ["createCompany", createCompany, { legalName: "X" }],
    ["updateCompany", updateCompany, { id: "c1", body: {} }],
    ["createPlan", createPlan, { name: "P" }],
    ["updatePlan", updatePlan, { id: "p1", body: {} }],
    ["createSubscription", createSubscription, { companyId: "c1" }],
    ["updateSubscription", updateSubscription, { id: "s1", body: {} }],
    ["createAdminUser", createAdminUser, { email: "a@b.c" }],
    ["updateAdminUser", updateAdminUser, { id: "a1", body: {} }],
    ["resetAdminPassword", resetAdminPassword, "a1"],
    ["createSupportGrant", createSupportGrant, { companyId: "c1" }],
    ["revokeSupportGrant", revokeSupportGrant, "g1"],
  ])("%s marks the cached audit trail stale", async (service, thunk, arg) => {
    vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue({ items: [{ id: "l1" }], total: 1 });
    vi.spyOn(platformApi, service).mockResolvedValue({ id: "x" });
    const store = makeStore();
    const query = { page: 1 };
    await store.dispatch(fetchAuditLogs(query));
    expect(selectAuditLogsEntry(store.getState(), query).loadedAt).not.toBeNull();
    await store.dispatch(thunk(arg));
    const entry = selectAuditLogsEntry(store.getState(), query);
    expect(entry.loadedAt).toBeNull();
    expect(entry.items).toEqual([{ id: "l1" }]); // still shown until the refetch
  });

  it("a failed write does not invalidate", async () => {
    vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(platformApi, "createCompany").mockRejectedValue(new Error("no"));
    const store = makeStore();
    await store.dispatch(fetchAuditLogs({ page: 1 }));
    await store.dispatch(createCompany({}));
    expect(selectAuditLogsEntry(store.getState(), { page: 1 }).loadedAt).not.toBeNull();
  });
});
