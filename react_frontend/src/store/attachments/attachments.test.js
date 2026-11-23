import { expect, it, vi } from 'vitest';
import { makeStore } from '../index';
import { resetStore } from '../core/resetStore';
import * as api from '../../services/api/attachments';
import {
  fetchAttachments, fetchAttachmentById, createAttachment, deleteAttachment,
  selectAllAttachments, selectAttachmentById,
} from './index';

vi.mock('../../services/api/attachments');

it('shares filtered reads and keeps list membership separate from other attachment details', async () => {
  const store = makeStore();
  const query = { entityId: 'e', entityType: 'evidence' };
  const row = { id: 'a', entityId: 'e', entityType: 'ComplianceEvidence' };
  api.list.mockResolvedValue([row]);
  const pending = store.dispatch(fetchAttachments(query));
  expect(store.getState().attachments.status).toBe('loading');
  await Promise.all([pending, store.dispatch(fetchAttachments(query))]);
  expect(api.list).toHaveBeenCalledTimes(1);
  expect(api.list).toHaveBeenCalledWith(query, expect.objectContaining({ signal: expect.anything() }));
  api.get.mockResolvedValue({ ...row, id: 'b', entityId: 'other' });
  await store.dispatch(fetchAttachmentById('b')).unwrap();
  expect(selectAttachmentById(store.getState(), 'b').entityId).toBe('other');
  api.create.mockResolvedValue({ ...row, id: 'new' });
  await store.dispatch(createAttachment({ entityId: 'e', entityType: 'evidence' })).unwrap();
  expect(selectAllAttachments(store.getState()).map(item => item.id)).toEqual(['new', 'a']);
});

it('preserves a row on rejection and prevents an older read from undoing a delete', async () => {
  const store = makeStore();
  api.list.mockResolvedValue([{ id: 'a' }]);
  await store.dispatch(fetchAttachments()).unwrap();
  api.remove.mockRejectedValueOnce(new Error('Denied')).mockResolvedValueOnce(null);
  await store.dispatch(deleteAttachment('a'));
  expect(store.getState().attachments.mutations['delete:a'].error.message).toBe('Denied');
  expect(selectAttachmentById(store.getState(), 'a')).toBeDefined();
  store.dispatch(fetchAttachments.pending('old'));
  await store.dispatch(deleteAttachment('a')).unwrap();
  store.dispatch(fetchAttachments.fulfilled([{ id: 'a' }], 'old'));
  expect(selectAllAttachments(store.getState())).toEqual([]);
});

it('ignores abort errors and clears attachment data on logout', () => {
  const store = makeStore();
  store.dispatch(fetchAttachments.pending('r'));
  store.dispatch(fetchAttachments.rejected({ name: 'AbortError' }, 'r'));
  expect(store.getState().attachments.error).toBeNull();
  store.dispatch(fetchAttachmentById.pending('late', 'a'));
  store.dispatch(resetStore());
  store.dispatch(fetchAttachmentById.fulfilled({ id: 'a' }, 'late', 'a'));
  expect(selectAttachmentById(store.getState(), 'a')).toBeUndefined();
});
