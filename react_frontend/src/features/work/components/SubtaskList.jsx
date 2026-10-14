import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/FormField';
import { StatusBadge } from './StatusBadge';
import { CheckCircle2, Circle } from 'lucide-react';

export function SubtaskList({
  subtasks = [],
  readOnly = false,
  onStatusToggle,
  onAddSubtask,
  onDeleteSubtask,
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

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Execution Subtasks</h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtasks.length} subtask(s) defined</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {subtasks.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No subtasks defined for this deliverable.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {subtasks.map((subtask) => {
              const subId = subtask.id || subtask.subtaskId;
              const isCompleted = String(subtask.status || '').toLowerCase().includes('complete');

              return (
                <li key={subId} className="py-3 flex items-start gap-3">
                  {!readOnly && onStatusToggle ? (
                    <button
                      type="button"
                      onClick={() => onStatusToggle(subId, !isCompleted)}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  ) : (
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
                    {(subtask.assignedTo || subtask.assignedToName) && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Assigned to:{' '}
                        {typeof subtask.assignedTo === 'object'
                          ? subtask.assignedTo?.fullName || subtask.assignedTo?.name
                          : subtask.assignedTo || subtask.assignedToName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={subtask.status || (isCompleted ? 'Completed' : 'Pending')} />
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
