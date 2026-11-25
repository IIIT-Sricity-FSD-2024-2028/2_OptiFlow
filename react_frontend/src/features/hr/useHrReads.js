import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { fetchUsers, selectUsersStatus, selectUsersError } from "../../store/users";
import { fetchTeams, selectTeamsStatus, selectTeamsError } from "../../store/teams";
import { fetchBranches, selectBranchesStatus, selectBranchesError } from "../../store/branches";
import { fetchRoles, selectRolesStatus, selectRolesError } from "../../store/roles";
import {
  fetchRoleAssignments, selectRoleAssignmentsStatus, selectRoleAssignmentsError,
} from "../../store/roleAssignments";

export const hrReads = {
  users: { label: "Users", fetch: fetchUsers, status: selectUsersStatus, error: selectUsersError },
  teams: { label: "Teams", fetch: fetchTeams, status: selectTeamsStatus, error: selectTeamsError },
  branches: { label: "Branches", fetch: fetchBranches, status: selectBranchesStatus, error: selectBranchesError },
  roles: { label: "Roles", fetch: fetchRoles, status: selectRolesStatus, error: selectRolesError },
  roleAssignments: {
    label: "Role assignments", fetch: fetchRoleAssignments,
    status: selectRoleAssignmentsStatus, error: selectRoleAssignmentsError,
  },
};

/**
 * Loads the lists a page shows. Both arguments must be module constants (stable arrays).
 *   primary    a failure sets `error` (the page's banner)
 *   secondary  a failure only adds its label to `partialFailures`
 * `loading` is true until the first load settles; later reloads keep the page on screen.
 * `reload()` always refetches (Refresh, Retry, after a write); it never rejects and resolves to
 * false when a primary list could not be loaded. `reloading` is true while it runs.
 * `reloadAfterFailure(err)` refetches after a failed write that may have been saved, or that shows
 * the rows on screen are out of date.
 */
export function useHrReads(primary, secondary) {
  const dispatch = useDispatch();
  const store = useStore();

  useEffect(() => {
    for (const read of [...primary, ...secondary]) {
      // A list that failed last time is asked for again, even inside its freshness window.
      const failed = read.status(store.getState()) === "failed";
      dispatch(read.fetch(failed ? { force: true } : undefined));
    }
  }, [dispatch, store, primary, secondary]);

  const [reloads, setReloads] = useState(0);
  const reload = useCallback(async () => {
    setReloads((n) => n + 1);
    const results = await Promise.all(
      [...primary, ...secondary].map((read) => dispatch(read.fetch({ force: true }))),
    );
    setReloads((n) => n - 1);
    return !results.slice(0, primary.length).some((r) => r.meta.requestStatus === "rejected" && !r.meta.condition);
  }, [dispatch, primary, secondary]);

  const reloadAfterFailure = (err) => {
    const status = err?.status;
    const uncertain = status === 0 && err.code !== "BAD_ID";
    if (uncertain || status >= 500 || status === 404 || status === 409) reload();
  };

  const statuses = useSelector((state) => [...primary, ...secondary].map((read) => read.status(state)).join());
  const error = useSelector((state) => primary.map((read) => read.error(state)).find(Boolean) ?? null);
  const failedLabels = useSelector((state) =>
    secondary.filter((read) => read.status(state) === "failed").map((read) => read.label).join(),
  );

  // Adjusted during render, not in an effect. A failure left over from an earlier visit does not
  // count as settled: the effect above is about to ask again.
  const busy = /idle|loading/.test(statuses);
  const [asked, setAsked] = useState(false);
  const [ready, setReady] = useState(false);
  if (!asked && statuses.includes("loading")) setAsked(true);
  if (!ready && !busy && (asked || !statuses.includes("failed"))) setReady(true);

  return {
    loading: !ready,
    error,
    partialFailures: failedLabels ? failedLabels.split(",") : [],
    reload,
    reloading: reloads > 0,
    reloadAfterFailure,
  };
}

/** The text for a failed write. */
export function writeErrorMessage(err, fallback) {
  if (err?.name === "ConditionError") return "Another change is still being saved. Please wait and try again.";
  return err?.message || fallback;
}

/**
 * Toasts a failed write whose form also shows the message. A 403 is left to the shared toast
 * (core/listener.js). Dialogs without their own error text call toast.error directly: the shared
 * toast has a cooldown, and a failure must never be silent.
 */
export function toastWriteError(toast, err, fallback) {
  if (err?.status !== 403) toast.error(writeErrorMessage(err, fallback));
}
