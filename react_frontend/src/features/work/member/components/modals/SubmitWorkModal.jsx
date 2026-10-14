import React, { useState } from 'react';
import { Modal } from '../../../../../shared/components/Modal';
import { Button } from '../../../../../shared/components/Button';
import { FormField, Textarea } from '../../../../../shared/components/FormField';
import { useToast } from '../../../../../shared/components/Toast';
import * as tasksApi from '../../../../../services/api/tasks';

export function SubmitWorkModal({ isOpen, onClose, taskId, onSuccess }) {
  const toast = useToast();
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!submitNotes.trim()) {
      toast.warning('Please provide a brief summary of completed work.');
      return;
    }

    setSubmitting(true);
    try {
      await tasksApi.update(taskId, {
        status: 'Pending_TL_Review',
        notes: submitNotes.trim(),
      });
      toast.success('Work submitted to your team leader for review!');
      setSubmitNotes('');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to submit work for review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Work for Review">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Submitting moves this task into <strong>Pending TL Review</strong>. Your team leader will be notified to review the deliverable.
        </p>

        <FormField label="Completion Summary & Notes" required>
          <Textarea
            rows={4}
            placeholder="Describe what was done, link any pull requests, docs, or artifacts..."
            value={submitNotes}
            onChange={(e) => setSubmitNotes(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || !submitNotes.trim()}>
            {submitting ? 'Submitting...' : 'Confirm Submission'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
