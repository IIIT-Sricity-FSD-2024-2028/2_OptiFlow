import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError, API_EVENT } from "../../services/api/client";
import * as rolesApi from "../../services/api/roles";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import {
  fetchRoles, fetchRoleById,
  selectAllRoles, selectRoleById, selectRolesStatus, selectRolesError, selectRolesLoadedAt,
  selectRoleDetailStatus, selectRoleDetailError,
} from "./index";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-23T10:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("roles slice", () => {
  it("replaces the stub and starts idle", () => {
    const state = makeStore().getState();
    expect(state.roles).toMatchObject({ listIds: [], details: {} });
    expect(selectRolesStatus(state)).toBe("idle");
    expect(selectRolesLoadedAt(state)).toBeNull();
  });

  it("loads roles verbatim, with embedded permissions", async () => {
    const spy = vi.spyOn(rolesApi, "list").mockResolvedValue([{ id: "r1", label: "HR", permissions: [{ slug: "hr:user:read" }] }]);
    const store = makeStore();
    await store.dispatch(fetchRoles());
    expect(selectRoleById(store.getState(), "r1").permissions[0].slug).toBe("hr:user:read");
    expect(selectAllRoles(store.getState())).toHaveLength(1);
    expect(selectRolesStatus(store.getState())).toBe("succeeded");
    expect(spy.mock.calls[0]).toHaveLength(1);
  });

  it("a 403 is a failure and raises the shared forbidden event", async () => {
    vi.spyOn(rolesApi, "list").mockRejectedValue(new ApiError("Forbidden", { status: 403, code: "FORBIDDEN" }));
    const events = [];
    const onEvent = (e) => events.push(e.detail);
    window.addEventListener(API_EVENT, onEvent);
    try {
      const store = makeStore();
      await store.dispatch(fetchRoles());
      expect(selectRolesStatus(store.getState())).toBe("failed");
      expect(selectRolesError(store.getState()).status).toBe(403);
      expect(events.some((d) => d.type === "forbidden")).toBe(true);
    } finally {
      window.removeEventListener(API_EVENT, onEvent);
    }
  });

  it("fetchRoleById loads one role", async () => {
    vi.spyOn(rolesApi, "get").mockResolvedValue({ id: "r9" });
    const store = makeStore();
    await store.dispatch(fetchRoleById("r9"));
    expect(selectRoleById(store.getState(), "r9")).toEqual({ id: "r9" });
    expect(selectRoleDetailStatus(store.getState(), "r9")).toBe("succeeded");
    expect(selectRoleDetailError(store.getState(), "r9")).toBeNull();
  });

  it("resetStore returns roles to its initial state", async () => {
    vi.spyOn(rolesApi, "list").mockResolvedValue([{ id: "r1" }]);
    const store = makeStore();
    await store.dispatch(fetchRoles());
    store.dispatch(resetStore());
    expect(store.getState().roles).toEqual(makeStore().getState().roles);
  });
});
