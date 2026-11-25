import { describe, it, expect } from "vitest";

// Platform screens talk to the server through the store (thunks -> services/api/platform) only.
const sources = import.meta.glob(["./**/*.jsx", "./**/*.js", "!./**/*.test.*"], { query: "?raw", import: "default", eager: true });

describe("features/platform", () => {
  it("has files to check", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30);
  });

  it.each(Object.entries(sources))("%s does not call apiClient directly", (_path, source) => {
    expect(source).not.toMatch(/\bapiClient\b/);
  });
});
