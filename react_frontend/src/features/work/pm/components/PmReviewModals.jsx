import React from 'react';
import { Modal } from '../../../../shared/components/Modal';
import { Button } from '../../../../shared/components/Button';
import { FormField, Textarea } from '../../../../shared/components/FormField';

export function SendBackTaskModal({
  task,
  isOpen,
  onClose,
  onConfirm,
  sending,
  error,
  reason,
  onReasonChange,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Task Back for Revision"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={sending || !reason.trim()}>
            {sending ? 'Sending back…' : 'Send Back'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <p className="text-sm text-gray-500">
          <strong>{task?.title}</strong>
          {task?.assignedTo?.fullName && <> · assigned to {task.assignedTo.fullName}</>} will be reverted to Active status with your revision notes.
        </p>
        <FormField label="Reason for sending back" required>
          <Textarea
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Explain what deliverables need revision before approval..."
            disabled={sending}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export function RejectExtensionModal({
  extension,
  isOpen,
  onClose,
  onConfirm,
  rejecting,
  error,
  reason,
  onReasonChange,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reject Extension Request"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={rejecting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={rejecting || !reason.trim()}>
            {rejecting ? 'Rejecting…' : 'Reject Extension'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <p className="text-sm text-gray-500">
          <strong>{extension?.title}</strong>
          {extension?.reportedBy?.fullName && <> · requested by {extension.reportedBy.fullName}</>}
        </p>
        <FormField label="Rejection Reason / Feedback" required>
          <Textarea
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Explain why this extension request cannot be granted..."
            disabled={rejecting}
          />
        </FormField>
      </div>
    </Modal>
  );
}
