import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../../../services/api/client";
import * as authApi from "../../../services/api/auth";
import { getToken } from "../../../services/auth/session";
import { makeStore } from "../../../store";
import Register from "./Register";
import registerSource from "./Register.jsx?raw";

const apiError = (status, message) => new ApiError(message, { status });

function setup() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    </Provider>,
  );
  return { store, user: userEvent.setup() };
}

async function fillForm(user, over = {}) {
  const v = {
    company: "  Acme Corporation ",
    name: "Jane Doe",
    email: "Jane@Acme-Corp.com",
    password: "longenough1",
    confirm: "longenough1",
    terms: true,
    ...over,
  };
  await user.type(screen.getByPlaceholderText("Acme Corporation"), v.company);
  await user.type(screen.getByPlaceholderText("Jane Doe"), v.name);
  await user.type(screen.getByPlaceholderText("jane@company.com"), v.email);
  await user.type(screen.getByPlaceholderText("Min 8 characters"), v.password);
  await user.type(screen.getByPlaceholderText("Re-enter password"), v.confirm);
  if (v.terms) await user.click(screen.getByRole("checkbox"));
}

const submit = (user) => user.click(screen.getByRole("button", { name: /create organization workspace/i }));

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("Register page", () => {
  it("sends the trimmed, lower-cased details through the register thunk", async () => {
    const spy = vi.spyOn(authApi, "registerCompany").mockResolvedValue({ token: "RT" });
    const { user } = setup();
    await fillForm(user);
    await submit(user);
    expect(await screen.findByText("Welcome to OfficeSync")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({
      companyLegalName: "Acme Corporation",
      ownerFullName: "Jane Doe",
      ownerEmail: "jane@acme-corp.com",
      password: "longenough1",
    });
    expect(spy.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("keeps the token but does not sign the user in", async () => {
    vi.spyOn(authApi, "registerCompany").mockResolvedValue({ token: "RT", user: { id: 5 } });
    const { user, store } = setup();
    await fillForm(user);
    await submit(user);
    await screen.findByText("Welcome to OfficeSync");
    expect(getToken()).toBe("RT");
    expect(store.getState().auth.user).toBeNull();
    expect(store.getState().auth.mutations.registerCompany.status).toBe("succeeded");
  });

  it("shows the server message when registration fails", async () => {
    vi.spyOn(authApi, "registerCompany").mockRejectedValue(apiError(409, "Email already registered"));
    const { user, store } = setup();
    await fillForm(user);
    await submit(user);
    expect(await screen.findByText("Email already registered")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to OfficeSync")).toBeNull();
    expect(getToken()).toBeNull();
    expect(store.getState().auth.mutations.registerCompany.status).toBe("failed");
  });

  it("shows a busy button while the request runs", async () => {
    let release;
    vi.spyOn(authApi, "registerCompany").mockImplementation(() => new Promise((r) => (release = r)));
    const { user } = setup();
    await fillForm(user);
    await submit(user);
    const busy = await screen.findByRole("button", { name: /setting up workspace/i });
    expect(busy).toBeDisabled();
    release({ token: "RT" });
    expect(await screen.findByText("Welcome to OfficeSync")).toBeInTheDocument();
  });

  it("still blocks free webmail addresses before any request", async () => {
    const spy = vi.spyOn(authApi, "registerCompany");
    const { user } = setup();
    await fillForm(user, { email: "jane@gmail.com" });
    await submit(user);
    expect(await screen.findByText(/restricted to corporate domains/i)).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("still blocks mismatching passwords before any request", async () => {
    const spy = vi.spyOn(authApi, "registerCompany");
    const { user } = setup();
    await fillForm(user, { confirm: "different123" });
    await submit(user);
    expect((await screen.findAllByText(/passwords do not match/i)).length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it("makes no direct backend call: no apiClient or session import in the page", () => {
    expect(registerSource).not.toMatch(/apiClient|services\/api\/client|services\/auth\/session/);
  });
});
