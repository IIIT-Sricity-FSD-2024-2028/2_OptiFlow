import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as api from "../../services/api/teams";
import * as roleAssignmentsApi from "../../services/api/roleAssignments";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import { createRoleAssignment, fetchRoleAssignments } from "../roleAssignments";
import {
  createTeam, updateTeam, removeTeam, addTeamMember, updateTeamMemberRole, removeTeamMember, fetchTeams, fetchTeamById, selectAllTeams, selectTeamById, selectTeamsLoadedAt, selectTeamDetailStatus, selectTeamWriteStatus, selectTeamWriteError, clearTeamWriteStatus, teamWriteKeys,
} from "./index";

const ROWS = [{ id: "x1" }, { id: "x2" }];
const DENIED = { message: "No", status: 429, code: "RATE_LIMITED", details: null };
const denied = () => new ApiError("No", { status: 429, code: "RATE_LIMITED" });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
async function loadedStore() {
  const list = vi.spyOn(api, "list").mockResolvedValue(ROWS);
  const store = makeStore();
  await store.dispatch(fetchTeams());
  return { store, list };
}

// name, action, wrapper, wrapper arguments before options, key
const WRITES = [
  ["createTeam", () => createTeam({ name: "N" }), "create", [{ name: "N" }], teamWriteKeys.create()],
  ["updateTeam", () => updateTeam({ id: "x1", data: { name: "N" } }), "update", ["x1", { name: "N" }], teamWriteKeys.update("x1")],
  ["removeTeam", () => removeTeam("x1"), "remove", ["x1"], teamWriteKeys.remove("x1")],
  ["addTeamMember", () => addTeamMember({ teamId: "x1", userId: "u1", role: "Member" }), "addMember", ["x1", { userId: "u1", role: "Member" }], teamWriteKeys.addMember("x1", "u1")],
  ["updateTeamMemberRole", () => updateTeamMemberRole({ teamId: "x1", userId: "u1", role: "Lead" }), "updateMemberRole", ["x1", "u1", "Lead"], teamWriteKeys.memberRole("x1", "u1")],
  ["removeTeamMember", () => removeTeamMember({ teamId: "x1", userId: "u1" }), "removeMember", ["x1", "u1"], teamWriteKeys.removeMember("x1", "u1")],
];

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(WRITES)("%s", (_name, action, method, args, key) => {
  it("calls its wrapper, is never abortable by key, tracks status and unwraps the response", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    const spy = vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action()).unwrap();
    expect(selectTeamWriteStatus(store.getState(), key)).toBe("loading");
    d.resolve({ id: "new" });
    await expect(p).resolves.toEqual({ id: "new" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]).toEqual([...args, { signal: expect.anything() }]);
    expect(selectTeamWriteStatus(store.getState(), key)).toBe("succeeded");
  });

  it("makes this list and the role assignments list stale", async () => {
    const { store, list } = await loadedStore();
    const raList = vi.spyOn(roleAssignmentsApi, "list").mockResolvedValue([]);
    await store.dispatch(fetchRoleAssignments());
    vi.spyOn(api, method).mockResolvedValue({ id: "new" });
    await store.dispatch(action());
    expect(selectTeamsLoadedAt(store.getState())).toBeNull();
    await store.dispatch(fetchTeams());
    await store.dispatch(fetchRoleAssignments());
    expect(list).toHaveBeenCalledTimes(2);
    expect(raList).toHaveBeenCalledTimes(2);
  });

  it("a failure stores the error and leaves the list fresh", async () => {
    const { store, list } = await loadedStore();
    vi.spyOn(api, method).mockRejectedValue(denied());
    await expect(store.dispatch(action()).unwrap()).rejects.toEqual(DENIED);
    expect(selectTeamWriteStatus(store.getState(), key)).toBe("failed");
    expect(selectTeamWriteError(store.getState(), key)).toEqual(DENIED);
    await store.dispatch(fetchTeams());
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("a success that lands after logout changes nothing", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, method).mockReturnValue(d.promise);
    const p = store.dispatch(action());
    store.dispatch(resetStore());
    await store.dispatch(fetchTeams());
    const before = store.getState();
    d.resolve({ id: "new" });
    await p;
    expect(store.getState()).toEqual(before);
  });
});

