import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { ApiError } from "../services/api/client";
import * as authApi from "../services/api/auth";
import { setSession, getToken } from "../services/auth/session";
import { makeStore } from "../store";
import { AuthProvider, useAuth } from "./AuthContext";

let auth; // the latest useAuth() value, for calling login / logout from the tests

function Probe() {
  auth = useAuth();
  return <p>user:{auth.user?.role ?? "none"}</p>;
}

const renderApp = ({ strict = false } = {}) => {
  const tree = (
    <Provider store={makeStore()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </Provider>
  );
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};

const deferred = () => {
  let resolve;
  const promise = new Promise((res) => (resolve = res));
  return { promise, resolve };
};

const apiError = (status, message = "Nope") => new ApiError(message, { status });

const realLocation = window.location;
beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  auth = undefined;
  // jsdom cannot navigate: replace location so `window.location.href = ...` can be observed.
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...realLocation, href: "http://localhost/" },
  });
});
afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: realLocation });
});

describe("AuthProvider facade: starting up", () => {
  it("shows nothing until the restore has finished, then the children", async () => {
    setSession("T", false);
    const d = deferred();
    vi.spyOn(authApi, "getMe").mockReturnValue(d.promise);
    renderApp();
    expect(screen.queryByText(/user:/)).toBeNull();
    await act(async () => d.resolve({ user: { id: 1, role: "hr" } }));
    expect(await screen.findByText("user:hr")).toBeInTheDocument();
  });

  it("with no saved session it renders the children signed out, without any request", async () => {
    const me = vi.spyOn(authApi, "getMe");
    renderApp();
    expect(await screen.findByText("user:none")).toBeInTheDocument();
    expect(me).not.toHaveBeenCalled();
    expect(auth.loading).toBe(false);
  });

  it("restores a tenant user from a saved session", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockResolvedValue({ user: { id: 1, roleSlug: "team_leader" } });
    renderApp();
    expect(await screen.findByText("user:team_leader")).toBeInTheDocument();
    expect(auth.user.isPlatform).toBe(false);
  });

  it("restores a platform admin from a saved platform session", async () => {
    setSession("PT", true);
    const pme = vi.spyOn(authApi, "getPlatformMe").mockResolvedValue({ id: 9 });
    renderApp();
    expect(await screen.findByText("user:platform_admin")).toBeInTheDocument();
    expect(pme).toHaveBeenCalledTimes(1);
    expect(auth.user.isPlatform).toBe(true);
  });

  it("an expired session is dropped and explained through sessionNotice", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockRejectedValue(apiError(401, "Expired"));
    renderApp();
    expect(await screen.findByText("user:none")).toBeInTheDocument();
    expect(auth.sessionNotice).toBe("session_expired");
    expect(getToken()).toBeNull();
  });

  it("an inactive plan gives the plan_expired notice", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockRejectedValue(apiError(402, "Plan inactive"));
    renderApp();
    await screen.findByText("user:none");
    expect(auth.sessionNotice).toBe("plan_expired");
  });

  it("asks the server only once under React StrictMode", async () => {
    setSession("T", false);
    const me = vi.spyOn(authApi, "getMe").mockResolvedValue({ user: { id: 1, role: "hr" } });
    renderApp({ strict: true });
    expect(await screen.findByText("user:hr")).toBeInTheDocument();
    expect(me).toHaveBeenCalledTimes(1);
  });
});

describe("AuthProvider facade: login and logout", () => {
  it("login signs the user in and keeps the page mounted", async () => {
    vi.spyOn(authApi, "login").mockResolvedValue({ token: "T", role: "pm", user: { id: 2 } });
    renderApp();
    await screen.findByText("user:none");
    await act(async () => {
      await auth.login({ email: "a@b.c", password: "x" });
    });
    expect(await screen.findByText("user:pm")).toBeInTheDocument();
    expect(getToken()).toBe("T");
  });

  it("login failure throws an error with the server message and leaves the user null", async () => {
    vi.spyOn(authApi, "login").mockRejectedValue(apiError(401, "Invalid credentials"));
    renderApp();
    await screen.findByText("user:none");
    await act(async () => {
      await expect(auth.login({})).rejects.toMatchObject({ message: "Invalid credentials", status: 401 });
    });
    expect(screen.getByText("user:none")).toBeInTheDocument();
  });

  it("platformLogin signs in a platform admin", async () => {
    vi.spyOn(authApi, "platformLogin").mockResolvedValue({ token: "PT", adminUser: { id: 9 } });
    renderApp();
    await screen.findByText("user:none");
    await act(async () => {
      await auth.platformLogin({ email: "r@x.y", password: "x" });
    });
    expect(await screen.findByText("user:platform_admin")).toBeInTheDocument();
    expect(auth.user.isPlatform).toBe(true);
  });

  it("logout (tenant) clears the session and redirects, with no platform call", async () => {
    setSession("T", false);
    vi.spyOn(authApi, "getMe").mockResolvedValue({ user: { id: 1, role: "hr" } });
    const platformLogout = vi.spyOn(authApi, "platformLogout");
    renderApp();
    await screen.findByText("user:hr");
    await act(async () => {
      await auth.logout();
    });
    expect(platformLogout).not.toHaveBeenCalled();
    expect(getToken()).toBeNull();
    expect(window.location.href).toBe("/login");
    expect(await screen.findByText("user:none")).toBeInTheDocument();
  });

  it("logout (platform) calls the platform endpoint, then redirects", async () => {
    setSession("PT", true);
    vi.spyOn(authApi, "getPlatformMe").mockResolvedValue({ id: 9 });
    const platformLogout = vi.spyOn(authApi, "platformLogout").mockResolvedValue(null);
    renderApp();
    await screen.findByText("user:platform_admin");
    await act(async () => {
      await auth.logout();
    });
    expect(platformLogout).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();
    expect(window.location.href).toBe("/login");
  });
});

describe("useAuth shape", () => {
  it("returns the same keys the old context did", async () => {
    renderApp();
    await screen.findByText("user:none");
    expect(Object.keys(auth).sort()).toEqual(
      ["loading", "login", "logout", "platformLogin", "platformLogout", "sessionNotice", "user"],
    );
  });

  it("throws outside an AuthProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useAuth must be used within an AuthProvider");
  });
});
