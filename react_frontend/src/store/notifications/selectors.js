import { createSelector } from '@reduxjs/toolkit';

const selectSlice = state => state.notifications;
export const selectAllNotifications = createSelector(
  [state => selectSlice(state).listIds, state => selectSlice(state).entities],
  (ids, entities) => ids.map(id => entities[id]),
);
export const selectNotificationById = (state, id) => selectSlice(state).entities[id];
export const selectNotificationsStatus = state => selectSlice(state).status;
export const selectNotificationsError = state => selectSlice(state).error;
export const selectNotificationMutations = state => selectSlice(state).mutations;
export const selectUnreadCount = createSelector(selectAllNotifications, list => list.filter(n => !n.isRead).length);
