import React from 'react';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';

export function TaskDetailPanel({
  task,
  isLoading = false,
  onClose,
  onStatusChange,
  headerActions,
  children
}) {
  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading task details...</div>;
  }

  if (!task) {
    return <div className="p-8 text-center text-gray-500">Select a task to view details</div>;
  }

  const statusStr = String(task.status || 'Unknown');
  const isCompleted = statusStr.toLowerCase().includes('complete') || statusStr.toLowerCase().includes('approved');
  const isInProgress = statusStr.toLowerCase().includes('progress') || statusStr.toLowerCase().includes('review');
  const badgeStatus = isCompleted ? 'success' : isInProgress ? 'info' : 'default';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
          <p className="text-sm text-gray-500 mt-1">ID: {task.id}</p>
        </div>
        <div className="flex items-center gap-3">
          {headerActions}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 flex-1 overflow-y-auto space-y-8">
        
        {/* Task Info */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</h3>
              <div className="flex items-center gap-2">
                <Badge status={badgeStatus}>
                  {statusStr.replace(/_/g, ' ')}
                </Badge>
                {onStatusChange && (
                  <select 
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6"
                    value={task.status}
                    onChange={(e) => onStatusChange(e.target.value)}
                  >
                    <option value="Not_Started">Not Started</option>
                    <option value="In_Progress">In Progress</option>
                    <option value="In_Review">In Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assignee</h3>
              <p className="text-sm text-gray-900">{task.assigneeName || task.assignee || 'Unassigned'}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Priority</h3>
              <p className="text-sm text-gray-900 capitalize">{task.priority || 'Normal'}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Due Date</h3>
              <p className="text-sm text-gray-900">{task.dueDate || task.deadline || 'No deadline'}</p>
            </div>
          </div>
        </section>

        {/* Dynamic Children (Subtasks, Evidence, etc.) */}
        {children}

      </div>
    </div>
  );
}
