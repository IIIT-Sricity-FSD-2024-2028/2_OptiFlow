import React from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Button } from '../../../../shared/components/Button';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';

export function PmReviewQueue({
  activeTab = 'tasks',
  onTabChange,
  tasks = [],
  extensionRequests = [],
  blockedTaskIds = new Set(),
  onApproveTask,
  onSendBackTask,
  onApproveExtension,
  onRejectExtension,
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">Review Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">Audit and approve deliverables and deadline extensions from Team Leads</p>
        </div>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-bold">
          {tasks.length + extensionRequests.length}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/30">
        {[
          { key: 'tasks', label: 'Tasks in Review', count: tasks.length },
          { key: 'extensions', label: 'Extension Requests', count: extensionRequests.length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[1.1rem] h-4 px-1 rounded-full text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {/* — Tasks Tab — */}
        {activeTab === 'tasks' && (
          tasks.length === 0 ? (
            <EmptyState
              title="No tasks in review"
              description="When Team Leads submit completed deliverables, they will appear here for audit and sign-off."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={PATHS.PM.TASK_DETAIL.replace(':id', task.id)}
                      className="font-semibold text-slate-900 hover:text-blue-600 text-sm truncate block"
                    >
                      {task.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lead: <strong>{task.assigneeName || task.assignedTo?.fullName || task.assignedTo?.email || 'Team Lead'}</strong>
                      {task.project?.name && <> · Project: <strong>{task.project.name}</strong></>}
                      {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                        <> · <span>{task.subtasks.length} subtask{task.subtasks.length === 1 ? '' : 's'}</span></>
                      )}
                    </p>
                    {task.notes && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 border border-slate-200/60 rounded px-2 py-1 max-w-lg">
                        <span className="font-medium text-slate-700">Submission Note: </span>
                        {task.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {blockedTaskIds.has(String(task.id)) && (
                      <Badge status="danger">⚠ Blocked by Compliance</Badge>
                    )}
                    <Badge status="info">In Review</Badge>
                    <Link
                      to={PATHS.PM.TASK_DETAIL.replace(':id', task.id)}
                      className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                    >
                      View
                    </Link>
                    <Button variant="primary" size="sm" onClick={() => onApproveTask(task)}>
                      Approve & Complete
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onSendBackTask(task)}>
                      Send Back
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* — Extensions Tab — */}
        {activeTab === 'extensions' && (
          extensionRequests.length === 0 ? (
            <EmptyState
              title="No pending extension requests"
              description="Deadline extension requests submitted by Team Leads will appear here for approval or rejection."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {extensionRequests.map((ext) => (
                <div
                  key={ext.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 text-sm">{ext.title}</p>
                      <Badge status={['High', 'Critical'].includes(ext.priority) ? 'danger' : 'warning'}>
                        {ext.priority || 'Medium'}
                      </Badge>
                    </div>
                    {ext.description && (
                      <p className="text-xs text-slate-700 mt-1 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1.5 max-w-xl whitespace-pre-line">
                        {ext.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1.5">
                      Requested by{' '}
                      <strong>{ext.reportedBy?.fullName || ext.reportedBy?.email || 'Team Lead'}</strong>
                      {ext.createdAt && (
                        <> · {new Date(ext.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                      {ext.project?.name && <> · Project: <strong>{ext.project.name}</strong></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="primary" size="sm" onClick={() => onApproveExtension(ext)}>
                      Approve
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onRejectExtension(ext)}>
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
