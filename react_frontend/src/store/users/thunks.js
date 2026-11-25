import { createListThunks } from "../hr/listSlice";
import { createWriteThunk } from "../hr/writeCases";
import * as usersApi from "../../services/api/users";

// Call through the namespace so tests can spy on it.
// fetchUsers({ force? }): the endpoint takes no filters, so the query is never sent.
// fetchUserById(id): always reloads unless that id is already loading.
// A loaded list counts as fresh for 60 s. An HR write makes every HR list stale, so a
// plain fetch after it reloads.
const { fetchList, fetchById } = createListThunks("users", {
  list: (_query, options) => usersApi.list(options),
  get: (id, options) => usersApi.get(id, options),
});

export const fetchUsers = fetchList;
export const fetchUserById = fetchById;

// Keys in state.users.mutations, for selectUserWriteStatus / selectUserWriteError.
export const userWriteKeys = {
  create: () => "create",
  // One key per user: an update, a deactivate and a reactivate never overtake each other.
  user: (id) => `user:${id}`,
};

// createUser(data)
export const createUser = createWriteThunk(
  "users", "create",
  (data, options) => usersApi.create(data, options),
  userWriteKeys.create,
);

// updateUser({ id, data })
export const updateUser = createWriteThunk(
  "users", "update",
  ({ id, data }, options) => usersApi.update(id, data, options),
  ({ id }) => userWriteKeys.user(id),
);

// deactivateUser(id): the row stays, inactive, until the list is reloaded.
export const deactivateUser = createWriteThunk(
  "users", "deactivate",
  (id, options) => usersApi.remove(id, options),
  userWriteKeys.user,
);

// reactivateUser(id)
export const reactivateUser = createWriteThunk(
  "users", "reactivate",
  (id, options) => usersApi.reactivate(id, options),
  userWriteKeys.user,
);
