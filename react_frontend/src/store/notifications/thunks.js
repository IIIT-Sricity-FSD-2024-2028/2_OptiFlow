import * as api from '../../services/api/notifications';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchNotifications = createApiThunk('notifications/list',
  (arg, options) => api.list(arg, options), {
    abortable: true, condition: (arg, { getState }) => shouldFetch(getState().notifications, arg),
  });
export const createNotification = createApiThunk('notifications/create', (data, options) => api.create(data, options));
export const markNotificationRead = createApiThunk('notifications/read', (id, options) => api.markRead(id, options));
export const markAllNotificationsRead = createApiThunk('notifications/readAll', (_arg, options) => api.markAllRead(options));
export const deleteNotification = createApiThunk('notifications/delete', (id, options) => api.remove(id, options));
