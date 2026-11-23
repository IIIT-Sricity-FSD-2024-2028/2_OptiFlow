import { asRows, buildWorkSlice, createWorkAdapter } from '../work/entitySlice';
import { fetchTaskById, fetchTasks } from '../tasks/thunks';
import {
  createSubtask,
  deleteSubtask,
  fetchSubtaskById,
  fetchSubtasks,
  fetchSubtasksByTask,
  updateSubtask,
} from './thunks';

export const subtasksAdapter = createWorkAdapter();

const subtasksSlice = buildWorkSlice({
  name: 'subtasks',
  adapter: subtasksAdapter,
  thunks: {
    list: fetchSubtasks,
    getById: fetchSubtaskById,
    create: createSubtask,
    update: updateSubtask,
    remove: deleteSubtask,
  },
  extra: (builder, adapter) => {
    // By-task: replaces the subtasks of that one task and leaves the others alone.
    builder.addCase(fetchSubtasksByTask.fulfilled, (state, action) => {
      const taskId = action.meta.arg;
      const stale = Object.values(state.entities)
        .filter((st) => String(st.taskId) === String(taskId))
        .map((st) => st.id);
      adapter.removeMany(state, stale);
      adapter.upsertMany(state, asRows(action.payload));
    });
    // Task rows carry their subtasks, so loading tasks also fills this slice.
    const absorb = (state, tasks) => {
      for (const task of tasks) {
        if (!Array.isArray(task?.subtasks)) continue;
        adapter.upsertMany(
          state,
          task.subtasks.filter((st) => st?.id != null).map((st) => ({ taskId: task.id, ...st })),
        );
      }
    };
    builder.addCase(fetchTasks.fulfilled, (state, action) => absorb(state, asRows(action.payload)));
    builder.addCase(fetchTaskById.fulfilled, (state, action) =>
      absorb(state, action.payload ? [action.payload] : []),
    );
  },
});

export const { clearMutation: clearSubtaskMutation } = subtasksSlice.actions;
export default subtasksSlice.reducer;
