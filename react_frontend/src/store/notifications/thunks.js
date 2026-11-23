import * as api from '../../services/api/notifications';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchNotifications = createApiThunk('notifications/list', api.list, {
  abortable: true, condition: (arg, { getState }) => shouldFetch(getState().notifications, arg),
});
export const createNotification = createApiThunk('notifications/create', api.create);
export const markNotificationRead = createApiThunk('notifications/read', api.markRead);
export const markAllNotificationsRead = createApiThunk('notifications/readAll', api.markAllRead);
export const deleteNotification = createApiThunk('notifications/delete', api.remove);
