import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

const mockLogin = vi.fn();
const mockPlatformLogin = vi.fn();

vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({
    login: mockLogin,
    platformLogin: mockPlatformLogin,
  }),
}));

vi.mock("../../../shared/components/Toast", () => ({
  useToast: () => ({
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({});
    mockPlatformLogin.mockResolvedValue({});
  });

  it("signs in a workspace user and switches cleanly to Platform Admin mode", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in to OfficeSync")).toBeInTheDocument();
    expect(screen.getByText("Sign in with SSO")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "pm@acme.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({ email: "pm@acme.com", password: "password123" }),
    );
    expect(mockPlatformLogin).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: /Platform Admin/i }));
    expect(screen.getByText("Platform admin sign in")).toBeInTheDocument();
    expect(screen.queryByText("Sign in with SSO")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Admin Email"));
    await user.type(screen.getByLabelText("Admin Email"), "root@optiflow.io");
    await user.click(screen.getByRole("button", { name: "Sign in as Admin" }));

    await waitFor(() =>
      expect(mockPlatformLogin).toHaveBeenCalledWith({
        email: "root@optiflow.io",
        password: "password123",
      }),
    );
  });
});
