import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "../../services/api/client";
import * as authApi from "../../services/api/auth";
import { getToken, isPlatformSession, setSession } from "../../services/auth/session";
import { makeStore } from "../index";
import { initialState } from "./slice";
import {
  login,
  platformLogin,
  registerCompany,
  restoreSession,
  logout,
} from "./thunks";

const apiError = (status, message = "Nope", code = null) => new ApiError(message, { status, code });

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("login", () => {
  it("stores the session and returns the user, never the token", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({
      token: "secret-token",
      role: "hr",
      user: { id: 1, name: "Asha" },
    });
    const action = await makeStore().dispatch(login({ email: "a@b.c", password: "x" }));
    expect(action.type).toBe("auth/login/fulfilled");
    expect(action.payload).toEqual({ user: { id: 1, name: "Asha", role: "hr", isPlatform: false } });
    expect(JSON.stringify(action.payload)).not.toContain("secret-token");
    expect(getToken()).toBe("secret-token");
    expect(isPlatformSession()).toBe(false);
  });

  it("falls back to user.role when the response has no top-level role", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({ token: "T", user: { id: 2, role: "pm" } });
    const action = await makeStore().dispatch(login({}));
    expect(action.payload.user.role).toBe("pm");
  });

  it("passes the credentials and an abort signal to the service", async () => {
    const spy = vi.spyOn(authApi, "login").mockResolvedValue({ token: "T", user: {} });
    await makeStore().dispatch(login({ email: "a@b.c", password: "x" }));
    expect(spy.mock.calls[0][0]).toEqual({ email: "a@b.c", password: "x" });
    expect(spy.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("a failed login leaves no session and keeps the normalised error", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(apiError(401, "Invalid credentials", "BAD_LOGIN"));
    const action = await makeStore().dispatch(login({}));
    expect(action.type).toBe("auth/login/rejected");
    expect(action.payload).toMatchObject({ message: "Invalid credentials", status: 401, code: "BAD_LOGIN" });
    expect(getToken()).toBeNull();
  });
});

describe("platformLogin", () => {
  it("sets the platform flag and the platform_admin role (adminUser)", async () => {
    vi.spyOn(authApi, "platformLogin").mockResolvedValue({
      token: "PT",
      adminUser: { id: 9, email: "root@x.y" },
    });
    const action = await makeStore().dispatch(platformLogin({ email: "root@x.y", password: "x" }));
    expect(action.payload).toEqual({
      user: { id: 9, email: "root@x.y", role: "platform_admin", isPlatform: true },
    });
    expect(getToken()).toBe("PT");
    expect(isPlatformSession()).toBe(true);
  });

  it("falls back to response.user when there is no adminUser", async () => {
    vi.spyOn(authApi, "platformLogin").mockResolvedValue({ token: "PT", user: { id: 3 } });
    const action = await makeStore().dispatch(platformLogin({}));
    expect(action.payload.user).toEqual({ id: 3, role: "platform_admin", isPlatform: true });
  });

  it("a failed platform login leaves no session", async () => {
    vi.spyOn(authApi, "platformLogin").mockRejectedValue(apiError(401));
    const action = await makeStore().dispatch(platformLogin({}));
    expect(action.type).toBe("auth/platformLogin/rejected");
    expect(getToken()).toBeNull();
  });
});

describe("registerCompany", () => {
  it("keeps the token but returns null (the user is not signed in)", async () => {
    vi.spyOn(authApi, "registerCompany").mockResolvedValue({ token: "RT", user: { id: 5 } });
    const action = await makeStore().dispatch(registerCompany({ companyLegalName: "Acme" }));
    expect(action.type).toBe("auth/registerCompany/fulfilled");
    expect(action.payload).toBeNull();
    expect(getToken()).toBe("RT");
    expect(isPlatformSession()).toBe(false);
  });

  it("stores nothing when the response has no token", async () => {
    vi.spyOn(authApi, "registerCompany").mockResolvedValue({});
    await makeStore().dispatch(registerCompany({}));
    expect(getToken()).toBeNull();
  });

  it("a failed registration keeps the server message", async () => {
    vi.spyOn(authApi, "registerCompany").mockRejectedValue(apiError(409, "Email already used", "CONFLICT"));
    const action = await makeStore().dispatch(registerCompany({}));
    expect(action.payload).toMatchObject({ message: "Email already used", status: 409 });
    expect(getToken()).toBeNull();
  });
});

