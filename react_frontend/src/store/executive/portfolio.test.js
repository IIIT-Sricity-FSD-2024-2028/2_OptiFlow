import { describe, it, expect } from "vitest";
import reducer, {
  fetchExecutivePortfolio,
  fetchBranchPerformance,
  fetchProjectManagers,
  assignProjectManager,
  selectPortfolioSummary,
  selectPortfolioProjects,
  selectPortfolioStatus,
  selectBranchPerformance,
  selectProjectManagers,
  selectIsAssigningPm,
} from "./index";

const wrap = (executive) => ({ executive });

describe("executive slice: portfolio, branches, PM assignment", () => {
  const portfolio = {
    summary: { total: 2, on_track: 1, at_risk: 1, off_track: 0, done: 0, withoutManager: 1 },
    projects: [
      { id: "p1", name: "Alpha", health: "at_risk", projectManager: null, reasons: ["No Project Manager assigned", "1 overdue task"] },
      { id: "p2", name: "Beta", health: "on_track", projectManager: { id: "u9", fullName: "Pat" }, reasons: [] },
    ],
  };

  it("stores the portfolio on fulfilled", () => {
    let state = reducer(undefined, fetchExecutivePortfolio.pending("r1", {}));
    expect(selectPortfolioStatus(wrap(state))).toBe("loading");
    state = reducer(state, fetchExecutivePortfolio.fulfilled(portfolio, "r1", {}));
    expect(selectPortfolioStatus(wrap(state))).toBe("succeeded");
    expect(selectPortfolioSummary(wrap(state)).withoutManager).toBe(1);
    expect(selectPortfolioProjects(wrap(state))).toHaveLength(2);
  });

  it("keeps the previous data and records the error on rejected", () => {
    let state = reducer(undefined, fetchExecutivePortfolio.fulfilled(portfolio, "r1", {}));
    state = reducer(state, fetchExecutivePortfolio.rejected(null, "r2", {}, { message: "boom" }));
    expect(state.portfolio.status).toBe("failed");
    expect(state.portfolio.error).toEqual({ message: "boom" });
    expect(state.portfolio.data.projects).toHaveLength(2);
  });

  it("ignores an aborted portfolio request", () => {
    let state = reducer(undefined, fetchExecutivePortfolio.pending("r1", {}));
    state = reducer(state, fetchExecutivePortfolio.rejected(null, "r1", {}, { code: "ABORTED" }));
    expect(state.portfolio.status).toBe("loading");
  });

  it("stores branch performance and project managers as arrays", () => {
    let state = reducer(undefined, fetchBranchPerformance.fulfilled([{ id: "b1" }], "r", {}));
    state = reducer(state, fetchProjectManagers.fulfilled(null, "r"));
    expect(selectBranchPerformance(wrap(state))).toEqual([{ id: "b1" }]);
    expect(selectProjectManagers(wrap(state))).toEqual([]);
  });

  it("tracks a PM assignment and patches the portfolio row", () => {
    let state = reducer(undefined, fetchExecutivePortfolio.fulfilled(portfolio, "r1", {}));
    const arg = { projectId: "p1", projectManagerId: "u7" };
    state = reducer(state, assignProjectManager.pending("m1", arg));
    expect(selectIsAssigningPm("p1")(wrap(state))).toBe(true);
    state = reducer(
      state,
      assignProjectManager.fulfilled({ projectId: "p1", projectManager: { id: "u7", fullName: "Sam" } }, "m1", arg),
    );
    expect(selectIsAssigningPm("p1")(wrap(state))).toBe(false);
    const row = state.portfolio.data.projects.find((p) => p.id === "p1");
    expect(row.projectManager.fullName).toBe("Sam");
    expect(row.reasons).toEqual(["1 overdue task"]);
  });

  it("clears the pending flag when an assignment fails", () => {
    const arg = { projectId: "p1", projectManagerId: "u7" };
    let state = reducer(undefined, assignProjectManager.pending("m1", arg));
    state = reducer(state, assignProjectManager.rejected(null, "m1", arg, { message: "no" }));
    expect(selectIsAssigningPm("p1")(wrap(state))).toBe(false);
  });
});
