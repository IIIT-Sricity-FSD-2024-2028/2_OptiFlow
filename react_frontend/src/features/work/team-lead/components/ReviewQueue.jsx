// Team Lead dashboard review queue: parent tasks awaiting the PM, subtasks to
// approve or send back, and extension requests. Presentational only.
import { Button } from '../../../../shared/components/Button';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { getBadgeStatus, formatStatus, openExtensionRequests } from './statusDisplay';

export function ReviewQueue({
  activeTab,
  onTabChange,
  tasks,
  subtasks,
  extensionRequests,
  onBreakDown,
  onApproveSubtask,
  onSendBackSubtask,
  onExtensionDecision,
  onRejectExtension,
}) {
  const openExts = openExtensionRequests(extensionRequests);

  return (
    <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Review Queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">Approve, reject or respond to team submissions</p>
        </div>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-blue-600 text-white text-xs font-bold">
          {tasks.length + subtasks.length + openExts.length}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        {[
          { key: 'tasks', label: 'Tasks', count: tasks.length },
          { key: 'subtasks', label: 'Subtasks', count: subtasks.length },
          { key: 'extensions', label: 'Extensions', count: openExts.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-5">

        {/* — Tasks tab — */}
        {activeTab === 'tasks' && (
          tasks.length === 0 ? (
            <EmptyState
              title="No tasks in review"
              description="When team members submit their work you'll see it here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Submitted by <strong>{task.assigneeName || task.assignedTo?.fullName || task.assignedTo?.email || 'Unknown'}</strong>
                    </p>
                    {task.notes && (
                      <p className="text-xs text-gray-400 mt-1 italic truncate max-w-md">&ldquo;{task.notes}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge status={getBadgeStatus(task.status)}>{formatStatus(task.status)}</Badge>
                    {/* Parent tasks in review wait for the Project Manager (D-S5). */}
                    <span className="text-xs text-gray-500">Awaiting PM approval</span>
                    {!task.isSubtask && !task.parentId && (
                      <Button variant="outline" onClick={() => onBreakDown(task.id)}>Break down</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* — Subtasks tab — */}
        {activeTab === 'subtasks' && (
          subtasks.length === 0 ? (
            <EmptyState
              title="No subtasks in review"
              description="Subtasks submitted by team members will appear here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {subtasks.map((subtask) => {
                const subId = subtask.id || subtask.subtaskId;
                return (
                  <div
                    key={subId}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{subtask.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Under: <strong>{subtask._parentTask?.title || 'Parent task'}</strong>
                        {subtask.assignedToName && <> · by {subtask.assignedToName}</>}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Badge status="info">In Review</Badge>
                      <Button variant="primary" onClick={() => onApproveSubtask(subtask)}>Approve</Button>
                      <Button variant="danger" onClick={() => onSendBackSubtask(subtask)}>Send Back</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* — Extensions tab — */}
        {activeTab === 'extensions' && (
          openExts.length === 0 ? (
            <EmptyState
              title="No pending extension requests"
              description="Extension requests from team members will appear here."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {openExts.map((ext) => (
                <div
                  key={ext.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm">{ext.title}</p>
                    {ext.description && (
                      <p className="text-xs text-gray-600 mt-1 bg-amber-50 border border-amber-100 rounded px-2 py-1 max-w-lg">
                        {ext.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1.5">
                      Requested by{' '}
                      <strong>{ext.reportedBy?.fullName || ext.reportedBy?.email || 'Team member'}</strong>
                      {ext.createdAt && (
                        <> · {new Date(ext.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="primary" onClick={() => onExtensionDecision(ext, true)}>
                      Approve
                    </Button>
                    <Button variant="danger" onClick={() => onRejectExtension ? onRejectExtension(ext) : onExtensionDecision(ext, false)}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </section>
  );
}
