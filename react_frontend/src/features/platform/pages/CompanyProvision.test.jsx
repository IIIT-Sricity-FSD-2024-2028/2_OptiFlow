import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import * as platformApi from "../../../services/api/platform";
import { makeStore } from "../../../store";
import CompanyProvision from "./CompanyProvision";
import source from "./CompanyProvision.jsx?raw";

const PLANS = {
  items: [
    { id: "p1", name: "Basic", isActive: true },
    { id: "p2", name: "Old Plan", isActive: false },
    { id: "p3", name: "Pro", isActive: true },
  ],
};

afterEach(() => vi.restoreAllMocks());

const setup = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <CompanyProvision />
      </MemoryRouter>
    </Provider>,
  );

describe("CompanyProvision plans", () => {
  it("lists only active plans and preselects the first one", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue(PLANS);
    setup();
    await waitFor(() => expect(screen.getByRole("option", { name: /basic/i })).toBeInTheDocument());
    expect(screen.getByRole("option", { name: /pro/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /old plan/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /basic/i }).selected).toBe(true);
  });

  it("shows the error text when the plans cannot be loaded", async () => {
    vi.spyOn(platformApi, "listPlans").mockRejectedValue(new Error("down"));
    setup();
    expect(await screen.findByText(/failed to load active plans tier list/i)).toBeInTheDocument();
  });

  it("no longer calls apiClient directly", () => {
    expect(source).not.toMatch(/apiClient/);
  });
});

describe("CompanyProvision owner invite", () => {
  it("has no password field: the system generates a temporary one", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue(PLANS);
    setup();
    await screen.findByRole("option", { name: /basic/i });
    expect(screen.queryByText(/initial login password/i)).not.toBeInTheDocument();
  });

  it("submits without a password and shows the temporary password once", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue(PLANS);
    const post = vi.spyOn(platformApi, "createCompany").mockResolvedValue({
      company: { id: "c1", legalName: "Acme Ltd" },
      owner: { email: "jane@acme.com" },
      subscription: { plan: { name: "Basic" } },
      temporaryPassword: "Kd7mPq2xWn4Z",
      inviteEmail: { delivered: false },
    });
    const user = userEvent.setup();
    setup();
    await screen.findByRole("option", { name: /basic/i });
    await user.type(screen.getByPlaceholderText(/acme corporation ltd/i), "Acme Ltd");
    await user.type(screen.getByPlaceholderText("e.g. Jane Doe"), "Jane Doe");
    await user.type(screen.getByPlaceholderText("e.g. jane@acme.com"), "jane@acme.com");
    await user.click(screen.getByRole("button", { name: /provision company/i }));

    await waitFor(() => expect(post).toHaveBeenCalled());
    const [body] = post.mock.calls[0];
    expect(body).not.toHaveProperty("password");
    expect(body).toMatchObject({ legalName: "Acme Ltd", ownerEmail: "jane@acme.com", planId: "p1" });
    expect(await screen.findByText("Kd7mPq2xWn4Z")).toBeInTheDocument();
    expect(screen.getByText(/must choose a new password at first sign-in/i)).toBeInTheDocument();
  });
});
