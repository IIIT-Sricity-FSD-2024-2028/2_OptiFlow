import * as subtasksApi from '../../services/api/subtasks';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchSubtasks = createApiThunk(
  'subtasks/fetchAll',
  (arg, options) => subtasksApi.list(options),
  { abortable: true, condition: (_arg, { getState }) => shouldFetch(getState().subtasks, _arg) },
);
export const fetchSubtaskById = createApiThunk(
  'subtasks/fetchById',
  (id, options) => subtasksApi.get(id, options),
  { abortable: true },
);
export const fetchSubtasksByTask = createApiThunk(
  'subtasks/fetchByTask',
  (taskId, options) => subtasksApi.listByTask(taskId, options),
  { abortable: true },
);
export const createSubtask = createApiThunk('subtasks/create', (data, options) => subtasksApi.create(data, options));
export const updateSubtask = createApiThunk('subtasks/update', ({ id, data }, options) =>
  subtasksApi.update(id, data, options),
);
export const deleteSubtask = createApiThunk('subtasks/delete', (id, options) => subtasksApi.remove(id, options));
