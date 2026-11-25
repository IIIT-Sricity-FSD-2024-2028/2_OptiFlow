export const selectAllAuditLogs = (state) => state.auditLogs.items;

export const selectCurrentAuditLog = (state) => state.auditLogs.currentLog;

export const selectAuditLogsStatus = (state) => state.auditLogs.status;

export const selectAuditLogsError = (state) => state.auditLogs.error;

export const selectIsAuditLogsLoading = (state) =>
  state.auditLogs.status === "loading";

export const selectProcessAuditFeed = (state) => state.auditLogs.processFeed;
