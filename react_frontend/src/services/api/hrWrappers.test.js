import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import * as users from "./users";
import * as roles from "./roles";
import * as branches from "./branches";
import * as teams from "./teams";
import * as roleAssignments from "./roleAssignments";

// Keep the real module (ApiError etc.); replace only the network call.
vi.mock("./client", async (importOriginal) => ({ ...(await importOriginal()), apiClient: vi.fn() }));

const opts = { signal: "S", abortKey: "K" };

beforeEach(() => {
  vi.mocked(apiClient).mockReset().mockResolvedValue("ok");
});

// [name, call, expected path, expected options]
const CASES = [
  ["users.list()", () => users.list(), "/api/users", { method: "GET" }],
  ["users.list(opts)", () => users.list(opts), "/api/users", { method: "GET", ...opts }],
  ["users.get", () => users.get("u1", opts), "/api/users/u1", { method: "GET", ...opts }],
  ["users.create", () => users.create({ a: 1 }), "/api/users", { method: "POST", body: { a: 1 } }],
  ["users.update", () => users.update("u1", { a: 1 }, opts), "/api/users/u1", { method: "PATCH", body: { a: 1 }, ...opts }],
  ["users.remove", () => users.remove("u1", opts), "/api/users/u1", { method: "DELETE", ...opts }],
  ["users.reactivate", () => users.reactivate("u1", opts), "/api/users/u1/reactivate", { method: "PATCH", ...opts }],

  ["roles.list", () => roles.list(opts), "/api/roles", { method: "GET", ...opts }],
  ["roles.get", () => roles.get("r1", opts), "/api/roles/r1", { method: "GET", ...opts }],
  ["roles.create", () => roles.create({ a: 1 }, opts), "/api/roles", { method: "POST", body: { a: 1 }, ...opts }],
  ["roles.update", () => roles.update("r1", { a: 1 }), "/api/roles/r1", { method: "PATCH", body: { a: 1 } }],
  ["roles.remove", () => roles.remove("r1"), "/api/roles/r1", { method: "DELETE" }],
  ["roles.setPermissions", () => roles.setPermissions("r1", ["a:b"], opts), "/api/roles/r1/permissions", { method: "PUT", body: { permissionSlugs: ["a:b"] }, ...opts }],

  ["branches.list()", () => branches.list(), "/api/branches", { method: "GET" }],
  ["branches.list(filter)", () => branches.list({ branchId: "b1" }, opts), "/api/branches?branchId=b1", { method: "GET", ...opts }],
  ["branches.get", () => branches.get("b1", opts), "/api/branches/b1", { method: "GET", ...opts }],
  ["branches.create", () => branches.create({ a: 1 }), "/api/branches", { method: "POST", body: { a: 1 } }],
  ["branches.update", () => branches.update("b1", { a: 1 }, opts), "/api/branches/b1", { method: "PATCH", body: { a: 1 }, ...opts }],
  ["branches.remove()", () => branches.remove("b1"), "/api/branches/b1", { method: "DELETE" }],
  ["branches.remove(reassign)", () => branches.remove("b1", { reassignBranchId: "b2" }), "/api/branches/b1?reassignBranchId=b2", { method: "DELETE" }],

  ["teams.list()", () => teams.list(), "/api/teams", { method: "GET" }],
  ["teams.list({})", () => teams.list({}), "/api/teams", { method: "GET" }],
  ["teams.list(filter)", () => teams.list({ branchId: "b1" }, opts), "/api/teams?branchId=b1", { method: "GET", ...opts }],
  ["teams.get", () => teams.get("t1", opts), "/api/teams/t1", { method: "GET", ...opts }],
  ["teams.create", () => teams.create({ a: 1 }), "/api/teams", { method: "POST", body: { a: 1 } }],
  ["teams.update", () => teams.update("t1", { a: 1 }, opts), "/api/teams/t1", { method: "PATCH", body: { a: 1 }, ...opts }],
  ["teams.remove", () => teams.remove("t1", opts), "/api/teams/t1", { method: "DELETE", ...opts }],
  ["teams.addMember", () => teams.addMember("t1", { userId: "u1" }), "/api/teams/t1/members", { method: "POST", body: { userId: "u1" } }],
  ["teams.updateMemberRole", () => teams.updateMemberRole("t1", "u1", "Lead", opts), "/api/teams/t1/members/u1", { method: "PATCH", body: { role: "Lead" }, ...opts }],
  ["teams.removeMember", () => teams.removeMember("t1", "u1", opts), "/api/teams/t1/members/u1", { method: "DELETE", ...opts }],

  ["roleAssignments.list()", () => roleAssignments.list(), "/api/role-assignments", { method: "GET" }],
  ["roleAssignments.list(opts)", () => roleAssignments.list({}, opts), "/api/role-assignments", { method: "GET", ...opts }],
  ["roleAssignments.list(filter)", () => roleAssignments.list({ userId: "u1" }), "/api/role-assignments?userId=u1", { method: "GET" }],
  ["roleAssignments.list(roleId)", () => roleAssignments.list({ roleId: "r1" }), "/api/role-assignments?roleId=r1", { method: "GET" }],
  ["roleAssignments.create", () => roleAssignments.create({ x: 1 }), "/api/role-assignments", { method: "POST", body: { x: 1 } }],
  ["roleAssignments.remove", () => roleAssignments.remove("ra1"), "/api/role-assignments/ra1", { method: "DELETE" }],
];

