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
    // By-task fetch: replace only the subtasks belonging to that task.
    builder.addCase(fetchSubtasksByTask.fulfilled, (state, action) => {
      const taskId = action.meta.arg;
      const staleIds = Object.values(state.entities)
        .filter((st) => String(st.taskId) === String(taskId))
        .map((st) => st.id);
      adapter.removeMany(state, staleIds);
      adapter.upsertMany(state, asRows(action.payload));
    });
    // Task rows include their subtasks from the server — absorb them into this
    // slice so subtask selectors work without a separate fetchSubtasks call.
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
