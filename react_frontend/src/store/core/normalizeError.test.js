import { describe, it, expect } from "vitest";
import { ApiError } from "../../services/api/client";
import { normalizeError } from "./normalizeError";

describe("normalizeError", () => {
  it("keeps message, status, code and details of an ApiError", () => {
    const err = new ApiError("Blocked by compliance", {
      status: 403,
      code: "COMPLIANCE_BLOCK",
      details: [{ ruleId: "r1", title: "Evidence missing" }],
    });
    expect(normalizeError(err)).toEqual({
      message: "Blocked by compliance",
      status: 403,
      code: "COMPLIANCE_BLOCK",
      details: [{ ruleId: "r1", title: "Evidence missing" }],
    });
  });

  it("drops the raw response body (data)", () => {
    const err = new ApiError("Nope", { status: 400, data: { huge: "body" } });
    expect(normalizeError(err)).not.toHaveProperty("data");
  });

  it("returns a plain object that survives JSON", () => {
    const out = normalizeError(new ApiError("x", { status: 500, code: "BOOM", details: { a: 1 } }));
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });

  it("keeps the client's own codes so aborts stay detectable", () => {
    for (const code of ["ABORTED", "TIMEOUT", "NETWORK_ERROR"]) {
      expect(normalizeError(new ApiError("x", { code })).code).toBe(code);
    }
  });

  it("gives null for a missing code and details", () => {
    expect(normalizeError(new ApiError("x", { status: 404 }))).toEqual({
      message: "x", status: 404, code: null, details: null,
    });
  });

  it("handles a normal Error", () => {
    expect(normalizeError(new TypeError("undefined is not a function"))).toEqual({
      message: "undefined is not a function", status: 0, code: "UNKNOWN_ERROR", details: null,
    });
  });

  it("handles a thrown string, null and undefined", () => {
    expect(normalizeError("plain text").message).toBe("plain text");
    expect(normalizeError(null).message).toBe("Something went wrong. Please try again.");
    expect(normalizeError(undefined).code).toBe("UNKNOWN_ERROR");
  });
});