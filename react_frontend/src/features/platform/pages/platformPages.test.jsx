import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as platformApi from "../../../services/api/platform";
import { makeStore } from "../../../store";
import Dashboard from "./Dashboard";
import CompanyDetail from "./CompanyDetail";
import { SubscriptionAssignModal } from "../components/subscriptions/SubscriptionAssignModal";
import { SupportGrantModal } from "../components/support/SupportGrantModal";
import { CompanyActivityTab } from "../components/detail/CompanyActivityTab";
import { CompanySubscriptionTab } from "../components/detail/CompanySubscriptionTab";

afterEach(() => vi.restoreAllMocks());

function renderWith(ui, { route = "/", path = "*", store = makeStore() } = {}) {
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, user: userEvent.setup() };
}

const COMPANY = {
  id: "c1",
  legalName: "Acme Ltd",
  status: "Active",
  users: [],
  branches: [],
  subscriptions: [],
  supportAccesses: [],
};

describe("Dashboard", () => {
  it("loads metrics from the store and refreshes on demand", async () => {
    const metrics = vi.spyOn(platformApi, "getMetrics").mockResolvedValue({ companyCounts: { total: 7, active: 5 } });
    const { user } = renderWith(<Dashboard />);
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(metrics).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /refresh metrics/i }));
    await waitFor(() => expect(metrics).toHaveBeenCalledTimes(2));
  });

  it("shows the server's message and retries", async () => {
    const metrics = vi
      .spyOn(platformApi, "getMetrics")
      .mockRejectedValueOnce(new Error("Metrics down"))
      .mockResolvedValue({ companyCounts: { total: 3 } });
    const { user } = renderWith(<Dashboard />);
    expect(await screen.findByText("Metrics down")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(metrics).toHaveBeenCalledTimes(2);
  });

  it("reloads by itself after a platform write made the numbers stale", async () => {
    const metrics = vi.spyOn(platformApi, "getMetrics").mockResolvedValue({ companyCounts: { total: 1 } });
    vi.spyOn(platformApi, "updateCompany").mockResolvedValue({ id: "c1" });
    const { store } = renderWith(<Dashboard />);
    await waitFor(() => expect(metrics).toHaveBeenCalledTimes(1));
    const { updateCompany } = await import("../../../store/platformCompanies");
    await store.dispatch(updateCompany({ id: "c1", body: { status: "Closed" } }));
    await waitFor(() => expect(metrics).toHaveBeenCalledTimes(2));
  });
});

describe("CompanyDetail", () => {
  const open = (store) => renderWith(<CompanyDetail />, { route: "/platform/companies/c1", path: "/platform/companies/:id", store });

  it("loads the company and shows the four tabs, including Support", async () => {
    const get = vi.spyOn(platformApi, "getCompany").mockResolvedValue(COMPANY);
    open();
    expect(await screen.findByRole("heading", { name: "Acme Ltd" })).toBeInTheDocument();
    expect(get.mock.calls[0][0]).toBe("c1");
    for (const tab of ["Overview", "Subscription", "Support", "Activity"]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
  });

  it("shows the error and a way back when the company cannot be loaded", async () => {
    vi.spyOn(platformApi, "getCompany").mockRejectedValue(new Error("Company not found"));
    open();
    expect(await screen.findByText(/company not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to companies/i })).toBeInTheDocument();
  });

  it("suspends the company and shows the new status without a page reload", async () => {
    const get = vi
      .spyOn(platformApi, "getCompany")
      .mockResolvedValueOnce(COMPANY)
      .mockResolvedValue({ ...COMPANY, status: "Suspended" });
    const update = vi.spyOn(platformApi, "updateCompany").mockResolvedValue({ ...COMPANY, status: "Suspended" });
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { value: { ...original, reload }, writable: true });
    const { user } = open();
    await user.click(await screen.findByRole("button", { name: /suspend/i }));
    await user.click(screen.getByRole("button", { name: /confirm suspended/i }));
    expect(update.mock.calls[0].slice(0, 2)).toEqual(["c1", { status: "Suspended" }]);
    expect(await screen.findByRole("button", { name: /reactivate/i })).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
    Object.defineProperty(window, "location", { value: original, writable: true });
  });

  it("keeps the dialog open and shows the error when the status change fails", async () => {
    vi.spyOn(platformApi, "getCompany").mockResolvedValue(COMPANY);
    vi.spyOn(platformApi, "updateCompany").mockRejectedValue(new Error("Transition not allowed"));
    const { user } = open();
    await user.click(await screen.findByRole("button", { name: /^close$/i }));
    await user.click(screen.getByRole("button", { name: /confirm closed/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /confirm closed/i })).toBeEnabled());
    expect(screen.getByRole("heading", { name: "Acme Ltd" })).toBeInTheDocument();
  });

  it("grants support access from the Support tab and the company reloads", async () => {
    const get = vi
      .spyOn(platformApi, "getCompany")
      .mockResolvedValueOnce(COMPANY)
      .mockResolvedValue({
        ...COMPANY,
        supportAccesses: [{ id: "g1", expiresAt: new Date(Date.now() + 3600e3).toISOString(), adminUser: { fullName: "Sam Admin", email: "sam@x.io" } }],
      });
    const create = vi.spyOn(platformApi, "createSupportGrant").mockResolvedValue({ id: "g1" });
    const { user } = open();
    await user.click(await screen.findByRole("button", { name: "Support" }));
    await user.click(screen.getByRole("button", { name: /grant support access/i }));
    await user.type(screen.getByRole("textbox"), "Investigating a stuck workflow");
    await user.click(screen.getByRole("button", { name: /^grant access$/i }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ companyId: "c1", reason: "Investigating a stuck workflow" });
    expect(await screen.findByText("Sam Admin")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe("SubscriptionAssignModal", () => {
  it("offers only open companies with no live subscription, and only active plans", async () => {
    vi.spyOn(platformApi, "listCompanies").mockResolvedValue({
      items: [
        { id: "c1", legalName: "Free Co", status: "Active", subscriptions: [] },
        { id: "c2", legalName: "Busy Co", status: "Active", subscriptions: [{ status: "Active" }] },
        { id: "c3", legalName: "Gone Co", status: "Closed", subscriptions: [] },
        { id: "c4", legalName: "Old Co", status: "Active", subscriptions: [{ status: "Cancelled" }] },
      ],
      total: 4,
    });
    vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [{ id: "p1", name: "Basic", isActive: true }, { id: "p2", name: "Legacy", isActive: false }] });
    const onConfirm = vi.fn().mockResolvedValue();
    const { user } = renderWith(<SubscriptionAssignModal isOpen onClose={() => {}} onConfirm={onConfirm} />);
    const [companySelect, planSelect] = await screen.findAllByRole("combobox");
    expect(within(companySelect).getAllByRole("option").map((o) => o.textContent)).toEqual(["Free Co", "Old Co"]);
    expect(within(planSelect).getAllByRole("option").map((o) => o.textContent)).toEqual(["Basic"]);
    await user.click(screen.getByRole("button", { name: /^assign$/i }));
    expect(onConfirm).toHaveBeenCalledWith({ companyId: "c1", planId: "p1", billingCycle: "Monthly", status: "Active" });
  });

  it("says so when companies or plans cannot be loaded", async () => {
    vi.spyOn(platformApi, "listCompanies").mockRejectedValue(new Error("down"));
    vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [] });
    renderWith(<SubscriptionAssignModal isOpen onClose={() => {}} onConfirm={() => {}} />);
    expect(await screen.findByText(/failed to load eligible companies or plans/i)).toBeInTheDocument();
  });

  it("does not load anything while closed", () => {
    const companies = vi.spyOn(platformApi, "listCompanies").mockResolvedValue({ items: [] });
    const plans = vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [] });
    renderWith(<SubscriptionAssignModal isOpen={false} onClose={() => {}} onConfirm={() => {}} />);
    expect(companies).not.toHaveBeenCalled();
    expect(plans).not.toHaveBeenCalled();
  });
});