describe("teams writes", () => {
  it.each(WRITES)("a second %s while one is running sends no request", async (_name, action, method) => {
    const d = deferred();
    const spy = vi.spyOn(api, method).mockReturnValue(d.promise);
    const store = makeStore();
    const p = store.dispatch(action());
    await store.dispatch(action());
    expect(spy).toHaveBeenCalledTimes(1);
    d.resolve({});
    await p;
  });

  it("removeTeam drops the row only once the server confirms", async () => {
    const { store } = await loadedStore();
    const d = deferred();
    vi.spyOn(api, "remove").mockReturnValue(d.promise);
    const p = store.dispatch(removeTeam("x1"));
    expect(selectAllTeams(store.getState())).toHaveLength(2);
    d.resolve({});
    await p;
    expect(selectAllTeams(store.getState())).toEqual([ROWS[1]]);
    expect(selectTeamById(store.getState(), "x1")).toBeUndefined();
  });

  it("a failed removeTeam keeps the row", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "remove").mockRejectedValue(denied());
    await store.dispatch(removeTeam("x1"));
    expect(selectAllTeams(store.getState())).toEqual(ROWS);
  });

  it("a role assignment write makes this list stale too", async () => {
    vi.spyOn(roleAssignmentsApi, "create").mockResolvedValue({ id: "ra1" });
    const { store, list } = await loadedStore();
    await store.dispatch(createRoleAssignment({ userId: "u1", roleId: "r1" }));
    await store.dispatch(fetchTeams());
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("a detail read started before a write does not block the reload and cannot overwrite it", async () => {
    const old = deferred();
    vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce({ id: "x1", v: "new" });
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    const store = makeStore();
    const first = store.dispatch(fetchTeamById("x1"));
    await store.dispatch(createTeam({ name: "N" }));
    await store.dispatch(fetchTeamById("x1"));
    old.resolve({ id: "x1", v: "old" });
    await first;
    expect(selectTeamById(store.getState(), "x1")).toEqual({ id: "x1", v: "new" });
  });

  it("a detail read overtaken by a write repeats itself, nested data included", async () => {
    const old = deferred();
    const fresh = { id: "x1", nested: [{ full: true }] };
    const get = vi.spyOn(api, "get").mockReturnValueOnce(old.promise).mockResolvedValueOnce(fresh);
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "list").mockResolvedValue([{ id: "x1", nested: [{}] }]);
    const store = makeStore();
    const first = store.dispatch(fetchTeamById("x1"));
    await store.dispatch(createTeam({}));
    await store.dispatch(fetchTeams());
    old.resolve({ id: "x1", nested: [{ full: "old" }] });
    await first;
    expect(get).toHaveBeenCalledTimes(2);
    expect(selectTeamById(store.getState(), "x1")).toEqual(fresh);
    expect(selectTeamDetailStatus(store.getState(), "x1")).toBe("succeeded");
  });

  it("a detail read that gives up repeating does not overwrite a stored row", async () => {
    const { store } = await loadedStore();
    vi.spyOn(api, "create").mockResolvedValue({ id: "new" });
    vi.spyOn(api, "get").mockImplementation(async () => {
      await store.dispatch(createTeam({}));
      return { id: "x1", v: "old" };
    });
    await store.dispatch(fetchTeamById("x1"));
    expect(selectTeamById(store.getState(), "x1")).toEqual({ id: "x1" });
  });

  it("a deleted row is never fetched again", async () => {
    vi.spyOn(api, "remove").mockResolvedValue({});
    const get = vi.spyOn(api, "get").mockResolvedValue({ id: "x1" });
    const store = makeStore();
    await store.dispatch(removeTeam("x1"));
    await store.dispatch(fetchTeamById("x1"));
    expect(get).not.toHaveBeenCalled();
  });

  it("clearTeamWriteStatus forgets an old error", async () => {
    vi.spyOn(api, "create").mockRejectedValue(denied());
    const store = makeStore();
    await store.dispatch(createTeam({}));
    store.dispatch(clearTeamWriteStatus(teamWriteKeys.create()));
    expect(selectTeamWriteStatus(store.getState(), teamWriteKeys.create())).toBe("idle");
    expect(selectTeamWriteError(store.getState(), teamWriteKeys.create())).toBeNull();
  });

  it("a removed row does not come back when an older detail read lands", async () => {
    const { store } = await loadedStore();
    const old = deferred();
    vi.spyOn(api, "get").mockReturnValue(old.promise);
    vi.spyOn(api, "remove").mockResolvedValue({});
    const first = store.dispatch(fetchTeamById("x1"));
    await store.dispatch(removeTeam("x1"));
    old.resolve({ id: "x1" });
    await first;
    expect(selectTeamById(store.getState(), "x1")).toBeUndefined();
    expect(selectTeamDetailStatus(store.getState(), "x1")).toBe("idle");
  });

  it("removing a member is sent even while a role change for them is running", async () => {
    const d = deferred();
    vi.spyOn(api, "updateMemberRole").mockReturnValue(d.promise);
    const remove = vi.spyOn(api, "removeMember").mockResolvedValue({});
    const store = makeStore();
    const p = store.dispatch(updateTeamMemberRole({ teamId: "x1", userId: "u1", role: "Lead" }));
    await store.dispatch(removeTeamMember({ teamId: "x1", userId: "u1" }));
    expect(remove).toHaveBeenCalledTimes(1);
    d.resolve({});
    await p;
  });
});
