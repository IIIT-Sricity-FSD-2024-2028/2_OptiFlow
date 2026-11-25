import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../../../services/api/client";
import * as authApi from "../../../services/api/auth";
import SetPassword from "./SetPassword";

afterEach(() => vi.restoreAllMocks());

function setup(url = "/set-password?token=tok123") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <SetPassword />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const fill = async (user, pw, confirm = pw) => {
  await user.type(screen.getByLabelText("New password"), pw);
  await user.type(screen.getByLabelText("Confirm password"), confirm);
  await user.click(screen.getByRole("button", { name: /set password/i }));
};

describe("SetPassword page", () => {
  it("says the link is incomplete when there is no token", () => {
    setup("/set-password");
    expect(screen.getByText(/link is incomplete/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });

  it("rejects a short password without calling the server", async () => {
    const spy = vi.spyOn(authApi, "setPassword");
    const user = setup();
    await fill(user, "short");
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects two different passwords", async () => {
    const spy = vi.spyOn(authApi, "setPassword");
    const user = setup();
    await fill(user, "longenough1", "longenough2");
    expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends the token and password, then offers sign in", async () => {
    const spy = vi.spyOn(authApi, "setPassword").mockResolvedValue({});
    const user = setup();
    await fill(user, "longenough1");
    expect(await screen.findByText(/password is set/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith({ token: "tok123", password: "longenough1" });
    expect(screen.getByRole("link", { name: /go to sign in/i })).toHaveAttribute("href", "/login");
  });

  it("shows the server's message when the link has expired and lets the owner retry", async () => {
    vi.spyOn(authApi, "setPassword").mockRejectedValue(new ApiError("Invite link expired", { status: 400 }));
    const user = setup();
    await fill(user, "longenough1");
    expect(await screen.findByRole("alert")).toHaveTextContent("Invite link expired");
    expect(screen.getByRole("button", { name: /set password/i })).toBeEnabled();
  });
});
