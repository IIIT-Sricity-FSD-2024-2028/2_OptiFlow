import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as teamsApi from "../../services/api/teams";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import {
  fetchTeams, fetchTeamById,
  selectAllTeams, selectTeamById, selectTeamsStatus, selectTeamsError, selectTeamsLoadedAt,
  selectTeamDetailStatus, selectTeamDetailError,
} from "./index";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-23T10:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("teams slice", () => {
  it("replaces the stub and starts idle", () => {
    const state = makeStore().getState();
    expect(state.teams).toMatchObject({ listIds: [], details: {} });
    expect(selectTeamsStatus(state)).toBe("idle");
    expect(selectTeamsError(state)).toBeNull();
    expect(selectTeamsLoadedAt(state)).toBeNull();
  });

  it("fetchTeams() calls list with empty params and the thunk options", async () => {
    const spy = vi.spyOn(teamsApi, "list").mockResolvedValue([{ id: "x1" }]);
    const store = makeStore();
    await store.dispatch(fetchTeams());
    expect(spy).toHaveBeenCalledWith({}, expect.objectContaining({ abortKey: "teams/fetch:null" }));
    expect(selectAllTeams(store.getState())).toEqual([{ id: "x1" }]);
  });

  it("forwards the branch filter and keys each filter separately", async () => {
    const spy = vi.spyOn(teamsApi, "list").mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(fetchTeams({ branchId: "b1" }));
    await store.dispatch(fetchTeams({ branchId: "b2" }));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][0]).toEqual({ branchId: "b1" });
    expect(spy.mock.calls[1][0]).toEqual({ branchId: "b2" });
  });

  it("switching the filter shows no rows from the previous filter", async () => {
    let release;
    vi.spyOn(teamsApi, "list")
      .mockResolvedValueOnce([{ id: "x1" }])
      .mockImplementationOnce(() => new Promise((r) => (release = r)));
    const store = makeStore();
    await store.dispatch(fetchTeams({ branchId: "b1" }));
    const p = store.dispatch(fetchTeams({ branchId: "b2" }));
    expect(selectAllTeams(store.getState())).toEqual([]);
    release([]);
    await p;
  });

  it("stores embedded data exactly as returned", async () => {
    const row = { id: "x1", teamMembers: [{ userId: "u1", role: "Lead", user: { fullName: "A" } }], _count: { teams: 2 } };
    vi.spyOn(teamsApi, "list").mockResolvedValue([row]);
    const store = makeStore();
    await store.dispatch(fetchTeams());
    expect(selectTeamById(store.getState(), "x1")).toEqual(row);
  });

  it("fetchTeamById loads one row", async () => {
    const spy = vi.spyOn(teamsApi, "get").mockResolvedValue({ id: "x9" });
    const store = makeStore();
    await store.dispatch(fetchTeamById("x9"));
    expect(selectTeamById(store.getState(), "x9")).toEqual({ id: "x9" });
    expect(selectTeamDetailStatus(store.getState(), "x9")).toBe("succeeded");
    expect(selectTeamDetailError(store.getState(), "x9")).toBeNull();
    expect(spy).toHaveBeenCalledWith("x9", expect.objectContaining({ signal: expect.anything() }));
  });

  it("resetStore returns teams to its initial state", async () => {
    vi.spyOn(teamsApi, "list").mockResolvedValue([{ id: "x1" }]);
    const store = makeStore();
    await store.dispatch(fetchTeams());
    store.dispatch(resetStore());
    expect(store.getState().teams).toEqual(makeStore().getState().teams);
  });
});
