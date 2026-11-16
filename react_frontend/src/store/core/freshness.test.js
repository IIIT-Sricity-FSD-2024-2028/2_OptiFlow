import { describe, it, expect } from "vitest";
import { FRESHNESS_WINDOW_MS, isFresh } from "./freshness";

describe("isFresh", () => {
  it("is 60 seconds by default", () => {
    expect(FRESHNESS_WINDOW_MS).toBe(60000);
  });
  it("is false when never loaded", () => {
    expect(isFresh(null)).toBe(false);
  });
  it("is true just inside the window", () => {
    expect(isFresh(1000, undefined, 1000 + 59999)).toBe(true);
  });
  it("is false at and after the window", () => {
    expect(isFresh(1000, undefined, 1000 + 60000)).toBe(false);
  });
  it("accepts a per-slice override", () => {
    expect(isFresh(1000, 5000, 1000 + 6000)).toBe(false);
  });
});