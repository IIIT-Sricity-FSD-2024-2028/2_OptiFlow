// Modals used by the Team Lead task page (team-lead/pages/TaskDetail.jsx).
// Presentational only: the page owns all state and API calls and passes them in.
import { Button } from '../../../../shared/components/Button';
import { Modal } from '../../../../shared/components/Modal';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { todayInput, tomorrowInput, deadlineInput } from '../../components/dateLimits';
import { BLOCKER_TYPES, EVIDENCE_TYPES } from './taskOptions';

/** Team Lead submits the parent task to the Project Manager for review. */
export function SubmitToPmModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  compliance,
  taskEvidence,
  file,
  onFileChange,
  fileTitle,
  onFileTitleChange,
  fileType,
  onFileTypeChange,
  notes,
  onNotesChange,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Work for Review"
      footer={<>
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={submitting || (compliance.evidenceBlocked && taskEvidence.length === 0 && !file)}
        >
          {submitting ? 'Submitting…' : 'Confirm & Submit to PM'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Submit your completed deliverables and handover summary. The task will move into <strong>In Review</strong> for Project Manager audit and approval.
        </p>

        {/* Compliance & Deliverables Status Box */}
        {taskEvidence.length > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              <span>{taskEvidence.length} Deliverable Artifact(s) Attached</span>
            </div>
            <ul className="list-disc list-inside text-emerald-700 pl-1">
              {taskEvidence.map((e) => (
                <li key={e.id} className="truncate">
                  <strong>{e.title || 'Deliverable'}</strong> ({e.evidenceType || 'Document'})
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <span>📎 Attach Deliverable Evidence (Recommended)</span>
            </div>
            <p className="text-[11px] text-amber-800">
              {compliance.hasRules
                ? 'This task is governed by compliance rules requiring deliverable verification.'
                : 'You can attach verification files, test reports, or documentation directly with your submission.'}
            </p>

            <div className="space-y-2.5 pt-1">
              <FormField label="Artifact Title">
                <Input
                  placeholder="e.g. Implementation Report, Final Output PDF"
                  value={fileTitle}
                  onChange={(e) => onFileTitleChange(e.target.value)}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Artifact Type">
                  <Select value={fileType} onChange={(e) => onFileTypeChange(e.target.value)}>
                    {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </FormField>
                <FormField label="File Attachment">
                  <input
                    type="file"
                    className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer pt-1"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        onFileChange(f);
                        if (!fileTitle) onFileTitleChange(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}

        {/* Completion Summary */}
        <FormField label="Handover Notes (saved with the attached deliverable)">
          <Textarea
            rows={4}
            placeholder="Describe deliverables completed, links to documents, test results, or next steps..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}

export function ReportBlockerModal({ isOpen, onClose, onSubmit, blockerType, onBlockerTypeChange, description, onDescriptionChange }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Blocker"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit}>Report Blocker</Button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="Blocker Type">
          <Select value={blockerType} onChange={(e) => onBlockerTypeChange(e.target.value)}>
            {BLOCKER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>
        <FormField label="Description" required>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            placeholder="Describe the blocker in detail..."
          />
        </FormField>
      </div>
    </Modal>
  );
}

export function ExtensionRequestModal({ isOpen, onClose, onSubmit, date, onDateChange, reason, onReasonChange }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Deadline Extension"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit}>Submit Request</Button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="New Deadline" required>
          <Input type="date" min={tomorrowInput()} value={date} onChange={(e) => onDateChange(e.target.value)} />
        </FormField>
        <FormField label="Reason" required>
          <Textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            placeholder="Explain why more time is needed..."
          />
        </FormField>
      </div>
    </Modal>
  );
}

export function CreateSubtaskModal({ isOpen, onClose, onSave, saving, error, form, onFormChange, user, members, taskDueDate }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Subtask"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Assign Subtask'}</Button>
      </>}>
      <div className="space-y-4">
        {error && (
          <div
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}
        <FormField label="Subtask Title" required>
          <Input value={form.title} onChange={e => onFormChange(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" />
        </FormField>
        <FormField label="Assign To">
          <Select value={form.assignee} onChange={e => onFormChange(f => ({ ...f, assignee: e.target.value }))}>
            <option value="">— Unassigned —</option>
            <option value={user.id}>{user.fullName || 'Me'}</option>
            {members.map(m => <option key={m.id || m.userId} value={m.id || m.userId}>{m.fullName || m.name || 'Member #' + m.id}</option>)}
          </Select>
        </FormField>
        <FormField label="Deadline">
          <Input type="date" min={todayInput()} max={deadlineInput(taskDueDate)} value={form.due} onChange={e => onFormChange(f => ({ ...f, due: e.target.value }))} />
        </FormField>
      </div>
    </Modal>
  );
}
