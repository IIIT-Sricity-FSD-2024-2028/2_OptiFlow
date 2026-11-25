import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { makeStore } from "../index";
import { initialState } from "./slice";
import { changePassword } from "./thunks";
import { AuthProvider } from "../../context/AuthContext";
import { ProtectedRoute, RoleRedirect } from "../../app/guards";
import { PATHS } from "../../app/paths";
import * as authApi from "../../services/api/auth";
import * as session from "../../services/auth/session";

const flaggedUser = { id: "u1", role: "team_member", fullName: "New Hire", mustChangePassword: true, isPlatform: false };

const storeWith = (user) => makeStore({ auth: { ...initialState(), user, initialized: true } });

function renderAt(store, path) {
  return render(
    <Provider store={store}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route element={<ProtectedRoute allowedRoles={["team_member"]} />}>
              <Route path={PATHS.COMMON.CHANGE_PASSWORD} element={<p>change-password-page</p>} />
              <Route path={PATHS.MEMBER.DASHBOARD} element={<p>member-dashboard</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </Provider>,
  );
}

describe("first-login password change", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("sends a flagged user from a dashboard to the change-password page", () => {
    renderAt(storeWith(flaggedUser), PATHS.MEMBER.DASHBOARD);
    expect(screen.getByText("change-password-page")).toBeTruthy();
  });

  it("sends a flagged user from the root to the change-password page", () => {
    renderAt(storeWith(flaggedUser), "/");
    expect(screen.getByText("change-password-page")).toBeTruthy();
  });

  it("lets a user whose password is set reach their dashboard", () => {
    renderAt(storeWith({ ...flaggedUser, mustChangePassword: false }), PATHS.MEMBER.DASHBOARD);
    expect(screen.getByText("member-dashboard")).toBeTruthy();
  });

  it("stores the fresh token and lifts the flag after a successful change", async () => {
    vi.spyOn(authApi, "changePassword").mockResolvedValue({ token: "fresh-token" });
    const setSession = vi.spyOn(session, "setSession");
    const store = storeWith(flaggedUser);
    await store.dispatch(changePassword({ currentPassword: "temp-pass1", newPassword: "my-own-pass" })).unwrap();
    expect(setSession).toHaveBeenCalledWith("fresh-token", false);
    expect(store.getState().auth.user.mustChangePassword).toBe(false);
    expect(store.getState().auth.mutations.changePassword.status).toBe("succeeded");
  });

  it("keeps the user signed in and flagged when the temporary password is wrong", async () => {
    vi.spyOn(authApi, "changePassword").mockRejectedValue(
      Object.assign(new Error("Current password is incorrect"), { status: 401 }),
    );
    const store = storeWith(flaggedUser);
    await expect(
      store.dispatch(changePassword({ currentPassword: "wrong", newPassword: "my-own-pass" })).unwrap(),
    ).rejects.toMatchObject({ message: "Current password is incorrect" });
    expect(store.getState().auth.user.mustChangePassword).toBe(true);
    expect(store.getState().auth.mutations.changePassword.status).toBe("failed");
  });
});
