import { afterEach, describe, expect, it, vi } from "vitest";
import * as usersApi from "../../services/api/users";
import { makeStore } from "../index";
import { fetchUsers } from "../users";

afterEach(() => vi.restoreAllMocks());

describe("signing in", () => {
  it.each(["auth/login/fulfilled", "auth/platformLogin/fulfilled"])("%s drops the previous user's HR rows", async (type) => {
    vi.spyOn(usersApi, "list").mockResolvedValue([{ id: "u1" }]);
    const store = makeStore();
    await store.dispatch(fetchUsers());
    store.dispatch({ type, payload: { user: { id: "other" } }, meta: {} });
    expect(store.getState().users).toEqual(makeStore().getState().users);
    expect(store.getState().teams).toEqual(makeStore().getState().teams);
  });
});
