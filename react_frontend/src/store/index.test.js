import { describe, it, expect } from "vitest";
import { makeStore } from "./index";
import { resetStore } from "./core/resetStore";

const EXPECTED = [
  "complianceRules", "complianceViolations", "complianceCategories", "complianceBindings",
  "evidence", "auditLogs", "executive",
  "auth", "platformCompanies", "platformPlans", "platformSubscriptions",
  "platformAdminUsers", "platformSupportAccess", "platformAuditLogs", "platformMetrics",
  "projects", "tasks", "subtasks", "escalations",
  "processTemplates", "processInstances", "notifications", "attachments",
  "users", "roles", "roleAssignments", "branches", "teams",
];

describe("store", () => {
  it("registers every slice name from the plan", () => {
    expect(Object.keys(makeStore().getState()).sort()).toEqual([...EXPECTED].sort());
  });

  it("resetStore returns every slice to its initial state", () => {
    const store = makeStore({
      users: { status: "succeeded", error: null, loadedAt: 123, mutations: {} },
    });
    expect(store.getState().users.status).toBe("succeeded");
    store.dispatch(resetStore());
    expect(store.getState().users).toEqual({
      status: "idle", error: null, loadedAt: null, mutations: {},
    });
  });
});