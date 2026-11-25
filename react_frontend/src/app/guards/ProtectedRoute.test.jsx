import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

let mockAuth;
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));

import { ProtectedRoute } from "./ProtectedRoute";

function setup(user, props = {}) {
  mockAuth = { user, loading: false, sessionNotice: null };
  render(
    <MemoryRouter initialEntries={["/executive/dashboard"]}>
      <Routes>
        <Route element={<ProtectedRoute {...props} />}>
          <Route path="/executive/dashboard" element={<div>dashboard</div>} />
        </Route>
        <Route path="/change-password" element={<div>change password page</div>} />
        <Route path="/platform/dashboard" element={<div>platform home</div>} />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute first-login gate", () => {
  it("sends a company user with a temporary password to the change-password page", () => {
    setup({ id: "u1", role: "executive", mustChangePassword: true });
    expect(screen.getByText("change password page")).toBeInTheDocument();
    expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
  });

  it("lets a user who has already changed it through", () => {
    setup({ id: "u1", role: "executive", mustChangePassword: false }, { allowedRoles: ["executive"] });
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("sends a platform administrator with a temporary password there too", () => {
    setup({ id: "a1", role: "platform_admin", isPlatform: true, mustChangePassword: true }, { isPlatform: true });
    expect(screen.getByText("change password page")).toBeInTheDocument();
  });

  it("lets a platform administrator who has changed it reach the platform routes", () => {
    setup({ id: "a1", role: "platform_admin", isPlatform: true, mustChangePassword: false }, { isPlatform: true });
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("still sends a signed-out visitor to login", () => {
    setup(null);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });
});
