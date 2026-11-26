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
import { CheckCircle2, Clock, ShieldAlert, ArrowUpRight, Layers, FileCheck } from 'lucide-react';
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

  const subtaskPct = subtasks.length > 0 ? Math.round((completedSubtaskCount / subtasks.length) * 100) : 0;
  const openEscalationCount = escalations.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to={PATHS.PM.TASKS} className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
          ← All Tasks
        </Link>
        {projectLink && (
          <Link to={projectLink} className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
            {task.project.name} <ArrowUpRight size={13} />
          </Link>
        )}
      </div>

      {/* Compliance Blocker Resolution Banner */}
      {complianceBlocked && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-4 py-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <ShieldAlert size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-rose-950">
                Open Compliance Violations ({activeTaskViolations.length})
              </p>
              <p className="text-xs text-rose-700 mt-0.5">
                {`Active policies: ${activeTaskViolations.map((v) => v.rule?.name || 'Compliance Policy').join(', ')}`}
              </p>
            </div>
          </div>
          <Badge status="danger">⚠ Blocked by Compliance</Badge>
        </div>
      )}

      {/* Executive Task Header */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{task.title}</h1>
              <Badge status={task.status === 'Completed' ? 'success' : task.status === 'Blocked' ? 'danger' : task.status === 'In_Review' ? 'info' : task.status === 'Active' ? 'info' : 'default'}>
                {String(task.status || 'Draft').replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Subtasks are reviewed by the Team Lead. The PM reviews and approves the overall task.
            </p>
          </div>

          {isTaskInReview && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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
          )}
        </div>

        {/* Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Team Lead</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
              {task.assignedTo?.fullName || task.assignedTo?.email || 'Unassigned'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Priority</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{task.priority || 'Medium'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Due Date</p>
            <p className={`mt-1 text-sm font-medium ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-800'}`}>
              {formatDate(task.dueDate)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Created By</p>
            <p className="mt-1 text-sm font-medium text-slate-800 truncate">{task.createdBy?.fullName || '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completed</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(task.completedAt)}</p>
          </div>
        </div>
      </header>

      {/* Main 2-Column Executive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Task Deliverable Brief */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Task Brief & Scope</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {task.description || 'No description provided for this parent deliverable.'}
            </p>
            {(isOverdue || complianceBlocked) && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-semibold text-amber-900">
                    {isOverdue ? 'This task is overdue.' : 'Compliance governance blocker active.'}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Extending the deadline synchronizes the remediation window and clears overdue locks.
                  </p>
                </div>
                <Button variant="warning" size="sm" onClick={() => setExtensionOpen(true)}>
                  Grant deadline extension
                </Button>
              </div>
            )}
          </section>

          {/* Read-Only Subtasks Rollup (Verified by Team Lead) */}
          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="border-b border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">Subtask Progress</h2>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Reviewed by the Team Lead before task submission
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${subtaskPct === 100 && subtasks.length > 0 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                    style={{ width: `${subtaskPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  {completedSubtaskCount}/{subtasks.length} Done
                </span>
              </div>
            </div>
            {subtasks.length ? (
              <Table
                columns={[
                  { key: 'title', header: 'Subtask', accessor: 'title' },
                  { key: 'assignee', header: 'Member', render: (subtask) => subtask.assignedTo?.fullName || subtask.assignedTo?.email || '—' },
                  { key: 'status', header: 'TL Review Status', render: (subtask) => <Badge status={subtask.status === 'Completed' ? 'success' : subtask.status === 'In_Review' ? 'warning' : 'info'}>{String(subtask.status || 'Draft').replace(/_/g, ' ')}</Badge> },
                  { key: 'dueDate', header: 'Due Date', render: (subtask) => formatDate(subtask.dueDate) },
                  { key: 'completedAt', header: 'Completed', render: (subtask) => formatDate(subtask.completedAt) },
                ]}
                data={subtasks}
              />
            ) : <div className="p-5"><EmptyState title="No subtasks" description="This parent task has no subtasks." /></div>}
          </section>

          {/* Compliance & Deliverable Evidence */}
          <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Compliance & Deliverable Evidence</h2>
              </div>
              <span className="text-xs text-slate-500 font-semibold">{currentTaskEvidence.length} item(s)</span>
            </div>
            {currentTaskEvidence.length ? (
              <Table
                columns={[
                  {
                    key: 'title',
                    header: 'Artifact Title',
                    render: (ev) => (
                      <span className="font-medium text-slate-900">
                        {ev.title || ev.notes || `Evidence #${ev.id}`}
                      </span>
                    ),
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    render: (ev) => (
                      <span className="text-xs text-slate-600">{ev.evidenceType || 'Document'}</span>
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
                              Feedback: &quot;{ev.rejectionReason || ev.notes}&quot;
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
                      if (!fileUrl) return <span className="text-xs text-slate-400">No file</span>;
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
        </div>

        {/* Right PM Review & Governance Sidebar */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">PM Final Review</h2>

            {isTaskInReview ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2">
                <p className="text-xs font-bold text-blue-950">Ready for PM Final Review</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Team Lead has signed off {completedSubtaskCount}/{subtasks.length} subtask(s). Verify deliverables and either approve or send back.
                </p>
              </div>
            ) : task.status === 'Completed' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Approved & Completed</span>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-2.5 text-slate-600 text-xs">
                <Clock size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Awaiting Team Lead subtask completion and whole-task submission ({completedSubtaskCount}/{subtasks.length} subtasks complete).
                </span>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
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
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900">Governance Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subtasks Done</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{completedSubtaskCount}/{subtasks.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Escalations</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{openEscalationCount}</p>
              </div>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              {projectLink && (
                <Link to={projectLink} className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
                  <span>View Parent Project</span>
                  <ArrowUpRight size={14} />
                </Link>
              )}
              <Link to={PATHS.PM.ESCALATIONS} className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
                <span>Escalation Inbox</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </aside>
      </div>

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
