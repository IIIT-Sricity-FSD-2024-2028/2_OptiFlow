import { Badge } from '../../../shared/components/Badge';
import { formatDate } from '../../../shared/utils/formatDate';

export function TaskTable({
  tasks = [],
  isLoading = false,
  visibleColumns = ['id', 'title', 'status', 'priority', 'assignee', 'dueDate'],
  onRowClick,
  sortConfig,
  onSort,
}) {
  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading tasks...</div>;
  }

  if (!tasks.length) {
    return <div className="p-4 text-center text-gray-500">No tasks found.</div>;
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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            {visibleColumns.includes('id') && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleHeaderClick('id')}>
                ID{renderSortIcon('id')}
              </th>
            )}
            {visibleColumns.includes('title') && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleHeaderClick('title')}>
                Title{renderSortIcon('title')}
              </th>
            )}
            {visibleColumns.includes('status') && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleHeaderClick('status')}>
                Status{renderSortIcon('status')}
              </th>
            )}
            {visibleColumns.includes('priority') && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleHeaderClick('priority')}>
                Priority{renderSortIcon('priority')}
              </th>
            )}
            {visibleColumns.includes('assignee') && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleHeaderClick('assignee')}>
                Assignee{renderSortIcon('assignee')}
              </th>
            )}
            {visibleColumns.includes('dueDate') && (
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleHeaderClick('dueDate')}>
                Due Date{renderSortIcon('dueDate')}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task) => {
            const statusStr = String(task.status || 'Unknown');
            const lowerStatus = statusStr.toLowerCase();
            const isCompleted = lowerStatus.includes('complete') || lowerStatus.includes('approved');
            const isActive = lowerStatus === 'active' || lowerStatus.includes('progress');
            const isInReview = lowerStatus.includes('review') || lowerStatus.includes('pending');
            const isBlocked = lowerStatus.includes('blocked') || lowerStatus.includes('failed') || lowerStatus.includes('rejected');
            const badgeStatus = isCompleted ? 'success' : isActive ? 'active' : isInReview ? 'warning' : isBlocked ? 'danger' : 'default';
            
            return (
              <tr 
                key={task.id} 
                onClick={() => onRowClick?.(task)}
                className={onRowClick ? "hover:bg-gray-50 cursor-pointer transition-colors" : ""}
              >
                {visibleColumns.includes('id') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.id}</td>
                )}
                {visibleColumns.includes('title') && (
                  <td className="px-6 py-4 text-sm text-gray-900">{task.title}</td>
                )}
                {visibleColumns.includes('status') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col items-start gap-1">
                      <Badge status={badgeStatus}>{statusStr.replace(/_/g, ' ')}</Badge>
                      {task.complianceBlocked && <Badge status="danger">⚠ Blocked by Compliance</Badge>}
                    </div>
                  </td>
                )}
                {visibleColumns.includes('priority') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{task.priority}</td>
                )}
                {visibleColumns.includes('assignee') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.assigneeName || (typeof task.assignedTo === 'object'
                      ? task.assignedTo?.fullName || task.assignedTo?.email
                      : task.assignedTo) || task.assignee || 'Unassigned'}
                  </td>
                )}
                {visibleColumns.includes('dueDate') && (() => {
                  const rawDate = task.dueDate || task.deadline;
                  const formatted = formatDate(rawDate);
                  const isOverdue = rawDate && !isNaN(new Date(rawDate).getTime()) && new Date(rawDate) < new Date() && !['Completed', 'Cancelled'].includes(task.status);
                  return (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold" title="Overdue task">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          {formatted}
                        </span>
                      ) : (
                        <span className="text-gray-600">{formatted}</span>
                      )}
                    </td>
                  );
                })()}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
