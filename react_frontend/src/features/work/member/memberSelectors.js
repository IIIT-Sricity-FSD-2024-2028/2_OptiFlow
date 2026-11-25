import { createSelector } from '@reduxjs/toolkit';
import { selectAllTasks } from '../../../store/tasks';
import { selectAllSubtasks } from '../../../store/subtasks';

function assigneeId(row) {
  return String(row.assignedToId || row.assignedTo?.id || row.assignedTo || '');
}

export const selectMemberDeliverables = createSelector(
  [selectAllTasks, selectAllSubtasks, (_state, userId) => String(userId || '')],
  (tasks, subtasks, userId) => {
    if (!userId) return [];
    const parents = new Map(tasks.map(task => [String(task.id || task.taskId), task]));
    const assignedTasks = tasks.filter(task => assigneeId(task) === userId)
      .map(task => ({ ...task, isSubtask: false }));
    const assignedSubtasks = subtasks.filter(step => assigneeId(step) === userId)
      .map(step => {
        const parent = parents.get(String(step.taskId));
        return {
          ...step,
          id: step.id || step.subtaskId,
          title: step.title || 'Subtask',
          projectId: parent?.projectId || parent?.project?.id,
          project: parent?.project,
          isSubtask: true,
          parentTaskId: step.taskId,
          dueDate: step.dueDate || step.due_date || parent?.dueDate,
          priority: step.priority || parent?.priority || 'Medium',
        };
      });
    return [...assignedTasks, ...assignedSubtasks];
  },
);
