import { EMPTY_ENTRY, makeListSelectors } from "../core/keyedList";

const { selectEntry, selectMutation } = makeListSelectors("platformCompanies");

// Pages read the store only through these.
// selectCompaniesEntry(state, query) -> { status, error, items, total, summary, loadedAt }
export const selectCompaniesEntry = selectEntry;
// selectCompanyMutation(state, "create" | "update") -> { status, error }
export const selectCompanyMutation = selectMutation;

const EMPTY_DETAIL = Object.freeze({ ...EMPTY_ENTRY, items: undefined, data: null });
// selectCompanyDetail(state, id) -> { status, error, data, loadedAt }
export const selectCompanyDetail = (state, id) => state.platformCompanies.details[id] ?? EMPTY_DETAIL;
