// Modals used by the Team Lead task page (team-lead/pages/TaskDetail.jsx).
// Presentational only: the page owns all state and API calls and passes them in.
import { Button } from '../../../../shared/components/Button';
import { Modal } from '../../../../shared/components/Modal';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { todayInput, deadlineInput, minExtensionDateInput } from '../../components/dateLimits';
import { availableWorkingHours, DEFAULT_POLICY } from '../../utils/scheduling';
import { BLOCKER_TYPES, EVIDENCE_TYPES } from './taskOptions';

/** Team Lead submits the parent task to the Project Manager for review. */
export function SubmitToPmModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  compliance,
  taskEvidence,
  allSubtasksComplete = true,
  completedSubtasks = 0,
  totalSubtasks = 0,
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
          disabled={submitting || !allSubtasksComplete || (compliance.evidenceBlocked && taskEvidence.length === 0 && !file)}
        >
          {submitting ? 'Submitting…' : 'Confirm & Submit to PM'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        {!allSubtasksComplete && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
            <span className="font-semibold">All subtasks are not complete ({completedSubtasks}/{totalSubtasks} completed).</span>
            <span>You cannot submit this task until all subtasks have been completed.</span>
          </div>
        )}

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

export function ExtensionRequestModal({
  isOpen,
  onClose,
  onSubmit,
  date,
  onDateChange,
  reason,
  onReasonChange,
  currentDeadline,
}) {
  const minDate = minExtensionDateInput(currentDeadline);
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
          <Input type="date" min={minDate} value={date} onChange={(e) => onDateChange(e.target.value)} />
          {currentDeadline && (
            <p className="text-xs text-gray-500 mt-1">
              Current deadline: <span className="font-medium text-gray-700">{deadlineInput(currentDeadline)}</span> (extension must be later than current deadline)
            </p>
          )}
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

export function CreateSubtaskModal({
  isOpen,
  onClose,
  onSave,
  saving,
  error,
  form,
  onFormChange,
  user,
  members,
  taskDueDate,
  taskEstimatedHours = null,
  subtasks = [],
  scheduleAnalysis = null,
}) {
  const policy = scheduleAnalysis?.policy || DEFAULT_POLICY;
  const memberCapacities = scheduleAnalysis?.memberCapacities || {};
  const latestRecommendedDue = scheduleAnalysis?.latestRecommendedSubtaskDue || null;

  const budget = taskEstimatedHours != null ? Number(taskEstimatedHours) : null;
  const allocated = subtasks.reduce(
    (sum, st) => sum + (st?.estimatedHours != null ? Number(st.estimatedHours) : 0),
    0
  );
  const remaining = budget != null ? Math.max(0, Number((budget - allocated).toFixed(2))) : null;
  const inputHours = form.estimatedHours !== '' && form.estimatedHours != null ? Number(form.estimatedHours) : 0;
  const exceedsBudget = budget != null && inputHours > remaining + 1e-6;
  const allocPct = budget > 0 ? Math.min(100, Math.round(((allocated + (Number.isFinite(inputHours) ? inputHours : 0)) / budget) * 100)) : 0;

  const selectedDepIds = Array.isArray(form.dependsOnIds) ? form.dependsOnIds.map(String) : [];
  const latestDepDue = selectedDepIds.reduce((latest, depId) => {
    const dep = subtasks.find((s) => String(s.id || s.subtaskId) === depId);
    const depDay = deadlineInput(dep?.dueDate || dep?.deadline);
    if (!depDay) return latest;
    return !latest || depDay > latest ? depDay : latest;
  }, null);

  const effectiveStart = form.startDate || latestDepDue || todayInput();
  const windowCapacityHours = form.due
    ? availableWorkingHours(effectiveStart, form.due, policy)
    : null;
  const exceedsWindowCapacity =
    windowCapacityHours != null && inputHours > 0 && inputHours > windowCapacityHours;
  const strictBlockTriggered = Boolean(policy?.enforceCapacityBlock) && exceedsWindowCapacity;
  const insideReviewBuffer =
    Boolean(form.due && latestRecommendedDue && form.due > latestRecommendedDue);
  const selectedMemberCap = form.assignee ? memberCapacities[String(form.assignee)] : null;
  const dateOrderInvalid = Boolean(form.startDate && form.due && form.startDate > form.due);
  const depDateInvalid = Boolean(latestDepDue && ((form.startDate && form.startDate < latestDepDue) || (form.due && form.due < latestDepDue)));

  const minDueBound = [todayInput(), form.startDate, latestDepDue].filter(Boolean).sort().pop();

  const toggleDependency = (depId) => {
    const idStr = String(depId);
    onFormChange((f) => {
      const current = Array.isArray(f.dependsOnIds) ? f.dependsOnIds.map(String) : [];
      const next = current.includes(idStr)
        ? current.filter((x) => x !== idStr)
        : [...current, idStr];
      return { ...f, dependsOnIds: next };
    });
  };

  const memberLoad = (memberId) => {
    const mine = subtasks.filter((st) => String(st.assignedToId || st.assignedTo?.id || '') === String(memberId));
    const hrs = mine.reduce((sum, st) => sum + (st?.estimatedHours != null ? Number(st.estimatedHours) : 0), 0);
    return { count: mine.length, hrs };
  };

  const renderMemberOption = (m) => {
    const id = m.id || m.userId;
    const name = m.fullName || m.name || `Member #${id}`;
    const cap = memberCapacities[String(id)];
    const load = memberLoad(id);
    const loadText = cap
      ? ` (${cap.activeSubtasksCount} active · ${cap.windowHours}h${cap.windowCapacityHours != null ? `/${cap.windowCapacityHours}h` : ''})`
      : load.count > 0
      ? ` (${load.count} subtask${load.count > 1 ? 's' : ''}${load.hrs > 0 ? ` · ${load.hrs}h` : ''})`
      : '';
    return (
      <option key={id} value={id}>
        {name}{m.jobTitle ? ` — ${m.jobTitle}` : ''}{loadText}
      </option>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Subtask"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={saving || exceedsBudget || strictBlockTriggered || dateOrderInvalid || depDateInvalid}
        >
          {saving ? 'Saving…' : 'Assign Subtask'}
        </Button>
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

        {budget > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Task Hours Budget</span>
              <span className="font-semibold text-slate-900">
                {allocated}h allocated / {budget}h total ({remaining}h left)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${exceedsBudget ? 'bg-rose-500' : 'bg-blue-600'}`}
                style={{ width: `${allocPct}%` }}
              />
            </div>
          </div>
        )}

        <FormField label="Subtask Title" required>
          <Input
            value={form.title}
            onChange={e => onFormChange(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Implement OAuth token exchange"
          />
        </FormField>

        <FormField label="Scope & Acceptance Notes">
          <Textarea
            rows={2}
            value={form.description || ''}
            onChange={e => onFormChange(f => ({ ...f, description: e.target.value }))}
            placeholder="Specify what deliverable is expected from this subtask..."
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <FormField
              label="Estimated Hours"
              hint={remaining != null ? `Up to ${remaining}h remaining` : 'Optional effort allocation'}
            >
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.estimatedHours ?? ''}
                onChange={e => onFormChange(f => ({ ...f, estimatedHours: e.target.value }))}
                placeholder={remaining != null ? `e.g. ${Math.min(remaining, 8)}` : 'e.g. 4'}
              />
            </FormField>
            {remaining > 0 && Number(form.estimatedHours || 0) !== remaining && (
              <button
                type="button"
                onClick={() => onFormChange(f => ({ ...f, estimatedHours: String(remaining) }))}
                className="mt-1 text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
              >
                Use remaining ({remaining}h)
              </button>
            )}
            {exceedsBudget && (
              <p className="mt-1 text-[11px] font-medium text-rose-600">
                Exceeds remaining task budget ({remaining}h).
              </p>
            )}
          </div>

          <FormField
            label="Start Date"
            hint={latestDepDue ? `After prerequisite (${latestDepDue})` : 'Optional schedule start'}
          >
            <Input
              type="date"
              min={latestDepDue || todayInput()}
              max={form.due || deadlineInput(taskDueDate)}
              value={form.startDate || ''}
              onChange={e => onFormChange(f => ({ ...f, startDate: e.target.value }))}
            />
          </FormField>

          <FormField
            label="Deadline"
            hint={latestRecommendedDue ? `Target by ${latestRecommendedDue}` : undefined}
          >
            <Input
              type="date"
              min={minDueBound}
              max={deadlineInput(taskDueDate)}
              value={form.due}
              onChange={e => onFormChange(f => ({ ...f, due: e.target.value }))}
            />
          </FormField>
        </div>

        {(exceedsWindowCapacity || insideReviewBuffer || dateOrderInvalid || depDateInvalid) && (
          <div className="space-y-1.5 text-xs">
            {dateOrderInvalid && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 font-medium">
                Start date cannot be after deadline.
              </p>
            )}
            {depDateInvalid && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 font-medium">
                Schedule dates cannot precede selected prerequisite due date ({latestDepDue}).
              </p>
            )}
            {exceedsWindowCapacity && (
              <p className={`rounded-lg border px-3 py-2 font-medium ${strictBlockTriggered ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                This subtask needs {inputHours}h, which is more than the {windowCapacityHours}h available ({policy.workHoursPerDay}h/day) between {effectiveStart} and {form.due}.
              </p>
            )}
            {insideReviewBuffer && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 font-medium">
                Deadline leaves too little time for final review — finish by {latestRecommendedDue} to keep the review window safe.
              </p>
            )}
          </div>
        )}

        <FormField label="Assign To" hint="Shows each member's current workload across all tasks">
          <Select value={form.assignee} onChange={e => onFormChange(f => ({ ...f, assignee: e.target.value }))}>
            <option value="">— Unassigned —</option>
            <option value={user.id}>{user.fullName || 'Me'} (Team Lead)</option>
            {members.map(renderMemberOption)}
          </Select>
          {selectedMemberCap && (
            <p className="mt-1 text-[11px] text-slate-500">
              Member workload: <span className="font-semibold text-slate-700">{selectedMemberCap.windowHours}h</span> already booked across {selectedMemberCap.activeSubtasksCount} active subtask(s)
              {selectedMemberCap.windowCapacityHours != null ? ` (max ${selectedMemberCap.windowCapacityHours}h available)` : ''}.
            </p>
          )}
        </FormField>

        {subtasks.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Prerequisite Subtasks <span className="text-xs font-normal text-slate-400">(optional dependencies)</span>
            </label>
            <div className="max-h-28 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
              {subtasks.map((st) => {
                const stId = String(st.id || st.subtaskId);
                const checked = selectedDepIds.includes(stId);
                const stDue = deadlineInput(st.dueDate || st.deadline);
                return (
                  <label key={stId} className="flex items-center justify-between gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white rounded px-1.5 py-1">
                    <span className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDependency(stId)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate font-medium">{st.title}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {st.estimatedHours != null ? `${Number(st.estimatedHours)}h` : ''}
                      {stDue ? ` · Due ${stDue}` : ''}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              Dependent subtasks stay locked for submission until selected prerequisites are Completed.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
