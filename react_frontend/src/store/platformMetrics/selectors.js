// Pages read the store only through these.
export const selectPlatformMetrics = (state) => state.platformMetrics.data;
export const selectPlatformMetricsStatus = (state) => state.platformMetrics.status;
export const selectPlatformMetricsError = (state) => state.platformMetrics.error;
export const selectPlatformMetricsLoadedAt = (state) => state.platformMetrics.loadedAt;
