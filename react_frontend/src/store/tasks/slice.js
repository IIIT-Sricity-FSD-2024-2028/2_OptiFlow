import { asRows, buildWorkSlice, createWorkAdapter } from '../work/entitySlice';
import { createSubtask, deleteSubtask, updateSubtask } from '../subtasks/thunks';
import {
  createTask,
  deleteTask,
  fetchTaskById,
  fetchTasks,
  fetchTasksByAssignee,
  updateTask,
} from './thunks';

export const tasksAdapter = createWorkAdapter();

/** Keeps the subtasks nested in a task row in step with the subtasks slice. */
const patchNestedSubtask = (state, subtask) => {
  const taskId = subtask?.taskId;
  const task = taskId != null ? state.entities[taskId] : null;
  if (!task || !Array.isArray(task.subtasks)) return;
  const i = task.subtasks.findIndex((s) => s.id === subtask.id);
  if (i >= 0) task.subtasks[i] = { ...task.subtasks[i], ...subtask };
  else task.subtasks.push(subtask);
};

const tasksSlice = buildWorkSlice({
  name: 'tasks',
  adapter: tasksAdapter,
  thunks: {
    list: fetchTasks,
    getById: fetchTaskById,
    create: createTask,
    update: updateTask,
    remove: deleteTask,
  },
  extra: (builder, adapter) => {
    builder.addCase(fetchTasksByAssignee.fulfilled, (state, action) => {
      adapter.upsertMany(state, asRows(action.payload));
    });
    builder.addCase(createSubtask.fulfilled, (state, action) => patchNestedSubtask(state, action.payload));
    builder.addCase(updateSubtask.fulfilled, (state, action) => patchNestedSubtask(state, action.payload));
    builder.addCase(deleteSubtask.fulfilled, (state, action) => {
      for (const task of Object.values(state.entities)) {
        if (!Array.isArray(task?.subtasks)) continue;
        const i = task.subtasks.findIndex((s) => s.id === action.meta.arg);
        if (i >= 0) task.subtasks.splice(i, 1);
      }
    });
  },
});

export const { clearMutation: clearTaskMutation } = tasksSlice.actions;
export default tasksSlice.reducer;
