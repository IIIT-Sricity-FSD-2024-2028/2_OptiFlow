import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as authApi from "../../services/api/auth";
import { setSession } from "../../services/auth/session";
import { makeStore } from "../index";
import { initialState } from "./slice";
import {
  login,
  platformLogin,
  registerCompany,
  restoreSession,
  logout,
  selectAuthUser,
  selectAuthIsPlatform,
  selectAuthLoading,
  selectSessionNotice,
  selectRestoreStatus,
  selectRestoreError,
  selectAuthMutation,
} from "./index";

const apiError = (status, message = "Nope", code = null) => new ApiError(message, { status, code });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};
const ready = (over = {}) => makeStore({ auth: { ...initialState(), initialized: true, ...over } });

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("restoreSession reducers", () => {
  it("pending: status loading, error cleared", async () => {
    setSession("T", false);
    const d = deferred();
    vi.spyOn(authApi, "getMe").mockReturnValue(d.promise);
    const store = makeStore();
    const p = store.dispatch(restoreSession());
    expect(selectRestoreStatus(store.getState())).toBe("loading");
    expect(selectRestoreError(store.getState())).toBeNull();
    d.resolve({ id: 1 });
    await p;
  });

  it("fulfilled: user set, status succeeded, initialized true", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockResolvedValue({ user: { id: 1, role: "hr" } });
    const store = makeStore();
    await store.dispatch(restoreSession());
    const s = store.getState().auth;
    expect(s.status).toBe("succeeded");
    expect(s.user).toEqual({ id: 1, role: "hr", isPlatform: false });
    expect(s.initialized).toBe(true);
    expect(s.loadedAt).toEqual(expect.any(Number));
  });

  it("with no saved session: user stays null but the app is initialised", async () => {
    const store = makeStore();
    await store.dispatch(restoreSession());
    const s = store.getState().auth;
    expect(s.user).toBeNull();
    expect(s.initialized).toBe(true);
    expect(selectAuthLoading(store.getState())).toBe(false);
  });

  it.each([
    [401, "session_expired"],
    [402, "plan_expired"],
  ])("rejected with %i sets sessionNotice %s", async (status, notice) => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockRejectedValue(apiError(status, "Dropped"));
    const store = makeStore();
    await store.dispatch(restoreSession());
    const s = store.getState().auth;
    expect(s.status).toBe("failed");
    expect(s.user).toBeNull();
    expect(s.initialized).toBe(true);
    expect(selectSessionNotice(store.getState())).toBe(notice);
    expect(s.error).toMatchObject({ status, message: "Dropped" });
  });

  it("rejected with another status sets no notice", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockRejectedValue(apiError(500));
    const store = makeStore();
    await store.dispatch(restoreSession());
    expect(selectSessionNotice(store.getState())).toBeNull();
    expect(store.getState().auth.initialized).toBe(true);
  });
});

