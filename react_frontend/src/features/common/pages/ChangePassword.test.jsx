import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ApiError } from "../../../services/api/client";
import * as authApi from "../../../services/api/auth";
import { getToken, isPlatformSession } from "../../../services/auth/session";

let mockAuth;
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => mockAuth }));

import ChangePassword from "./ChangePassword";

const assign = vi.fn();
const original = window.location;

beforeEach(() => {
  sessionStorage.clear();
  mockAuth = { user: { id: "u1", role: "executive", mustChangePassword: true }, logout: vi.fn() };
  Object.defineProperty(window, "location", { value: { ...original, assign }, writable: true });
});
afterEach(() => {
  vi.restoreAllMocks();
  assign.mockClear();
  Object.defineProperty(window, "location", { value: original, writable: true });
});

function setup() {
  render(
    <MemoryRouter initialEntries={["/change-password"]}>
      <Routes>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const fill = async (user, cur, next, confirm = next) => {
  await user.type(screen.getByLabelText("Temporary password"), cur);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
  await user.click(screen.getByRole("button", { name: /change password/i }));
};

describe("ChangePassword page", () => {
  it("sends a signed-out visitor to the login page", () => {
    mockAuth = { user: null, logout: vi.fn() };
    setup();
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("sends a user without a temporary password home", () => {
    mockAuth = { user: { id: "u1", mustChangePassword: false }, logout: vi.fn() };
    setup();
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("platform administrators need 10 characters, use the platform endpoint and keep a platform session", async () => {
    mockAuth = { user: { id: "a1", isPlatform: true, mustChangePassword: true }, logout: vi.fn() };
    const company = vi.spyOn(authApi, "changePassword");
    const platform = vi.spyOn(authApi, "platformChangePassword").mockResolvedValue({ token: "PTOKEN" });
    const user = setup();
    await fill(user, "Temp1234abcd", "ninechars");
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 10/i);
    expect(platform).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("New password"));
    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("New password"), "tenchars!!1");
    await user.type(screen.getByLabelText("Confirm new password"), "tenchars!!1");
    await user.click(screen.getByRole("button", { name: /change password/i }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(platform).toHaveBeenCalledWith({ currentPassword: "Temp1234abcd", newPassword: "tenchars!!1" });
    expect(company).not.toHaveBeenCalled();
    expect(getToken()).toBe("PTOKEN");
    expect(isPlatformSession()).toBe(true);
  });

  it.each([
    ["too short", "Temp1234", "short", "short", /at least 8/i],
    ["same as temporary", "Temp12345", "Temp12345", "Temp12345", /different/i],
    ["mismatch", "Temp12345", "longenough1", "longenough2", /do not match/i],
  ])("rejects a new password that is %s without calling the server", async (_n, cur, next, confirm, msg) => {
    const spy = vi.spyOn(authApi, "changePassword");
    const user = setup();
    await fill(user, cur, next, confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent(msg);
    expect(spy).not.toHaveBeenCalled();
  });

  it("changes the password, keeps the fresh token and reloads from the start page", async () => {
    const spy = vi.spyOn(authApi, "changePassword").mockResolvedValue({ token: "FRESH" });
    const user = setup();
    await fill(user, "Temp12345", "longenough1");
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(spy).toHaveBeenCalledWith({ currentPassword: "Temp12345", newPassword: "longenough1" });
    expect(getToken()).toBe("FRESH");
  });

  it("shows the server's message when the temporary password is wrong and lets the user retry", async () => {
    vi.spyOn(authApi, "changePassword").mockRejectedValue(new ApiError("Current password is incorrect", { status: 401 }));
    const user = setup();
    await fill(user, "wrongwrong", "longenough1");
    expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect");
    expect(screen.getByRole("button", { name: /change password/i })).toBeEnabled();
    expect(assign).not.toHaveBeenCalled();
  });
});
