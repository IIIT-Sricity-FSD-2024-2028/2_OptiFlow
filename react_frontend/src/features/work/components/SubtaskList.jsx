import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/FormField';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, Circle, Lock, GitBranch } from 'lucide-react';
import { deadlineInput } from './dateLimits';
import { getDependencyIds, getIncompletePrerequisites } from '../utils/scheduling';

export function SubtaskList({
  subtasks = [],
  readOnly = false,
  taskEstimatedHours = null,
  criticalPathIds = null,
  headerAction = null,
  onStatusToggle,
  onSubmitSubtask,
  onApproveSubtask,
  onSendBackSubtask,
  onRequestExtension,
  extensionRequests = [],
  submittedSubtaskIds = new Set(),
  onAddSubtask,
  onDeleteSubtask,
  currentUserId,
  members = [],
}) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !onAddSubtask) return;

    setIsAdding(true);
    try {
      await onAddSubtask(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    } finally {
      setIsAdding(false);
    }
  };

  const doneCount = subtasks.filter(st => {
    const s = String(st.status || '').toLowerCase();
    return s.includes('complete') || s.includes('review');
  }).length;
  const allocatedHours = subtasks.reduce(
    (sum, st) => sum + (st?.estimatedHours != null ? Number(st.estimatedHours) : 0),
    0
  );
  const budgetHours = taskEstimatedHours != null ? Number(taskEstimatedHours) : null;
  const remainingHours = budgetHours != null ? Math.max(0, Number((budgetHours - allocatedHours).toFixed(2))) : null;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex flex-wrap items-center gap-2">
            Subtasks
            {subtasks.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                {doneCount}/{subtasks.length} done
              </span>
            )}
            {(budgetHours > 0 || allocatedHours > 0) && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {budgetHours > 0
                  ? `${Number(allocatedHours.toFixed(2))}h / ${budgetHours}h allotted${remainingHours > 0 ? ` • ${remainingHours}h left` : ''}`
                  : `${Number(allocatedHours.toFixed(2))}h allotted`}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {onSubmitSubtask
              ? 'When a subtask is done, click Submit for review. Your Team Lead approves it.'
              : `${subtasks.length} subtask(s) defined`}
          </p>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      <div className="p-4">
        {subtasks.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">No subtasks defined yet.</p>
        ) : (
          <ul className="space-y-2">
            {subtasks.map((subtask, index) => {
              const subId = subtask.id || subtask.subtaskId || index;
              const status = String(subtask.status || '').toLowerCase();
              const isCompleted = status.includes('complete');
              const isInReview = ['in_review', 'pending_tl_review'].includes(status) || submittedSubtaskIds.has(subId);
              
              const assigneeId = subtask.assignedToId || subtask.assignedTo?.id || (typeof subtask.assignedTo === 'string' ? subtask.assignedTo : null);
              const isMine = !currentUserId || String(assigneeId) === String(currentUserId);
              // One-step submit: the assignee sends an open subtask to In_Review; only the
              // Team Lead or PM can mark it Completed (or send it back to Active).
              const subTitle = (subtask.title || '').trim().toLowerCase();
              const hasExtensionRequested = Boolean(subTitle) && extensionRequests.some(
                (e) => (
                  e.title?.toLowerCase().includes(`subtask extension request: ${subTitle}`) ||
                  e.description?.toLowerCase().includes(`subtask: "${subTitle}"`) ||
                  (e.description?.toLowerCase().includes('subtask:') && e.description?.toLowerCase().includes(subTitle))
                )
              );
              const canSubmit = isMine && !isCompleted && !isInReview && !submittedSubtaskIds.has(subId);
              const canRequestExtension = isMine && !isCompleted && !isInReview && !hasExtensionRequested && onRequestExtension;
              const incompleteDeps = !isCompleted ? getIncompletePrerequisites(subtask, subtasks) : [];
              const isWaitingOnDeps = incompleteDeps.length > 0;
              const allDepIds = getDependencyIds(subtask);
              const depTitles = allDepIds
                .map((depId) => {
                  const direct = subtask.dependencies?.find((d) => String(d.dependsOnSubtaskId || d.id) === depId)?.dependsOnSubtask;
                  if (direct?.title) return direct.title;
                  return subtasks.find((s) => String(s.id || s.subtaskId) === depId)?.title;
                })
                .filter(Boolean);
              const isCriticalPath = criticalPathIds instanceof Set && criticalPathIds.has(String(subId));

              const assignedUser = members.find(
                (m) => String(m.id || m.userId) === String(subtask.assignedToId || subtask.assignedTo)
              );
              const assigneeDisplayName =
                subtask.assignedToName ||
                (typeof subtask.assignedTo === 'object'
                  ? subtask.assignedTo?.fullName || subtask.assignedTo?.name
                  : null) ||
                assignedUser?.fullName ||
                assignedUser?.name ||
                (typeof subtask.assignedTo === 'string' && !subtask.assignedTo.includes('-')
                  ? subtask.assignedTo
                  : null);

              return (
                <li
                  key={subId}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    isCompleted
                      ? 'bg-emerald-50/40 border-emerald-100'
                      : isInReview
                      ? 'bg-purple-50/40 border-purple-100'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {/* Status Toggle — only for assigned user or leads */}
                  {!readOnly && onStatusToggle && (() => {
                    const canToggle = !currentUserId || !assigneeId || String(assigneeId) === String(currentUserId);
                    return canToggle ? (
                      <button
                        type="button"
                        onClick={() => onStatusToggle(subId, !isCompleted)}
                        className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {isCompleted || isInReview ? (
                          <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-purple-500'}`} />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    ) : (
                      <div className="mt-0.5">
                        {isCompleted || isInReview ? (
                          <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-purple-500'}`} />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    );
                  })()}
                  {!onStatusToggle && (
                    <div className="mt-0.5">
                      {isCompleted || isInReview ? (
                        <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-purple-500'}`} />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold ${
                        isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}
                    >
                      {subtask.title}
                    </p>
                    {subtask.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {subtask.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                      {assigneeDisplayName && (
                        <span>Assigned to: {assigneeDisplayName}</span>
                      )}
                      {subtask.estimatedHours != null && (
                        <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                          {Number(subtask.estimatedHours)}h
                        </span>
                      )}
                      {isCriticalPath && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                          <GitBranch className="w-2.5 h-2.5" /> Critical path
                        </span>
                      )}
                      {subtask.startDate && (subtask.dueDate || subtask.deadline) ? (
                        <span>
                          • {deadlineInput(subtask.startDate)} → {deadlineInput(subtask.dueDate || subtask.deadline)}
                        </span>
                      ) : (subtask.dueDate || subtask.deadline) ? (
                        <span>
                          • Due: {deadlineInput(subtask.dueDate || subtask.deadline)}
                        </span>
                      ) : null}
                      {depTitles.length > 0 && (
                        <span className="text-slate-500">
                          • After: {depTitles.join(', ')}
                        </span>
                      )}
                    </div>
                    {isWaitingOnDeps && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                        <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Waiting on prerequisite: {incompleteDeps.map((d) => d.title).join(', ')}</span>
                      </div>
                    )}
                    {subtask.reviewComment && !isCompleted && !isInReview && (
                      <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900" role="note">
                        <span className="font-semibold">Sent back for changes: </span>
                        <span className="whitespace-pre-wrap">{subtask.reviewComment}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={subtask.status || (isCompleted ? 'Completed' : 'Active')} />
                    {/* Submit for Review button — shown when open and not yet submitted */}
                    {!readOnly && onSubmitSubtask && canSubmit && (
                      <button
                        type="button"
                        disabled={isWaitingOnDeps}
                        onClick={() => !isWaitingOnDeps && onSubmitSubtask(subId)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${
                          isWaitingOnDeps
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-pointer'
                        }`}
                        title={
                          isWaitingOnDeps
                            ? `Locked until prerequisite finishes: ${incompleteDeps.map((d) => d.title).join(', ')}`
                            : 'Send this subtask to your Team Lead for review'
                        }
                      >
                        {isWaitingOnDeps ? 'Waiting on dep.' : 'Submit for review'}
                      </button>
                    )}
                    {/* Member Subtask Extension Button / Status */}
                    {!readOnly && hasExtensionRequested && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        Extension Requested
                      </span>
                    )}
                    {!readOnly && canRequestExtension && (
                      <button
                        type="button"
                        onClick={() => onRequestExtension(subtask)}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap cursor-pointer"
                        title="Request deadline extension for this subtask from your Team Lead"
                      >
                        Request Extension
                      </button>
                    )}
                    {isInReview && !readOnly && (onApproveSubtask || onSendBackSubtask) && (
                      <>
                        {onApproveSubtask && (
                          <button
                            type="button"
                            disabled={isWaitingOnDeps}
                            onClick={() => !isWaitingOnDeps && onApproveSubtask(subtask)}
                            title={
                              isWaitingOnDeps
                                ? `Blocked until prerequisite finishes: ${incompleteDeps.map((d) => d.title).join(', ')}`
                                : 'Approve subtask'
                            }
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded transition-colors whitespace-nowrap ${
                              isWaitingOnDeps
                                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                            }`}
                          >
                            Approve
                          </button>
                        )}
                        {onSendBackSubtask && (
                          <button
                            type="button"
                            onClick={() => onSendBackSubtask(subtask)}
                            className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Send Back
                          </button>
                        )}
                      </>
                    )}
                    {isInReview && !(onApproveSubtask || onSendBackSubtask) && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                        In Review
                      </span>
                    )}
                    {!readOnly && onDeleteSubtask && (
                      <button
                        type="button"
                        onClick={() => onDeleteSubtask(subId)}
                        className="text-slate-400 hover:text-rose-600 text-xs px-1 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!readOnly && onAddSubtask && (
          <form onSubmit={handleAdd} className="mt-4 flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="New subtask title..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                disabled={isAdding}
              />
            </div>
            <Button type="submit" variant="primary" size="sm" disabled={isAdding || !newSubtaskTitle.trim()}>
              Add
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
