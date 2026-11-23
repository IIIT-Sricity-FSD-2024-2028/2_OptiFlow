import { describe, it, expect } from "vitest";
import { makeStore } from "../index";
import { resetStore } from "../core/resetStore";
import { initialState } from "./slice";

describe("auth slice (initial state)", () => {
  it("starts signed out and not initialised", () => {
    expect(makeStore().getState().auth).toEqual(initialState());
    expect(initialState()).toMatchObject({
      user: null,
      sessionNotice: null,
      initialized: false,
      status: "idle",
    });
  });

  it("has an idle entry for every operation", () => {
    expect(Object.keys(initialState().mutations).sort()).toEqual(
      ["login", "logout", "platformLogin", "registerCompany"],
    );
  });

  it("resetStore returns it to the initial state", () => {
    const store = makeStore({
      auth: { ...initialState(), user: { id: 1 }, initialized: true },
    });
    store.dispatch(resetStore());
    expect(store.getState().auth).toEqual(initialState());
  });
});