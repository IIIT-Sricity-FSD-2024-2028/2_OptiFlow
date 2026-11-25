import { makeListSelectors } from "../hr/listSlice";
import { makeWriteSelectors } from "../hr/writeCases";

// Pages read teams only through these.
const s = makeListSelectors("teams");

export const selectAllTeams = s.selectAll;
export const selectTeamById = s.selectById;
export const selectTeamsStatus = s.selectStatus;
export const selectTeamsError = s.selectError;
export const selectTeamsLoadedAt = s.selectLoadedAt;
export const selectTeamDetailStatus = s.selectDetailStatus;
export const selectTeamDetailError = s.selectDetailError;

const w = makeWriteSelectors("teams");

// (state, key), key from teamWriteKeys.
export const selectTeamWriteStatus = w.selectWriteStatus;
export const selectTeamWriteError = w.selectWriteError;