describe("SupportGrantModal", () => {
  it("lists open companies, defaults to the first and sends the grant", async () => {
    vi.spyOn(platformApi, "listCompanies").mockResolvedValue({
      items: [{ id: "c3", legalName: "Gone Co", status: "Closed" }, { id: "c1", legalName: "Acme", status: "Active" }],
      total: 2,
    });
    const onConfirm = vi.fn().mockResolvedValue();
    const { user } = renderWith(<SupportGrantModal isOpen onClose={() => {}} onConfirm={onConfirm} />);
    const select = await screen.findByRole("combobox");
    await waitFor(() => expect(screen.getAllByRole("option").some((o) => o.textContent === "Acme (Active)")).toBe(true));
    expect(screen.queryByRole("option", { name: /Gone Co/ })).not.toBeInTheDocument();
    expect(select).toHaveValue("c1");
    await user.type(screen.getByRole("textbox"), "Customer reported an outage");
    await user.click(screen.getByRole("button", { name: /^grant access$/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ companyId: "c1", reason: "Customer reported an outage" });
  });

  it("does not load companies when one is preselected", () => {
    const list = vi.spyOn(platformApi, "listCompanies").mockResolvedValue({ items: [] });
    renderWith(<SupportGrantModal isOpen preselectedCompanyId="c9" onClose={() => {}} onConfirm={() => {}} />);
    expect(list).not.toHaveBeenCalled();
  });
});

describe("CompanyActivityTab", () => {
  it("shows the audit trail of the company", async () => {
    const list = vi.spyOn(platformApi, "listAuditLogs").mockResolvedValue({
      items: [{ id: "l1", action: "COMPANY_SUSPENDED", createdAt: new Date().toISOString(), entityType: "Company" }],
      total: 1,
    });
    renderWith(<CompanyActivityTab company={{ id: "c1" }} />);
    expect(await screen.findByText(/COMPANY_SUSPENDED/)).toBeInTheDocument();
    expect(list.mock.calls[0][0]).toEqual({ companyId: "c1", pageSize: "20" });
  });

  it("shows an error with a retry instead of an empty list when loading fails", async () => {
    const list = vi
      .spyOn(platformApi, "listAuditLogs")
      .mockRejectedValueOnce(new Error("Audit service down"))
      .mockResolvedValue({ items: [], total: 0 });
    const { user } = renderWith(<CompanyActivityTab company={{ id: "c1" }} />);
    expect(await screen.findByText(/audit service down/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/no audit log events/i)).toBeInTheDocument();
  });
});

describe("CompanySubscriptionTab", () => {
  const sub = (status) => ({
    id: "s1",
    status,
    billingCycle: "Monthly",
    planId: "p1",
    plan: { id: "p1", name: "Basic", maxUsers: 5, maxBranches: 2, maxComplianceRules: 3, auditLogRetentionDays: 90 },
  });

  it("lets an active subscription be changed", () => {
    renderWith(<CompanySubscriptionTab company={{ id: "c1", status: "Active", subscriptions: [sub("Active")] }} />);
    expect(screen.getByRole("button", { name: /change plan/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /extend/i })).toBeEnabled();
  });

  it("locks every change on a cancelled subscription, the server refuses them", () => {
    renderWith(<CompanySubscriptionTab company={{ id: "c1", status: "Active", subscriptions: [sub("Cancelled")] }} />);
    for (const name of [/change plan/i, /status/i, /extend/i, /^cancel$/i]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });
});