const UUID = "602f12bd-c084-456b-b274-e8d91c7b02cf";
const BAD_IDS = ["..", ".", "", "a/b", "x?y=1", "a#b", "%2e%2e", "__proto__", "constructor", undefined, null, 42, { id: "x" }];

// Every wrapper that puts an id in the path, called with that id.
const PATH_CALLS = [
  ["users.get", (id) => users.get(id)],
  ["users.update", (id) => users.update(id, {})],
  ["users.remove", (id) => users.remove(id)],
  ["users.reactivate", (id) => users.reactivate(id)],
  ["roles.get", (id) => roles.get(id)],
  ["roles.update", (id) => roles.update(id, {})],
  ["roles.remove", (id) => roles.remove(id)],
  ["roles.setPermissions", (id) => roles.setPermissions(id, [])],
  ["branches.get", (id) => branches.get(id)],
  ["branches.update", (id) => branches.update(id, {})],
  ["branches.remove", (id) => branches.remove(id)],
  ["teams.get", (id) => teams.get(id)],
  ["teams.update", (id) => teams.update(id, {})],
  ["teams.remove", (id) => teams.remove(id)],
  ["teams.addMember", (id) => teams.addMember(id, {})],
  ["teams.updateMemberRole(team)", (id) => teams.updateMemberRole(id, UUID, "Lead")],
  ["teams.updateMemberRole(user)", (id) => teams.updateMemberRole(UUID, id, "Lead")],
  ["teams.removeMember(team)", (id) => teams.removeMember(id, UUID)],
  ["teams.removeMember(user)", (id) => teams.removeMember(UUID, id)],
  ["roleAssignments.remove", (id) => roleAssignments.remove(id)],
];

describe("HR service wrappers: path ids", () => {
  const cases = PATH_CALLS.flatMap(([name, call]) => BAD_IDS.map((id) => [name, JSON.stringify(id) ?? "undefined", call, id]));
  it.each(cases)("%s rejects id %s without sending a request", async (_name, _label, call, id) => {
    await expect(call(id)).rejects.toMatchObject({ code: "BAD_ID" });
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("accepts a real UUID unchanged", async () => {
    await users.reactivate(UUID);
    expect(apiClient).toHaveBeenCalledWith(`/api/users/${UUID}/reactivate`, { method: "PATCH" });
  });

  it("covers every exported wrapper in the case table", () => {
    const tabled = new Set(CASES.map(([name]) => name.replace(/\(.*$/, "")));
    for (const [modName, mod] of Object.entries({ users, roles, branches, teams, roleAssignments })) {
      for (const fn of Object.keys(mod)) expect(tabled.has(`${modName}.${fn}`)).toBe(true);
    }
  });
});

describe("HR service wrappers", () => {
  it.each(CASES)("%s calls apiClient with the right path and options", async (_name, call, path, options) => {
    await call();
    expect(apiClient).toHaveBeenCalledTimes(1);
    expect(apiClient).toHaveBeenCalledWith(path, options);
  });

  it("returns the apiClient promise result", async () => {
    await expect(users.list()).resolves.toBe("ok");
  });

  it("a stray method in options cannot override the wrapper's method", async () => {
    await users.remove("u1", { method: "GET" });
    expect(apiClient).toHaveBeenCalledWith("/api/users/u1", { method: "DELETE" });
  });

  it("a read cannot be turned into a write, and only signal/abortKey are forwarded", async () => {
    await users.get("u1", { method: "DELETE", body: { x: 1 }, headers: { Authorization: "Bearer evil" }, skipAuthRedirect: true, signal: "S" });
    expect(apiClient).toHaveBeenCalledWith("/api/users/u1", { method: "GET", signal: "S" });
  });

  it("a create cannot be turned into another method", async () => {
    await teams.create({ a: 1 }, { method: "DELETE", headers: { X: "y" } });
    expect(apiClient).toHaveBeenCalledWith("/api/teams", { method: "POST", body: { a: 1 } });
  });

  it("a stray body in options cannot override the wrapper's body", async () => {
    await roles.setPermissions("r1", ["a:b"], { body: { evil: true } });
    expect(apiClient).toHaveBeenCalledWith("/api/roles/r1/permissions", {
      method: "PUT",
      body: { permissionSlugs: ["a:b"] },
    });
  });
});
