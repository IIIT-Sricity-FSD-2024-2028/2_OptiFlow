import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../shared/components/Modal';
import { Button } from '../../../../../shared/components/Button';
import { FormField, Input, Select, Textarea } from '../../../../../shared/components/FormField';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../shared/components/Toast';
import { BLOCKER_TYPES } from '../../../constants';
import * as escalationsApi from '../../../../../services/api/escalations';
import * as tasksApi from '../../../../../services/api/tasks';

export function ReportBlockerModal({
  isOpen,
  onClose,
  tasks = [],
  taskId = '',
  projectId = '',
  managerId = '',
  onSuccess,
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [selectedTaskId, setSelectedTaskId] = useState(taskId || '');
  const [blockerType, setBlockerType] = useState(BLOCKER_TYPES[0]);
  const [priority, setPriority] = useState('High');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTaskId(taskId || (tasks[0]?.id || ''));
      setBlockerType(BLOCKER_TYPES[0]);
      setPriority('High');
      setTitle('');
      setDescription('');
    }
  }, [isOpen, taskId, tasks]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const finalTaskId = taskId || selectedTaskId;
    if (!finalTaskId) {
      toast.warning('Please select a task.');
      return;
    }
    const finalDesc = description.trim() || title.trim();
    if (!finalDesc) {
      toast.warning('Please describe the blocker in detail.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTask = tasks.find((t) => String(t.id || t.taskId) === String(finalTaskId));
      const finalProjId = projectId || selectedTask?.projectId || selectedTask?.project?.id;
      const finalTitle = title.trim() || `Blocked: ${selectedTask?.title || 'Task'}`;

      await escalationsApi.create({
        taskId: String(finalTaskId),
        projectId: finalProjId,
        title: finalTitle,
        description: finalDesc,
        blockerType,
        priority,
        reportedBy: user?.id,
        targetManagerId: managerId ? String(managerId) : undefined,
      });

      // Update task status to Blocked
      try {
        await tasksApi.update(finalTaskId, { status: 'Blocked' });
      } catch (_) {}

      toast.success('Blocker logged and leadership alerted.');
      onSuccess?.(finalTaskId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to report blocker.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Blocker / Escalation">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!taskId && tasks.length > 0 && (
          <FormField label="Blocked Task" required>
            <Select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={submitting}
            >
              <option value="">Select a task...</option>
              {tasks.map((t) => (
                <option key={t.id || t.taskId} value={t.id || t.taskId}>
                  {t.title}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Blocker Category" required>
            <Select
              value={blockerType}
              onChange={(e) => setBlockerType(e.target.value)}
              disabled={submitting}
            >
              {BLOCKER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Priority / Urgency" required>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={submitting}
            >
              <option value="Critical">Critical (Immediate STOP)</option>
              <option value="High">High (Impacting delivery)</option>
              <option value="Medium">Medium (Attention needed)</option>
              <option value="Low">Low (Minor obstacle)</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Issue Summary">
          <Input
            placeholder="e.g. Missing API credentials or schema definition"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="Detailed Description" required>
          <Textarea
            rows={4}
            placeholder="Describe what is preventing progress and what is needed to unblock..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Alert Leadership'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
