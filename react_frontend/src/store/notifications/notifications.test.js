import { expect, it, vi } from 'vitest';
import { makeStore } from '../index';
import { resetStore } from '../core/resetStore';
import * as api from '../../services/api/notifications';
import { fetchNotifications, markNotificationRead, selectUnreadCount } from './index';

vi.mock('../../services/api/notifications', () => ({
  list: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn(), create: vi.fn(), remove: vi.fn(),
}));

it('loads a recipient once, counts unread rows and preserves them on a failed write', async () => {
  const store = makeStore();
  api.list.mockResolvedValue([{ id: 'n', userId: 'u', isRead: false }]);
  const arg = { userId: 'u' };
  const pending = store.dispatch(fetchNotifications(arg));
  expect(store.getState().notifications.status).toBe('loading');
  await Promise.all([pending, store.dispatch(fetchNotifications(arg))]);
  expect(api.list).toHaveBeenCalledTimes(1);
  expect(selectUnreadCount(store.getState())).toBe(1);
  api.markRead.mockRejectedValue(new Error('Denied'));
  await store.dispatch(markNotificationRead('n'));
  expect(store.getState().notifications.mutations['read:n'].error.message).toBe('Denied');
  expect(selectUnreadCount(store.getState())).toBe(1);
});

it('ignores cancellation and results delivered after logout', () => {
  const store = makeStore();
  store.dispatch(fetchNotifications.pending('old'));
  store.dispatch(fetchNotifications.rejected({ name: 'AbortError' }, 'old'));
  expect(store.getState().notifications.error).toBeNull();
  store.dispatch(resetStore());
  store.dispatch(fetchNotifications.fulfilled([{ id: 'late' }], 'old'));
  expect(store.getState().notifications.ids).toEqual([]);
});
