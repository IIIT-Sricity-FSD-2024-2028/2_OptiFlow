import * as tasksApi from '../../services/api/tasks';
import { createApiThunk } from '../core/createApiThunk';
import { shouldFetch } from '../core/shouldFetch';

export const fetchTasks = createApiThunk(
  'tasks/fetchAll',
  (arg, options) => tasksApi.list(options),
  { abortable: true, condition: (_arg, { getState }) => shouldFetch(getState().tasks, _arg) },
);
export const fetchTaskById = createApiThunk(
  'tasks/fetchById',
  (id, options) => tasksApi.get(id, options),
  { abortable: true },
);
export const fetchTasksByAssignee = createApiThunk(
  'tasks/fetchByAssignee',
  (userId, options) => tasksApi.listByAssignee(userId, options),
  { abortable: true },
);
export const createTask = createApiThunk('tasks/create', (data, options) => tasksApi.create(data, options));
// A rejected update keeps { code, details }, so COMPLIANCE_BLOCK handling is unchanged.
export const updateTask = createApiThunk('tasks/update', ({ id, data }, options) =>
  tasksApi.update(id, data, options),
);
export const deleteTask = createApiThunk('tasks/delete', (id, options) => tasksApi.remove(id, options));
