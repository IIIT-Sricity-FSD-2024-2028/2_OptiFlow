import { createListThunks } from "../hr/listSlice";
import * as usersApi from "../../services/api/users";

// Reads only (mutations come in a later PR). Call through the namespace so tests can spy on it.
// fetchUsers({ force? }): the endpoint takes no filters, so the query is never sent.
// fetchUserById(id): always reloads unless that id is already loading.
// After a write, use fetchUsers({ force: true }): a loaded list counts as fresh for 60 s.
const { fetchList, fetchById } = createListThunks("users", {
  list: (_query, options) => usersApi.list(options),
  get: (id, options) => usersApi.get(id, options),
});

export const fetchUsers = fetchList;
export const fetchUserById = fetchById;