describe("restoreSession", () => {
  it("with no token returns user null and makes no request", async () => {
    const me = vi.spyOn(authApi, "getMe");
    const pme = vi.spyOn(authApi, "getPlatformMe");
    const action = await makeStore().dispatch(restoreSession());
    expect(action.payload).toEqual({ user: null });
    expect(me).not.toHaveBeenCalled();
    expect(pme).not.toHaveBeenCalled();
  });

  it("tenant token: calls /auth/me, unwraps `.user`, reads roleSlug", async () => {
    setSession("T", false);
    const me = vi.spyOn(authApi, "getMe").mockResolvedValue({ user: { id: 1, roleSlug: "team_leader" } });
    const pme = vi.spyOn(authApi, "getPlatformMe");
    const action = await makeStore().dispatch(restoreSession());
    expect(me).toHaveBeenCalledTimes(1);
    expect(pme).not.toHaveBeenCalled();
    expect(action.payload).toEqual({
      user: { id: 1, roleSlug: "team_leader", role: "team_leader", isPlatform: false },
    });
  });

  it("tenant token: prefers `role` over `roleSlug`, accepts an unwrapped response", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockResolvedValue({ id: 2, role: "hr", roleSlug: "other" });
    const action = await makeStore().dispatch(restoreSession());
    expect(action.payload.user).toMatchObject({ id: 2, role: "hr", isPlatform: false });
  });

  it("platform token: calls /platform/auth/me and forces platform_admin", async () => {
    setSession("PT", true);
    const me = vi.spyOn(authApi, "getMe");
    const pme = vi.spyOn(authApi, "getPlatformMe").mockResolvedValue({ id: 9, email: "root@x.y" });
    const action = await makeStore().dispatch(restoreSession());
    expect(pme).toHaveBeenCalledTimes(1);
    expect(me).not.toHaveBeenCalled();
    expect(action.payload.user).toEqual({
      id: 9, email: "root@x.y", role: "platform_admin", isPlatform: true,
    });
  });

  it("a failed restore clears the session and rejects with the status", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockRejectedValue(apiError(401, "Expired"));
    const action = await makeStore().dispatch(restoreSession());
    expect(action.type).toBe("auth/restoreSession/rejected");
    expect(action.payload).toMatchObject({ status: 401 });
    expect(getToken()).toBeNull();
    expect(isPlatformSession()).toBe(false);
  });

  it("a 402 rejects with status 402 (plan expired) and clears the session", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockRejectedValue(apiError(402, "Plan inactive"));
    const action = await makeStore().dispatch(restoreSession());
    expect(action.payload.status).toBe(402);
    expect(getToken()).toBeNull();
  });

  it("is skipped once the session has been initialised", async () => {
    setSession("T", false);
    const me = vi.spyOn(authApi, "getMe").mockResolvedValue({ id: 1 });
    const store = makeStore({ auth: { ...initialState(), initialized: true } });
    const result = await store.dispatch(restoreSession());
    expect(me).not.toHaveBeenCalled();
    expect(result.meta.condition).toBe(true);
  });

  it("is skipped while a restore is already running (StrictMode double effect)", async () => {
    setSession("T", false);
    const me = vi.spyOn(authApi, "getMe").mockResolvedValue({ id: 1 });
    const store = makeStore({ auth: { ...initialState(), status: "loading" } });
    const result = await store.dispatch(restoreSession());
    expect(me).not.toHaveBeenCalled();
    expect(result.meta.condition).toBe(true);
  });
});

describe("logout", () => {
  it("platform session: calls the API with the token still present, then clears it", async () => {
    setSession("PT", true);
    let tokenSeenByApi = null;
    const spy = vi.spyOn(authApi, "platformLogout").mockImplementation(async () => {
      tokenSeenByApi = getToken();
      return null;
    });
    await makeStore().dispatch(logout());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(tokenSeenByApi).toBe("PT");
    expect(getToken()).toBeNull();
    expect(isPlatformSession()).toBe(false);
  });

  it("tenant session: makes no API call, just clears the session", async () => {
    setSession("T", false);
    const spy = vi.spyOn(authApi, "platformLogout");
    const action = await makeStore().dispatch(logout());
    expect(action.type).toBe("auth/logout/fulfilled");
    expect(spy).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it("decides from the signed-in user when the session flag is missing", async () => {
    const spy = vi.spyOn(authApi, "platformLogout").mockResolvedValue(null);
    const store = makeStore({
      auth: { ...initialState(), user: { id: 9, role: "platform_admin", isPlatform: true } },
    });
    await store.dispatch(logout());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("a failing platform logout call is logged and still signs you out", async () => {
    setSession("PT", true);
    vi.spyOn(authApi, "platformLogout").mockRejectedValue(apiError(500, "Server down"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const action = await makeStore().dispatch(logout());
    expect(action.type).toBe("auth/logout/fulfilled");
    expect(logged).toHaveBeenCalled();
    expect(getToken()).toBeNull();
  });

  it("dispatches resetStore: the user and other slices go back to their start", async () => {
    setSession("T", false);
    const store = makeStore({
      auth: { ...initialState(), user: { id: 1, role: "hr", isPlatform: false }, initialized: true },
      users: { status: "succeeded", error: null, loadedAt: 123, mutations: {} },
    });
    await store.dispatch(logout());
    const state = store.getState();
    expect(state.auth.user).toBeNull();
    expect(state.users.status).toBe("idle");
    expect(state.users.loadedAt).toBeNull();
  });
});
