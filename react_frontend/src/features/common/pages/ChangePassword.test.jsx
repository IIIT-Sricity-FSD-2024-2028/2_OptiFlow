import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

let mockAuth;
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../../shared/components/Toast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

import ChangePassword from "./ChangePassword";

const changePassword = vi.fn();

beforeEach(() => {
  changePassword.mockReset().mockResolvedValue(null);
  mockAuth = { user: { fullName: "Jo Doe", mustChangePassword: true }, changePassword, logout: vi.fn() };
});

function setup() {
  render(
    <MemoryRouter initialEntries={["/change-password"]}>
      <Routes>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const fill = async (user, cur, next, confirm = next) => {
  const [c, n, f] = document.querySelectorAll('input[type="password"]');
  await user.type(c, cur);
  await user.type(n, next);
  await user.type(f, confirm);
  await user.click(screen.getByRole("button", { name: /save password/i }));
};

describe("ChangePassword page", () => {
  it("sends the temporary and new password, then goes home", async () => {
    const user = setup();
    await fill(user, "Temp-Pass-1", "BrandNewPass1");
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: "Temp-Pass-1", newPassword: "BrandNewPass1" });
    expect(await screen.findByText("home")).toBeInTheDocument();
  });

  it("rejects mismatched passwords without calling the server", async () => {
    const user = setup();
    await fill(user, "Temp-Pass-1", "BrandNewPass1", "Different12345");
    expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("asks platform administrators for 10 characters", async () => {
    mockAuth.user = { fullName: "Pat", isPlatform: true, mustChangePassword: true };
    const user = setup();
    await fill(user, "Temp-Pass-1", "Short-9ch");
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 10/i);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("shows the server's message when the temporary password is wrong", async () => {
    changePassword.mockRejectedValueOnce(new Error("Current password is incorrect"));
    const user = setup();
    await fill(user, "wrong-temp", "BrandNewPass1");
    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect/i);
  });
});
