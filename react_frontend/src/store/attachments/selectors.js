import { createSelector } from '@reduxjs/toolkit';

const selectSlice = state => state.attachments;
export const selectAllAttachments = createSelector(
  [state => selectSlice(state).listIds, state => selectSlice(state).entities],
  (ids, entities) => ids.map(id => entities[id]),
);
export const selectAttachmentById = (state, id) => selectSlice(state).entities[id];
export const selectAttachmentsStatus = state => selectSlice(state).status;
export const selectAttachmentsError = state => selectSlice(state).error;
export const selectAttachmentMutations = state => selectSlice(state).mutations;
