import * as tasksApi from '../../services/api/tasks';
import { createApiThunk } from '../core';
import { skipWhileLoading } from '../work/entitySlice';

export const fetchTasks = createApiThunk(
  'tasks/fetchAll',
  (_arg, { signal }) => tasksApi.list({ signal }),
  skipWhileLoading('tasks'),
);
export const fetchTaskById = createApiThunk('tasks/fetchById', (id, { signal }) => tasksApi.get(id, { signal }));
export const fetchTasksByAssignee = createApiThunk('tasks/fetchByAssignee', (userId, { signal }) =>
  tasksApi.listByAssignee(userId, { signal }),
);
export const createTask = createApiThunk('tasks/create', (data, { signal }) => tasksApi.create(data, { signal }));
// A rejected update keeps { code, details }, so COMPLIANCE_BLOCK handling is unchanged.
export const updateTask = createApiThunk('tasks/update', ({ id, data }, { signal }) =>
  tasksApi.update(id, data, { signal }),
);
export const deleteTask = createApiThunk('tasks/delete', (id, { signal }) => tasksApi.remove(id, { signal }));
