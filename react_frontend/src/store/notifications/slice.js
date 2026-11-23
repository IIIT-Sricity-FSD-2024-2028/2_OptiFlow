import { createSlice } from '@reduxjs/toolkit';
import { resourceState, listCases, requestCases, rows, removeRow, includeRow } from '../resourceState';
import * as actions from './thunks';

export default createSlice({
  name: 'notifications',
  initialState: resourceState(),
  reducers: {},
  extraReducers(builder) {
    listCases(builder, actions.fetchNotifications);
    requestCases(builder, actions.createNotification, 'mutations', a => 'create:' + a.meta.requestId, (state, { payload }) => {
      const recipient = JSON.parse(state.queryKey)?.userId;
      if (recipient === payload.userId) includeRow(state, payload);
    });
    requestCases(builder, actions.markNotificationRead, 'mutations', a => 'read:' + a.meta.arg, (state, { payload }) => {
      if (state.listRequest) state.changedDuringLoad[payload.id] = true;
      rows.updateOne(state, { id: payload.id, changes: payload });
    });
    requestCases(builder, actions.markAllNotificationsRead, 'mutations', () => 'readAll', (state, { payload }) => {
      for (const id of state.listIds) {
        const notification = state.entities[id];
        if (notification.userId === payload.userId) {
          notification.isRead = true;
          if (state.listRequest) state.changedDuringLoad[id] = true;
        }
      }
    });
    requestCases(builder, actions.deleteNotification, 'mutations', a => 'delete:' + a.meta.arg, (state, action) => {
      removeRow(state, action.meta.arg);
    });
  },
}).reducer;
