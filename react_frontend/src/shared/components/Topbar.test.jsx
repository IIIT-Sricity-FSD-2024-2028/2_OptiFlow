import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import * as notificationsApi from "../../services/api/notifications";
import { makeStore } from "../../store";
import { Topbar } from "./Topbar";

const mockUseAuth = vi.fn();
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

afterEach(() => {
  vi.restoreAllMocks();
  mockUseAuth.mockReset();
});

const setup = (user) => {
  mockUseAuth.mockReturnValue({ user, logout: vi.fn() });
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <Topbar title="Console" />
      </MemoryRouter>
    </Provider>,
  );
};

describe("Topbar notifications", () => {
  it("does not call the tenant notifications route for a platform admin, and hides the bell", async () => {
    const list = vi.spyOn(notificationsApi, "list").mockResolvedValue([]);
    setup({ id: "a1", role: "platform_admin", isPlatform: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(list).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("View notifications")).not.toBeInTheDocument();
  });

  it("still loads notifications and shows the bell for a tenant user", async () => {
    const list = vi.spyOn(notificationsApi, "list").mockResolvedValue([]);
    setup({ id: "u1", role: "owner", isPlatform: false });
    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(screen.getByLabelText("View notifications")).toBeInTheDocument();
  });
});
