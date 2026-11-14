import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/FormField';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, Circle } from 'lucide-react';

export function SubtaskList({
  subtasks = [],
  readOnly = false,
  onStatusToggle,
  onSubmitSubtask,
  submittedSubtaskIds = new Set(),
  onAddSubtask,
  onDeleteSubtask,
  currentUserId,
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

  const doneCount = subtasks.filter(st => String(st.status || '').toLowerCase().includes('complete') || String(st.status || '').toLowerCase().includes('review')).length;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            Subtasks
            {subtasks.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                {doneCount}/{subtasks.length} done
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {onSubmitSubtask
              ? 'When a subtask is done, click Submit for review. Your Team Lead approves it.'
              : `${subtasks.length} subtask(s) defined`}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {subtasks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No subtasks defined for this deliverable.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {subtasks.map((subtask) => {
              const subId = subtask.id || subtask.subtaskId;
              const status = String(subtask.status || '').toLowerCase();
              const isCompleted = status.includes('complete');
              const isInReview = ['in_review', 'pending_tl_review'].includes(status);
              // One-step submit: the assignee sends an open subtask to In_Review; only the
              // Team Lead or PM can mark it Completed (or send it back to Active).
              const assigneeId = subtask.assignedToId || subtask.assignedTo?.id;
              const isMine = !currentUserId || String(assigneeId) === String(currentUserId);
              const canSubmit = isMine && !isCompleted && !isInReview && !submittedSubtaskIds.has(subId);

              return (
                <li key={subId} className="py-3 flex items-start gap-3">
                  {!readOnly && onStatusToggle && (() => {
                    const assignedId = subtask.assignedToId || subtask.assignedTo?.id;
                    const canToggle = !currentUserId || !assignedId || String(assignedId) === String(currentUserId);
                    return canToggle ? (
                      <button
                        type="button"
                        onClick={() => onStatusToggle(subId, !isCompleted)}
                        className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {isCompleted || isInReview ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    ) : (
                      <div className="mt-0.5">
                        {isCompleted || isInReview ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    );
                  })()}
                  {!onStatusToggle && onSubmitSubtask && (
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
                        isCompleted || isInReview ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}
                    >
                      {subtask.title}
                    </p>
                    {(subtask.assignedTo || subtask.assignedToName) && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Assigned to:{' '}
                        {typeof subtask.assignedTo === 'object'
                          ? subtask.assignedTo?.fullName || subtask.assignedTo?.name
                          : subtask.assignedTo || subtask.assignedToName}
                      </p>
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
                    {/* Submit for Review button — shown when completed but not yet submitted this session */}
                    {!readOnly && onSubmitSubtask && canSubmit && (
                      <button
                        type="button"
                        onClick={() => onSubmitSubtask(subId)}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors whitespace-nowrap"
                        title="Send this subtask to your Team Lead for review"
                      >
                        Submit for review
                      </button>
                    )}
                    {isInReview && (
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
