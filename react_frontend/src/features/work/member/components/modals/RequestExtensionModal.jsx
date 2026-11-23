import React, { useState } from 'react';
import { Modal } from '../../../../../shared/components/Modal';
import { Button } from '../../../../../shared/components/Button';
import { FormField, Input, Textarea } from '../../../../../shared/components/FormField';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../shared/components/Toast';
import * as escalationsApi from '../../../../../services/api/escalations';
import { deadlineInput, minExtensionDateInput } from '../../../components/dateLimits';

export function RequestExtensionModal({
  isOpen,
  onClose,
  taskId,
  projectId,
  managerId,
  taskTitle = 'Task',
  currentDeadline,
  parentTaskDeadline,
  onSuccess,
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minDate = minExtensionDateInput(currentDeadline);
  const maxDate = deadlineInput(parentTaskDeadline);

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
      toast.warning(`Proposed deadline cannot exceed the parent task deadline (${maxDate}) set by the Project Manager.`);
      return;
    }

    setSubmitting(true);
    try {
      await escalationsApi.create({
        taskId: String(taskId),
        projectId,
        title: `Extension Request: ${taskTitle}`,
        description: `Requested new deadline: ${extDate}. Reason: ${extReason.trim()}`,
        blockerType: 'Extension Request',
        priority: 'Medium',
        reportedBy: user?.id,
        targetManagerId: managerId ? String(managerId) : undefined,
      });

      toast.success('Extension request sent to leadership.');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Request Deadline Extension">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          This sends an urgent extension request to your team leader detailing the new proposed deadline and reason.
        </p>

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
          {currentDeadline && (
            <p className="text-xs text-slate-500 mt-1">
              Current deadline: <span className="font-medium text-slate-700">{deadlineInput(currentDeadline)}</span> (extension must be later than current deadline)
            </p>
          )}
          {maxDate && (
            <p className="text-xs text-amber-700 mt-1">
              Task deadline (PM limit): <span className="font-semibold text-amber-900">{maxDate}</span> (cannot extend beyond this)
            </p>
          )}
        </FormField>

        <FormField label="Reason for Extension" required>
          <Textarea
            rows={3}
            placeholder="Explain why extra time is required (e.g. dependency delays, unexpected technical blockers)..."
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
