// A supporting slice that has not answered yet (never loaded, or its first load is running).
// A failed load counts as answered: pages fall back to an empty list, as they did before.
export const isPendingStatus = (status) => status === 'idle' || status === 'loading';
