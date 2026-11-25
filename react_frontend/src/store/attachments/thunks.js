import * as api from '../../services/api/attachments';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchAttachments = createApiThunk('attachments/list',
  (query, options) => api.list(query, options), {
    abortable: true, condition: (arg, { getState }) => shouldFetch(getState().attachments, arg),
  });
export const fetchAttachmentById = createApiThunk('attachments/get', (id, options) => api.get(id, options), { abortable: true });
export const createAttachment = createApiThunk('attachments/create', (data, options) => api.create(data, options));
export const deleteAttachment = createApiThunk('attachments/delete', (id, options) => api.remove(id, options));
