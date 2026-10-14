import React from 'react';
import { Badge } from '../../../shared/components/Badge';
import { formatDate } from '../../../shared/utils/formatDate';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { ChevronRight } from 'lucide-react';

export function TaskTable({
  tasks = [],
  isLoading = false,
  visibleColumns = ['id', 'title', 'project', 'status', 'priority', 'dueDate'],
  onRowClick,
  sortConfig,
  onSort,
}) {
  if (isLoading) {
    return <div className="p-8 text-center text-xs font-medium text-slate-400">Loading tasks...</div>;
  }

  if (!tasks.length) {
    return <div className="p-8 text-center text-xs font-medium text-slate-400">No tasks found.</div>;
  }

  const handleHeaderClick = (key) => {
    if (onSort) {
      onSort(key);
    }
  };

  const renderSortIcon = (key) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-2xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {visibleColumns.includes('id') && (
              <th scope="col" className="py-3.5 px-5 cursor-pointer" onClick={() => handleHeaderClick('id')}>
                ID{renderSortIcon('id')}
              </th>
            )}
            {visibleColumns.includes('title') && (
              <th scope="col" className="py-3.5 px-5 cursor-pointer" onClick={() => handleHeaderClick('title')}>
                Task Deliverable{renderSortIcon('title')}
              </th>
            )}
            {visibleColumns.includes('project') && (
              <th scope="col" className="py-3.5 px-5">Process / Project</th>
            )}
            {visibleColumns.includes('assignee') && (
              <th scope="col" className="py-3.5 px-5 cursor-pointer" onClick={() => handleHeaderClick('assignee')}>
                Assignee{renderSortIcon('assignee')}
              </th>
            )}
            {visibleColumns.includes('assigner') && (
              <th scope="col" className="py-3.5 px-5">Assigner / Lead</th>
            )}
            {visibleColumns.includes('priority') && (
              <th scope="col" className="py-3.5 px-5 cursor-pointer" onClick={() => handleHeaderClick('priority')}>
                Priority{renderSortIcon('priority')}
              </th>
            )}
            {visibleColumns.includes('status') && (
              <th scope="col" className="py-3.5 px-5 cursor-pointer" onClick={() => handleHeaderClick('status')}>
                Status{renderSortIcon('status')}
              </th>
            )}
            {visibleColumns.includes('dueDate') && (
              <th scope="col" className="py-3.5 px-5 cursor-pointer" onClick={() => handleHeaderClick('dueDate')}>
                Deadline{renderSortIcon('dueDate')}
              </th>
            )}
            {visibleColumns.includes('actions') && (
              <th scope="col" className="py-3.5 px-5 text-right">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {tasks.map((task) => {
            const rawDueDate = task.dueDate || task.deadline;
            const isCompleted = String(task.status || '').toLowerCase().includes('complete') || String(task.status || '').toLowerCase().includes('approved');
            const isOverdue = rawDueDate && !isNaN(new Date(rawDueDate).getTime()) && new Date(rawDueDate) < new Date() && !isCompleted;
            const formattedDate = rawDueDate ? formatDate(rawDueDate) : '—';

            const projName =
              task.project?.name ||
              task.projectName ||
              (typeof task.project === 'string' ? task.project : 'General');

            const assigneeName =
              task.assigneeName ||
              (typeof task.assignedTo === 'object'
                ? task.assignedTo?.fullName || task.assignedTo?.email
                : task.assignedTo) ||
              task.assignee ||
              '—';

            const assignerName =
              task.assignerName ||
              (typeof task.createdBy === 'object'
                ? task.createdBy?.fullName || task.createdBy?.name
                : task.createdBy) ||
              'Team Lead';

            return (
              <tr
                key={task.id || task.taskId}
                onClick={() => onRowClick?.(task)}
                className={`transition-colors group ${
                  onRowClick ? 'hover:bg-slate-50/80 cursor-pointer' : ''
                }`}
              >
                {visibleColumns.includes('id') && (
                  <td className="py-3.5 px-5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                    #{String(task.id || task.taskId).slice(0, 8)}
                  </td>
                )}
                {visibleColumns.includes('title') && (
                  <td className="py-3.5 px-5 max-w-xs">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {task.isSubtask && <span className="text-blue-600 font-bold mr-1">↳</span>}
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {task.description}
                      </div>
                    )}
                  </td>
                )}
                {visibleColumns.includes('project') && (
                  <td className="py-3.5 px-5 text-slate-700 font-medium whitespace-nowrap">
                    {projName}
                  </td>
                )}
                {visibleColumns.includes('assignee') && (
                  <td className="py-3.5 px-5 whitespace-nowrap text-slate-700 font-medium">
                    {assigneeName}
                  </td>
                )}
                {visibleColumns.includes('assigner') && (
                  <td className="py-3.5 px-5 whitespace-nowrap text-slate-500">
                    {assignerName}
                  </td>
                )}
                {visibleColumns.includes('priority') && (
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <PriorityBadge priority={task.priority} />
                  </td>
                )}
                {visibleColumns.includes('status') && (
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={task.status} isOverdue={isOverdue} />
                      {task.complianceBlocked && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          ⚠ Blocked by Compliance
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.includes('dueDate') && (
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold" title="Overdue task">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        {formattedDate}
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium">{formattedDate}</span>
                    )}
                  </td>
                )}
                {visibleColumns.includes('actions') && (
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 inline transition-colors" />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
