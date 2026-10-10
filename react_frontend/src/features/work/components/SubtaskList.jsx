import React, { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/FormField';
import { Badge } from '../../../shared/components/Badge';

export function SubtaskList({
  subtasks = [],
  readOnly = false,
  onStatusToggle,
  onAddSubtask,
  onDeleteSubtask
}) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !onAddSubtask) return;
    
    setIsAdding(true);
    try {
      await onAddSubtask(newSubtaskTitle);
      setNewSubtaskTitle('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-900">Subtasks</h3>
          <p className="text-xs text-gray-500 mt-1">{subtasks.length} subtask(s)</p>
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        {subtasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No subtasks available.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {subtasks.map((subtask) => {
              const isCompleted = subtask.status?.toLowerCase().includes('complete');
              
              return (
                <li key={subtask.id} className="py-3 flex items-start gap-3">
                  {!readOnly && onStatusToggle && (
                    <div className="mt-1">
                      <input 
                        type="checkbox" 
                        checked={isCompleted}
                        onChange={(e) => onStatusToggle(subtask.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {subtask.title}
                    </p>
                    {(subtask.assignedTo || subtask.assignedToName) && (
                      <p className="text-xs text-gray-500">
                        Assigned to:{' '}
                        {typeof subtask.assignedTo === 'object'
                          ? (subtask.assignedTo?.fullName || subtask.assignedTo?.name || subtask.assignedTo?.email || 'Assigned')
                          : (subtask.assignedTo || subtask.assignedToName)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={isCompleted ? 'success' : 'default'}>
                      {subtask.status?.replace(/_/g, ' ') || 'Pending'}
                    </Badge>
                    {!readOnly && onDeleteSubtask && (
                      <button 
                        onClick={() => onDeleteSubtask(subtask.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
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
            <Button type="submit" variant="primary" disabled={isAdding || !newSubtaskTitle.trim()}>
              Add
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
