// Modals used by the Team Lead dashboard (team-lead/pages/Dashboard.jsx).
// Presentational only: the page owns all state and API calls and passes them in.
import { Button } from '../../../../shared/components/Button';
import { Modal } from '../../../../shared/components/Modal';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { todayInput, deadlineInput } from '../../components/dateLimits';

export function DashboardSubtaskModal({
  isOpen,
  onClose,
  onSave,
  saving,
  error,
  parentTaskId,
  onParentTaskChange,
  parentLocked,
  parentTasks,
  title,
  onTitleChange,
  assignee,
  onAssigneeChange,
  user,
  teamMembers,
  deadline,
  onDeadlineChange,
  parentDueDate,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create subtask"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button variant="primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save & assign'}
          </Button>
        </div>
      }
    >
      {error && (
        <div
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="space-y-4">

        <p className="text-sm text-gray-500">
          {parentTaskId
            ? `Breaking down task #${parentTaskId}`
            : 'Pick the parent task this subtask rolls up under.'}
        </p>

        <FormField label="Parent task" required>
          <Select
            value={parentTaskId}
            onChange={(event) => onParentTaskChange(event.target.value)}
            disabled={parentLocked}
            options={[
              { value: '', label: 'Select parent task…' },
              ...parentTasks.map((task) => ({ value: task.id, label: task.title })),
            ]}
          />
        </FormField>

        <FormField label="Subtask title" required>
          <Input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="What should be done?"
          />
        </FormField>

        <FormField label="Assign to">
          <Select
            value={assignee}
            onChange={(event) => onAssigneeChange(event.target.value)}
            options={[
              { value: '', label: 'Select team member…' },
              { value: user.id, label: user.fullName || 'Me' },
              ...teamMembers.map((member) => ({
                value: member.id,
                label: member.fullName || member.name || member.email || `Member ${member.id}`,
              })),
            ]}
          />
        </FormField>

        <FormField label="Deadline">
          <Input
            type="date"
            min={todayInput()}
            max={deadlineInput(parentDueDate)}
            value={deadline}
            onChange={(event) => onDeadlineChange(event.target.value)}
          />
        </FormField>

      </div>
    </Modal>
  );
}

export function SendBackSubtaskModal({ subtask, onClose, onConfirm, sending, error, reason, onReasonChange }) {
  return (
    <Modal
      isOpen={Boolean(subtask)}
      onClose={onClose}
      title="Send subtask back"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={sending || !reason.trim()}>
            {sending ? 'Sending…' : 'Send back'}
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
          <strong>{subtask?.title}</strong>
          {subtask?.assignedToName && <> · {subtask.assignedToName}</>} will see this comment on their task.
        </p>
        <FormField label="Reason for sending back" required>
          <Textarea
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="What needs to change before you can approve it?"
            disabled={sending}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export function RejectExtensionModal({ extension, isOpen, onClose, onConfirm, rejecting, error, reason, onReasonChange }) {
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
          {extension?.reportedBy?.fullName && <> · Requested by {extension.reportedBy.fullName}</>}
        </p>
        <FormField label="Reason for rejection / comment" required>
          <Textarea
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Explain why the extension request is rejected..."
            disabled={rejecting}
          />
        </FormField>
      </div>
    </Modal>
  );
}
