import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { makeStore } from "../../../store";
import * as authApi from "../../../services/api/auth";
import ForgotPassword from "./ForgotPassword";
import SetPassword from "./SetPassword";
import { generateTemporaryPassword } from "../../hr/components/ResetPasswordDialog";

const renderPage = (ui, path = "/") =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </Provider>,
  );

describe("Forgot password (admin-assisted)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("sends the request to the API and shows the server's neutral answer", async () => {
    const spy = vi
      .spyOn(authApi, "forgotPassword")
      .mockResolvedValue({ success: true, message: "Your company administrator has been notified." });
    renderPage(<ForgotPassword />);
    fireEvent.change(screen.getByPlaceholderText("name@company.com"), { target: { value: " a@acme.com " } });
    fireEvent.click(screen.getByRole("button", { name: /request password reset/i }));
    await screen.findByText("Your company administrator has been notified.");
    expect(spy).toHaveBeenCalledWith({ email: "a@acme.com" }, expect.anything());
  });

  it("shows the error when the request is refused (e.g. rate limited)", async () => {
    vi.spyOn(authApi, "forgotPassword").mockRejectedValue(
      Object.assign(new Error("Too many reset requests"), { status: 429 }),
    );
    renderPage(<ForgotPassword />);
    fireEvent.change(screen.getByPlaceholderText("name@company.com"), { target: { value: "a@acme.com" } });
    fireEvent.click(screen.getByRole("button", { name: /request password reset/i }));
    await screen.findByText("Too many reset requests");
  });
});

describe("Set password link (owner invite)", () => {
  beforeEach(() => vi.restoreAllMocks());

  const fill = (pw, confirm) => {
    const [a, b] = document.querySelectorAll("input[type=password]");
    fireEvent.change(a, { target: { value: pw } });
    fireEvent.change(b, { target: { value: confirm } });
    fireEvent.click(screen.getByRole("button", { name: /save password/i }));
  };

  it("redeems the token and points the user to sign in", async () => {
    const spy = vi.spyOn(authApi, "setPassword").mockResolvedValue({ success: true });
    renderPage(<SetPassword />, "/set-password?token=abc.def");
    fill("OwnerPass#1", "OwnerPass#1");
    await screen.findByText("Password saved");
    expect(spy).toHaveBeenCalledWith({ token: "abc.def", password: "OwnerPass#1" }, expect.anything());
    expect(screen.getByRole("link", { name: /go to sign in/i })).toBeTruthy();
  });

  it("checks the confirmation before calling the API", async () => {
    const spy = vi.spyOn(authApi, "setPassword");
    renderPage(<SetPassword />, "/set-password?token=abc");
    fill("OwnerPass#1", "Different#2");
    await screen.findByText("The two passwords do not match.");
    expect(spy).not.toHaveBeenCalled();
  });

  it("shows the server error for a used or expired link", async () => {
    vi.spyOn(authApi, "setPassword").mockRejectedValue(new Error("This set-password link has already been used or has expired"));
    renderPage(<SetPassword />, "/set-password?token=old");
    fill("OwnerPass#1", "OwnerPass#1");
    await screen.findByText("This set-password link has already been used or has expired");
  });

  it("disables the form when the link has no token", async () => {
    renderPage(<SetPassword />, "/set-password");
    await waitFor(() => expect(screen.getByRole("button", { name: /save password/i }).disabled).toBe(true));
  });
});

describe("generateTemporaryPassword", () => {
  it("makes readable 12-character passwords without look-alike characters", () => {
    const pw = generateTemporaryPassword();
    expect(pw).toHaveLength(12);
    expect(pw).not.toMatch(/[0O1lI]/);
    expect(generateTemporaryPassword()).not.toBe(pw);
  });
});
