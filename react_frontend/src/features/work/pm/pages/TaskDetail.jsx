import { openEvidenceFile } from '../../../../shared/utils/evidenceFile';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Table } from '../../../../shared/components/Table';
import { Toast } from '../../../../shared/components/Toast';
import { Button } from '../../../../shared/components/Button';
import { Modal } from '../../../../shared/components/Modal';
import { SendBackTaskModal } from '../components/PmReviewModals';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaskById, selectTaskById, updateTask as updateTaskThunk } from '../../../../store/tasks';
import { fetchComplianceViolations, selectAllComplianceViolations } from '../../../../store/complianceViolations';
import { fetchEvidence, selectAllEvidence } from '../../../../store/evidence';
import { tomorrowInput } from '../../components/dateLimits';

const STATUSES = ['Draft', 'Active', 'In_Review', 'Blocked', 'Completed', 'Cancelled'];
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—';

export default function PmTaskDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const task = useSelector((state) => selectTaskById(state, id)) || null;
  // A failed compliance or evidence load leaves that list empty, as before.
  const violations = useSelector(selectAllComplianceViolations);
  const evidenceList = useSelector(selectAllEvidence);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [sendBackReason, setSendBackReason] = useState('');
  const [sendBackError, setSendBackError] = useState('');
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      dispatch(fetchTaskById(id)).unwrap(),
      // These two never reject when dispatched: a failure stays in their slice.
      dispatch(fetchComplianceViolations()),
      dispatch(fetchEvidence()),
    ])
      .catch((error) => {
        if (active) showToast('error', error.message || 'Failed to load task details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [dispatch, id]);

  // After a compliance block, bypass the freshness window so the message reflects current data.
  const reloadViolations = () => dispatch(fetchComplianceViolations({ force: true }));

  // Prefer the backend code; the message check stays until the API client
  // passes `code` through (A4).
  const isComplianceBlock = (error) => error?.code === 'COMPLIANCE_BLOCK';

  const updateTask = async (patch) => {
    setSaving(true);
    try {
      await dispatch(updateTaskThunk({ id, data: patch })).unwrap();
      setOverrideOpen(false);
      showToast('success', 'Task updated.');
    } catch (error) {
      if (isComplianceBlock(error)) {
        reloadViolations();
        // Final approval of a reviewed task may override the block (audited server-side).
        if (patch.status === 'Completed' && task?.status === 'In_Review' && !patch.pmApproval) {
          setOverrideOpen(true);
        } else {
          showToast('error', 'Blocked by Compliance: Complete required evidence before marking Completed.');
        }
      } else {
        showToast('error', error.message || 'Failed to update task.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;
  if (!task) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Link to={PATHS.PM.TASKS} className="text-sm text-blue-600 hover:text-blue-700">← Tasks</Link>
        <EmptyState title="Task not found" description="This task is not available." />
      </div>
    );
  }

  const projectLink = task.project?.id ? PATHS.PM.PROJECT_DETAIL.replace(':id', task.project.id) : null;
  const subtasks = task.subtasks || [];
  const escalations = task.escalations || [];

  // Active violations attached to this task
  const activeTaskViolations = violations.filter((violation) => (
    violation.entityType === 'Task'
    && String(violation.entityId) === String(id)
    && ['Open', 'Under_Review'].includes(violation.status)
  ));

  const currentTaskEvidence = evidenceList.filter((e) =>
    String(e.taskId || e.task_id || e.task?.id) === String(id)
  );

  // The backend decides whether a transition is blocked; the page only shows
  // the open violations it has recorded for this task.
  const complianceBlocked = activeTaskViolations.length > 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
  const isTaskInReview = task.status === 'In_Review' || task.status === 'Pending_TL_Review';
  const completedSubtaskCount = subtasks.filter((s) => s.status === 'Completed').length;

  const handleConfirmSendBack = async () => {
    const reason = sendBackReason.trim();
    if (!reason) {
      setSendBackError('Give a reason before sending this task back.');
      return;
    }
    setSendBackError('');
    setSaving(true);
    try {
      await dispatch(updateTaskThunk({ id, data: { status: 'Active', notes: reason } })).unwrap();
      setSendBackOpen(false);
      setSendBackReason('');
      showToast('success', 'Task returned to Team Lead for revision.');
    } catch (error) {
      setSendBackError(error.message || 'Failed to send task back.');
    } finally {
      setSaving(false);
    }
  };

  const grantExtension = async () => {
    const reason = extensionReason.trim();
    const proposedDeadline = new Date(extensionDate);
    if (!extensionDate || !reason || proposedDeadline <= new Date()) {
      showToast('error', 'Choose a future deadline and enter a reason.');
      return;
    }
    if (task.dueDate && proposedDeadline <= new Date(task.dueDate)) {
      showToast('error', 'The new deadline must be later than the current deadline.');
      return;
    }
    const projectTarget = task.project?.targetDate ? String(task.project.targetDate).slice(0, 10) : null;
    if (projectTarget && extensionDate > projectTarget) {
      showToast('error', `The new deadline cannot be after the project deadline (${projectTarget}).`);
      return;
    }
    setSaving(true);
    try {
      await dispatch(updateTaskThunk({
        id,
        data: { dueDate: extensionDate, deadlineExtensionReason: reason },
      })).unwrap();
      // The server resolves the overdue violations; read them back instead of patching locally.
      reloadViolations();
      showToast('success', 'Deadline extended and overdue violations cleared.');
      setExtensionOpen(false);
      setExtensionDate('');
      setExtensionReason('');
    } catch (error) {
      showToast('error', error.message || 'Failed to extend deadline.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Link to={PATHS.PM.TASKS} className="text-sm font-medium text-blue-600 hover:text-blue-700">← All Tasks</Link>

      {/* PM Final Review Bar for Team-Lead-Submitted Tasks */}
      {isTaskInReview && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-950">
              Ready for PM Final Review
            </p>
            <p className="text-xs text-blue-800 mt-0.5">
              Review all {subtasks.length} subtask{subtasks.length === 1 ? '' : 's'} ({completedSubtaskCount}/{subtasks.length} completed) and {currentTaskEvidence.length} compliance evidence item{currentTaskEvidence.length === 1 ? '' : 's'} below before approving.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={() => {
                if (complianceBlocked) {
                  setOverrideOpen(true);
                } else {
                  updateTask({ status: 'Completed' });
                }
              }}
            >
              Approve & Complete
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={saving}
              onClick={() => {
                setSendBackReason('');
                setSendBackError('');
                setSendBackOpen(true);
              }}
            >
              Send Back
            </Button>
          </div>
        </div>
      )}

      {/* Compliance Blocker Resolution Banner */}
      {complianceBlocked && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-lg">
              🛡️
            </span>
            <div>
              <p className="text-sm font-bold text-rose-900">
                This task has open compliance violations
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                {`Active violations: ${activeTaskViolations.map((v) => v.rule?.name || 'Compliance Policy').join(', ')}`}
              </p>
            </div>
          </div>

        </div>
      )}

      <header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
              <Badge status={task.status === 'Completed' ? 'success' : task.status === 'Blocked' ? 'danger' : task.status === 'Active' ? 'info' : 'default'}>
                {String(task.status || 'Draft').replace(/_/g, ' ')}
              </Badge>
              {complianceBlocked && <Badge status="danger">⚠ Blocked by Compliance</Badge>}
            </div>
            {projectLink ? (
              <Link to={projectLink} className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700">{task.project.name}</Link>
            ) : <p className="mt-2 text-sm text-gray-500">No linked project</p>}
          </div>
          <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-2">
            <FormField label="Task status">
              <Select
                value={task.status || 'Draft'}
                onChange={(event) => updateTask({ status: event.target.value })}
                disabled={saving}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                ))}
              </Select>
            </FormField>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Assigned to</p>
              <p className="mt-1 text-sm text-gray-900">
                {task.assignedTo?.fullName || task.assignedTo?.email || 'Unassigned'}
              </p>
            </div>
          </div>
        </div>
        {saving && <p className="mt-3 text-xs text-gray-500">Saving changes…</p>}
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{task.description || 'No description provided.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
            <div><p className="text-xs font-semibold uppercase text-gray-500">Priority</p><p className="mt-1 text-sm text-gray-900">{task.priority || 'Medium'}</p></div>
            <div><p className="text-xs font-semibold uppercase text-gray-500">Due date</p><p className="mt-1 text-sm text-gray-900">{formatDate(task.dueDate)}</p></div>
            <div><p className="text-xs font-semibold uppercase text-gray-500">Created by</p><p className="mt-1 text-sm text-gray-900">{task.createdBy?.fullName || '—'}</p></div>
            <div><p className="text-xs font-semibold uppercase text-gray-500">Completed</p><p className="mt-1 text-sm text-gray-900">{formatDate(task.completedAt)}</p></div>
          </div>
          {(isOverdue || complianceBlocked) && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {isOverdue ? 'This task is overdue.' : 'Compliance governance blocker active.'}
                </p>
                <p className="text-xs text-amber-700">
                  Extending the deadline will synchronize the compliance remediation window and unfreeze governance lockouts.
                </p>
              </div>
              <Button variant="warning" onClick={() => setExtensionOpen(true)}>
                Grant deadline extension
              </Button>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Work summary</h2>
          <div><p className="text-xs font-semibold uppercase text-gray-500">Subtasks</p><p className="mt-1 text-2xl font-bold text-gray-900">{subtasks.length}</p></div>
          <div><p className="text-xs font-semibold uppercase text-gray-500">Open escalations</p><p className="mt-1 text-2xl font-bold text-gray-900">{escalations.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length}</p></div>
          {projectLink && <Link to={projectLink} className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700">View project →</Link>}
          <Link to={PATHS.PM.ESCALATIONS} className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Escalation inbox →</Link>
        </aside>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Subtasks</h2>
        </div>
        {subtasks.length ? (
          <Table
            columns={[
              { key: 'title', header: 'Title', accessor: 'title' },
              { key: 'assignee', header: 'Assignee', render: (subtask) => subtask.assignedTo?.fullName || subtask.assignedTo?.email || '—' },
              { key: 'status', header: 'Status', render: (subtask) => <Badge status={subtask.status === 'Completed' ? 'success' : 'info'}>{String(subtask.status || 'Draft').replace(/_/g, ' ')}</Badge> },
              { key: 'dueDate', header: 'Due date', render: (subtask) => formatDate(subtask.dueDate) },
              { key: 'completedAt', header: 'Completed', render: (subtask) => formatDate(subtask.completedAt) },
            ]}
            data={subtasks}
          />
        ) : <div className="p-5"><EmptyState title="No subtasks" description="This task has no subtasks yet." /></div>}
      </section>

      {/* Compliance & Deliverable Evidence */}
      <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Compliance & Deliverable Evidence</h2>
          <span className="text-xs text-gray-500 font-medium">{currentTaskEvidence.length} item(s)</span>
        </div>
        {currentTaskEvidence.length ? (
          <Table
            columns={[
              {
                key: 'title',
                header: 'Artifact Title',
                render: (ev) => (
                  <span className="font-medium text-gray-900">
                    {ev.title || ev.notes || `Evidence #${ev.id}`}
                  </span>
                ),
              },
              {
                key: 'type',
                header: 'Type',
                render: (ev) => (
                  <span className="text-xs text-gray-600">{ev.evidenceType || 'Document'}</span>
                ),
              },
              {
                key: 'submittedBy',
                header: 'Submitted By',
                render: (ev) => ev.user?.fullName || ev.submittedBy?.fullName || ev.user?.email || ev.submittedBy?.email || '—',
              },
              {
                key: 'status',
                header: 'Status & Feedback',
                render: (ev) => {
                  const st = String(ev.status || '').toLowerCase();
                  const badgeStatus = st === 'approved' ? 'success' : st === 'rejected' ? 'danger' : 'warning';
                  return (
                    <div className="flex flex-col gap-1">
                      <Badge status={badgeStatus}>{ev.status || 'Pending'}</Badge>
                      {st === 'rejected' && (ev.rejectionReason || ev.notes) && (
                        <span className="text-[11px] text-rose-700 italic max-w-xs">
                          Feedback: "{ev.rejectionReason || ev.notes}"
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'file',
                header: 'Document',
                render: (ev) => {
                  const fileUrl = ev.fileUrl || ev.url || ev.attachments?.[0]?.filePath || ev.attachment?.filePath;
                  if (!fileUrl) return <span className="text-xs text-gray-400">No file</span>;
                  const isExternal = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
                  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5500';
                  if (!isExternal && ev.id) {
                    return (
                      <button
                        type="button"
                        onClick={() => openEvidenceFile(ev.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        View File ↗
                      </button>
                    );
                  }
                  return (
                    <a
                      href={isExternal ? fileUrl : `${apiBase}${fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      View File ↗
                    </a>
                  );
                },
              },
            ]}
            data={currentTaskEvidence}
          />
        ) : (
          <div className="p-5">
            <EmptyState
              title="No evidence submitted"
              description="No compliance artifacts or deliverables have been uploaded for this task yet."
            />
          </div>
        )}
      </section>

      <Modal
        isOpen={extensionOpen}
        onClose={() => setExtensionOpen(false)}
        title="Grant deadline extension"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setExtensionOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={grantExtension} disabled={saving}>{saving ? 'Saving…' : 'Grant extension'}</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">The new deadline and reason will be recorded in the task audit history.</p>
          <FormField
            label="New deadline"
            required
            hint={
              task.project?.targetDate
                ? `Must be on or before ${String(task.project.targetDate).slice(0, 10)}`
                : undefined
            }
          >
            <Input
              type="date"
              min={tomorrowInput()}
              max={task.project?.targetDate ? String(task.project.targetDate).slice(0, 10) : undefined}
              value={extensionDate}
              onChange={(event) => setExtensionDate(event.target.value)}
            />
          </FormField>
          <FormField label="Reason" required>
            <Textarea value={extensionReason} onChange={(event) => setExtensionReason(event.target.value)} rows={4} placeholder="Explain why the deadline is being extended." />
          </FormField>
        </div>
      </Modal>

      <Modal
        isOpen={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Approve despite compliance block?"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setOverrideOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="danger" onClick={() => updateTask({ status: 'Completed', pmApproval: true })} disabled={saving}>
              {saving ? 'Saving…' : 'Approve with override'}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-gray-600">
          Compliance rules block completing this task. As Project Manager you can give final approval anyway;
          the override is recorded in the audit log.
        </p>
      </Modal>

      {escalations.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Task escalations</h2>
          {escalations.map((escalation) => (
            <div key={escalation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-100 p-3">
              <div><p className="font-medium text-gray-900">{escalation.title}</p><p className="mt-1 text-xs text-gray-500">{escalation.blockerType || 'Blocker'}</p></div>
              <Badge status={['Resolved', 'Closed'].includes(escalation.status) ? 'success' : 'warning'}>{escalation.status || 'Open'}</Badge>
            </div>
          ))}
        </section>
      )}

      <SendBackTaskModal
        task={task}
        isOpen={sendBackOpen}
        onClose={() => setSendBackOpen(false)}
        onConfirm={handleConfirmSendBack}
        sending={saving}
        error={sendBackError}
        reason={sendBackReason}
        onReasonChange={setSendBackReason}
      />

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast((current) => ({ ...current, visible: false }))} />
    </div>
  );
}