describe("login and platformLogin reducers", () => {
  it("login: loading while running, user only after it succeeds", async () => {
    const d = deferred();
    vi.spyOn(authApi, "login").mockReturnValue(d.promise);
    const store = ready();
    const p = store.dispatch(login({ email: "a@b.c", password: "x" }));
    expect(selectAuthMutation(store.getState(), "login").status).toBe("loading");
    expect(selectAuthUser(store.getState())).toBeNull(); // pessimistic: not yet
    d.resolve({ token: "T", role: "hr", user: { id: 1 } });
    await p;
    expect(selectAuthMutation(store.getState(), "login")).toEqual({ status: "succeeded", error: null });
    expect(selectAuthUser(store.getState())).toEqual({ id: 1, role: "hr", isPlatform: false });
  });

  it("login failure stores the error and leaves the user null", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(apiError(401, "Invalid credentials", "BAD_LOGIN"));
    const store = ready();
    await store.dispatch(login({}));
    const m = selectAuthMutation(store.getState(), "login");
    expect(m.status).toBe("failed");
    expect(m.error).toMatchObject({ message: "Invalid credentials", status: 401, code: "BAD_LOGIN" });
    expect(selectAuthUser(store.getState())).toBeNull();
  });

  it("a retry clears the previous error", async () => {
    const spy = vi.spyOn(authApi, "login").mockRejectedValueOnce(apiError(401));
    const store = ready();
    await store.dispatch(login({}));
    expect(selectAuthMutation(store.getState(), "login").error).not.toBeNull();
    const d = deferred();
    spy.mockReturnValueOnce(d.promise);
    const p = store.dispatch(login({}));
    expect(selectAuthMutation(store.getState(), "login")).toEqual({ status: "loading", error: null });
    d.resolve({ token: "T", user: {} });
    await p;
  });

  it("logging in never makes the app look like it is starting up again", async () => {
    const d = deferred();
    vi.spyOn(authApi, "login").mockReturnValue(d.promise);
    const store = ready();
    const p = store.dispatch(login({}));
    expect(selectAuthLoading(store.getState())).toBe(false); // the Login page stays mounted
    expect(selectRestoreStatus(store.getState())).toBe("idle"); // restore status untouched
    d.resolve({ token: "T", user: {} });
    await p;
  });

  it("platformLogin sets a platform user", async () => {
    vi.spyOn(authApi, "platformLogin").mockResolvedValue({ token: "PT", adminUser: { id: 9 } });
    const store = ready();
    await store.dispatch(platformLogin({}));
    expect(selectAuthUser(store.getState())).toEqual({ id: 9, role: "platform_admin", isPlatform: true });
    expect(selectAuthIsPlatform(store.getState())).toBe(true);
    expect(selectAuthMutation(store.getState(), "platformLogin").status).toBe("succeeded");
  });

  it("platformLogin failure keeps its own status separate from login", async () => {
    vi.spyOn(authApi, "platformLogin").mockRejectedValue(apiError(401, "Bad"));
    const store = ready();
    await store.dispatch(platformLogin({}));
    expect(selectAuthMutation(store.getState(), "platformLogin").status).toBe("failed");
    expect(selectAuthMutation(store.getState(), "login").status).toBe("idle");
  });
});

describe("registerCompany reducers", () => {
  it("succeeds without signing the user in", async () => {
    vi.spyOn(authApi, "registerCompany").mockResolvedValue({ token: "RT" });
    const store = ready();
    await store.dispatch(registerCompany({}));
    expect(selectAuthMutation(store.getState(), "registerCompany").status).toBe("succeeded");
    expect(selectAuthUser(store.getState())).toBeNull();
  });

  it("stores the server error on failure", async () => {
    vi.spyOn(authApi, "registerCompany").mockRejectedValue(apiError(409, "Email already used"));
    const store = ready();
    await store.dispatch(registerCompany({}));
    const m = selectAuthMutation(store.getState(), "registerCompany");
    expect(m.status).toBe("failed");
    expect(m.error.message).toBe("Email already used");
  });
});

describe("logout reducers", () => {
  it("ends with no user, other slices reset, and the app still initialised", async () => {
    setSession("T", false);
    const store = makeStore({
      auth: { ...initialState(), user: { id: 1, role: "hr", isPlatform: false }, initialized: true },
      users: { status: "succeeded", error: null, loadedAt: 123, mutations: {} },
    });
    await store.dispatch(logout());
    const state = store.getState();
    expect(selectAuthUser(state)).toBeNull();
    expect(state.users.status).toBe("idle");
    expect(selectAuthLoading(state)).toBe(false); // no blank flash before the redirect
    expect(selectAuthMutation(state, "logout").status).toBe("succeeded");
  });
});

describe("selectors", () => {
  it("selectAuthIsPlatform is false with no user, true for a platform user", () => {
    expect(selectAuthIsPlatform(makeStore().getState())).toBe(false);
    const s = ready({ user: { id: 1, isPlatform: true } });
    expect(selectAuthIsPlatform(s.getState())).toBe(true);
  });

  it("selectAuthLoading is true only before the first restore finishes", () => {
    expect(selectAuthLoading(makeStore().getState())).toBe(true);
    expect(selectAuthLoading(ready().getState())).toBe(false);
  });
});
