import React, { useState } from 'react';
import { Modal } from '../../../../../shared/components/Modal';
import { Button } from '../../../../../shared/components/Button';
import { FormField, Input, Textarea } from '../../../../../shared/components/FormField';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../shared/components/Toast';
import { useDispatch } from 'react-redux';
import { createEscalation } from '../../../../../store/escalations';
import { deadlineInput, minExtensionDateInput, maxExtensionDateInput } from '../../../components/dateLimits';

export function RequestExtensionModal({
  isOpen,
  onClose,
  taskId,
  subtaskId,
  subtaskTitle,
  projectId,
  managerId,
  taskTitle = 'Task',
  currentDeadline,
  parentTaskDeadline,
  onSuccess,
}) {
  const { user } = useAuth();
  const toast = useToast();
  const dispatch = useDispatch();

  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minDate = minExtensionDateInput(currentDeadline);
  const maxDate = maxExtensionDateInput(parentTaskDeadline);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!extDate || !extReason.trim()) {
      toast.warning('Please select a proposed date and give a valid reason.');
      return;
    }

    if (minDate && extDate < minDate) {
      toast.warning(`Proposed deadline must be on or after ${minDate} (later than the current deadline).`);
      return;
    }

    if (maxDate && extDate > maxDate) {
      toast.warning(`Proposed subtask deadline cannot exceed parent task deadline (${maxDate}).`);
      return;
    }

    setSubmitting(true);
    try {
      const isSubtask = Boolean(subtaskId || subtaskTitle);
      const title = isSubtask
        ? `Subtask Extension Request: ${subtaskTitle || taskTitle}`
        : `Extension Request: ${taskTitle}`;
      const desc = isSubtask
        ? `Subtask: "${subtaskTitle}". Requested new deadline: ${extDate}. Parent task deadline: ${deadlineInput(parentTaskDeadline) || 'N/A'}. Reason: ${extReason.trim()}`
        : `Requested new deadline: ${extDate}. Reason: ${extReason.trim()}`;

      await dispatch(createEscalation({
        taskId: String(taskId),
        projectId,
        title,
        description: desc,
        blockerType: 'Extension Request',
        priority: 'Medium',
        reportedBy: user?.id,
        targetManagerId: managerId ? String(managerId) : undefined,
      })).unwrap();

      toast.success('Extension request sent to your Team Lead.');
      setExtDate('');
      setExtReason('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit extension request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Subtask Deadline Extension">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          This sends an urgent extension request to your Team Lead detailing the new proposed deadline and reason.
        </p>

        {subtaskTitle && (
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-200">
            <span className="font-semibold text-slate-900">Subtask: </span>
            {subtaskTitle}
          </div>
        )}

        <FormField label="Proposed New Due Date" required>
          <Input
            type="date"
            min={minDate}
            max={maxDate}
            value={extDate}
            onChange={(e) => setExtDate(e.target.value)}
            disabled={submitting}
            required
          />
          <div className="space-y-0.5 mt-1">
            {currentDeadline && (
              <p className="text-xs text-slate-500">
                Current deadline: <span className="font-medium text-slate-700">{deadlineInput(currentDeadline)}</span> (must be after current deadline)
              </p>
            )}
            {parentTaskDeadline && (
              <p className="text-xs text-slate-500">
                Task deadline: <span className="font-medium text-slate-700">{deadlineInput(parentTaskDeadline)}</span> (must be on or before task deadline)
              </p>
            )}
          </div>
        </FormField>

        <FormField label="Reason for Extension" required>
          <Textarea
            rows={3}
            placeholder="Explain why extra time is required for this subtask..."
            value={extReason}
            onChange={(e) => setExtReason(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || !extDate || !extReason.trim()}>
            {submitting ? 'Submitting...' : 'Send Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
