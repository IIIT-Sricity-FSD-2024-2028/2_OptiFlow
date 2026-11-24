import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({ apiClient: vi.fn().mockResolvedValue({ ok: true }) }));

import { apiClient } from "./client";
import * as authApi from "./auth";

beforeEach(() => apiClient.mockClear());

describe("auth service", () => {
  it("login posts credentials and forwards options", async () => {
    const signal = new AbortController().signal;
    await authApi.login({ email: "a@b.c", password: "x" }, { signal });
    expect(apiClient).toHaveBeenCalledWith("/auth/login", {
      signal,
      method: "POST",
      body: { email: "a@b.c", password: "x" },
    });
  });

  it("uses the platform routes for the platform calls", async () => {
    await authApi.platformLogin({ email: "a@b.c", password: "x" });
    await authApi.getPlatformMe();
    expect(apiClient.mock.calls[0][0]).toBe("/platform/auth/login");
    expect(apiClient.mock.calls[1][0]).toBe("/platform/auth/me");
  });

  it("platform logout never redirects on 401", async () => {
    await authApi.platformLogout();
    expect(apiClient.mock.calls[0][1]).toMatchObject({ method: "POST", skipAuthRedirect: true });
  });
});