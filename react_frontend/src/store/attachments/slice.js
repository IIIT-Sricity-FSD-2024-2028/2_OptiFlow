import { createSlice } from '@reduxjs/toolkit';
import { resourceState, listCases, requestCases, rows, removeRow, includeRow } from '../resourceState';
import { fetchAttachments, fetchAttachmentById, createAttachment, deleteAttachment } from './thunks';

function canonicalType(type) {
  const key = type?.toLowerCase().replace(/[\s_-]/g, '');
  if (key === 'evidence') return 'complianceevidence';
  if (key === 'processstep') return 'processinstancestep';
  return key;
}

export default createSlice({
  name: 'attachments',
  initialState: resourceState(),
  reducers: {},
  extraReducers(builder) {
    listCases(builder, fetchAttachments);
    requestCases(builder, fetchAttachmentById, 'details', a => a.meta.arg, (state, { payload }) => {
      rows.upsertOne(state, payload);
    });
    requestCases(builder, createAttachment, 'mutations', a => 'create:' + a.meta.requestId, (state, { payload }) => {
      const query = JSON.parse(state.queryKey) ?? {};
      const matchesType = !query.entityType || canonicalType(query.entityType) === canonicalType(payload.entityType);
      if (matchesType && (!query.entityId || query.entityId === payload.entityId)) includeRow(state, payload);
      else rows.upsertOne(state, payload);
    });
    requestCases(builder, deleteAttachment, 'mutations', a => 'delete:' + a.meta.arg, (state, action) => {
      removeRow(state, action.meta.arg);
    });
  },
}).reducer;
