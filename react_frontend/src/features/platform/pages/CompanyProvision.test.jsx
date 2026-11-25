import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

    it("no longer loads plans through apiClient", () => {
    expect(source).not.toMatch(/platform\/plans/);
  });
});