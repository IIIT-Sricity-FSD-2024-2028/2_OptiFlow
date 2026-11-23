import * as subtasksApi from '../../services/api/subtasks';
import { createApiThunk } from '../core/createApiThunk';
import { skipWhileLoading } from '../work/entitySlice';

export const fetchSubtasks = createApiThunk(
  'subtasks/fetchAll',
  (_arg, { signal }) => subtasksApi.list({ signal }),
  skipWhileLoading('subtasks'),
);
export const fetchSubtaskById = createApiThunk('subtasks/fetchById', (id, { signal }) =>
  subtasksApi.get(id, { signal }),
);
export const fetchSubtasksByTask = createApiThunk('subtasks/fetchByTask', (taskId, { signal }) =>
  subtasksApi.listByTask(taskId, { signal }),
);
export const createSubtask = createApiThunk('subtasks/create', (data, { signal }) =>
  subtasksApi.create(data, { signal }),
);
export const updateSubtask = createApiThunk('subtasks/update', ({ id, data }, { signal }) =>
  subtasksApi.update(id, data, { signal }),
);
export const deleteSubtask = createApiThunk('subtasks/delete', (id, { signal }) => subtasksApi.remove(id, { signal }));
