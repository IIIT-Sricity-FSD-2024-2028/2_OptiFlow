import * as api from '../../services/api/attachments';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchAttachments = createApiThunk('attachments/list', api.list, {
  abortable: true, condition: (arg, { getState }) => shouldFetch(getState().attachments, arg),
});
export const fetchAttachmentById = createApiThunk('attachments/get', api.get, { abortable: true });
export const createAttachment = createApiThunk('attachments/create', api.create);
export const deleteAttachment = createApiThunk('attachments/delete', api.remove);
