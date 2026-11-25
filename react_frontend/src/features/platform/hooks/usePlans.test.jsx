import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { ApiError } from "../../../services/api/client";
import * as platformApi from "../../../services/api/platform";
import { makeStore } from "../../../store";
import { usePlans } from "./usePlans";

const BASIC = { id: "p1", name: "Basic", isActive: true };
const PRO = { id: "p2", name: "Pro", isActive: true };

afterEach(() => vi.restoreAllMocks());

function setup() {
  const store = makeStore();
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(() => usePlans(), { wrapper }) };
}

const form = (over = {}) => ({
  name: "  Growth ",
  maxUsers: "50",
  maxBranches: "5",
  maxActiveProcessTemplates: "10",
  maxComplianceRules: "20",
  auditLogRetentionDays: "180",
  unlimitedUsers: false,
  unlimitedBranches: false,
  unlimitedTemplates: false,
  unlimitedRules: false,
  ...over,
});

describe("usePlans", () => {
  it("is loading first, then returns the plans", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [BASIC, PRO] });
    const { result } = setup();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.plans).toHaveLength(2));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("exposes a fetch failure as a message string", async () => {
    vi.spyOn(platformApi, "listPlans").mockRejectedValue(new ApiError("Boom", { status: 500 }));
    const { result } = setup();
    await waitFor(() => expect(result.current.error).toBe("Boom"));
    expect(result.current.loading).toBe(false);
  });

  it("savePlan creates with a trimmed, shaped payload and adds it without refetching", async () => {
    const list = vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [BASIC] });
    const create = vi.spyOn(platformApi, "createPlan").mockResolvedValue({ id: "p9", name: "Growth", isActive: true });
    const { result } = setup();
    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    await act(() => result.current.savePlan(form({ unlimitedUsers: true })));
    expect(create.mock.calls[0][0]).toEqual({
      name: "Growth",
      maxUsers: null,
      maxBranches: 5,
      maxActiveProcessTemplates: 10,
      maxComplianceRules: 20,
      auditLogRetentionDays: 180,
    });
    expect(result.current.plans.map((p) => p.name)).toEqual(["Basic", "Growth"]);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("savePlan with an id updates that plan", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [BASIC] });
    const update = vi.spyOn(platformApi, "updatePlan").mockResolvedValue({ ...BASIC, name: "Basic+" });
    const { result } = setup();
    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    await act(() => result.current.savePlan(form({ name: "Basic+" }), "p1"));
    expect(update.mock.calls[0][0]).toBe("p1");
    expect(result.current.plans[0].name).toBe("Basic+");
  });

  it("a failed save throws a plain error with a message", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [BASIC] });
    vi.spyOn(platformApi, "createPlan").mockRejectedValue(new ApiError("Name taken", { status: 409 }));
    const { result } = setup();
    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    await expect(act(() => result.current.savePlan(form()))).rejects.toMatchObject({ message: "Name taken" });
  });

  it("setPlanActiveStatus archives a plan", async () => {
    vi.spyOn(platformApi, "listPlans").mockResolvedValue({ items: [BASIC] });
    const update = vi.spyOn(platformApi, "updatePlan").mockResolvedValue({ ...BASIC, isActive: false });
    const { result } = setup();
    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    await act(() => result.current.setPlanActiveStatus("p1", false));
    expect(update).toHaveBeenCalledWith("p1", { isActive: false }, expect.anything());
    expect(result.current.plans[0].isActive).toBe(false);
  });
});