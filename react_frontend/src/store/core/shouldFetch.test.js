import { describe, it, expect } from "vitest";
import { queryKeyOf, shouldFetch } from "./shouldFetch";

const NOW = 1_000_000;
const slice = (over = {}) => ({ status: "succeeded", queryKey: "null", loadedAt: NOW - 10_000, ...over });

describe("queryKeyOf", () => {
  it("ignores `force`, keeps the rest", () => {
    expect(queryKeyOf({ force: true })).toBe(queryKeyOf(undefined));
    expect(queryKeyOf({ page: 2, force: true })).toBe(queryKeyOf({ page: 2 }));
    expect(queryKeyOf({ page: 2 })).not.toBe(queryKeyOf({ page: 3 }));
  });
  it("handles no argument and primitives", () => {
    expect(queryKeyOf(undefined)).toBe("null");
    expect(queryKeyOf({})).toBe("null");
    expect(queryKeyOf({ a: 1, b: 2 })).toBe(queryKeyOf({ b: 2, a: 1 }));
    expect(queryKeyOf(7)).toBe("7");
  });
});

describe("shouldFetch", () => {
  it("skips fresh data for the same query", () => {
    expect(shouldFetch(slice(), undefined, { now: NOW })).toBe(false);
  });
  it("fetches when the data is older than the window", () => {
    expect(shouldFetch(slice({ loadedAt: NOW - 61_000 }), undefined, { now: NOW })).toBe(true);
  });
  it("fetches when the query changed, even if fresh", () => {
    expect(shouldFetch(slice(), { page: 2 }, { now: NOW })).toBe(true);
  });
  it("fetches when nothing was loaded", () => {
    expect(shouldFetch(slice({ queryKey: null, loadedAt: null, status: "idle" }), undefined, { now: NOW })).toBe(true);
  });
  it("skips while the same query is loading", () => {
    expect(shouldFetch(slice({ status: "loading", loadedAt: null }), undefined, { now: NOW })).toBe(false);
  });
  it("force fetches fresh data, but not while the same query is loading", () => {
    expect(shouldFetch(slice(), { force: true }, { now: NOW })).toBe(true);
    expect(shouldFetch(slice({ status: "loading" }), { force: true }, { now: NOW })).toBe(false);
  });
});
