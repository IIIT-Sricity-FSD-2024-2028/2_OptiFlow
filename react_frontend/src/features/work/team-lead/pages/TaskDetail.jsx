import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Toast } from '../../../../shared/components/Toast';
import { TaskDetailPanel, SubtaskList, EvidenceUploadCard } from '../../components';
import { minExtensionDateInput } from '../../components/dateLimits';
import {
  SubmitToPmModal,
  ReportBlockerModal,
  ExtensionRequestModal,
  CreateSubtaskModal,
} from '../components/TaskDetailModals';
import { BLOCKER_TYPES } from '../components/taskOptions';
import { UploadEvidenceModal } from '../../member/components/modals/UploadEvidenceModal';
import { useAuth } from '../../../../context/AuthContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTaskById, selectTaskById, updateTask } from '../../../../store/tasks';
import { createSubtask, updateSubtask } from '../../../../store/subtasks';
import { createEscalation } from '../../../../store/escalations';
import { fetchProjectById, selectProjectById } from '../../../../store/projects';
import { fetchUsers, selectAllUsers } from '../../../../store/users';
import {
  createEvidence,
  deleteEvidence,
  fetchEvidence,
  selectAllEvidence,
  uploadEvidenceFile,
} from '../../../../store/evidence';
import { fetchComplianceViolations, selectAllComplianceViolations } from '../../../../store/complianceViolations';
const STAGES = ['Data Collection', 'Work In Progress', 'Team Leader Review', 'Compliance Audit'];
const STAGE_MAP = { Active: 1, In_Review: 2, Pending_TL_Review: 2, Completed: 3 };

const toStr = (val, fb = '—') => {
  if (val == null) return fb;
  if (typeof val === 'object') return val.fullName || val.name || val.label || val.title || fb;
  return String(val) || fb;
};

export default function TeamLeadTaskDetail() {
  const { id: taskId } = useParams();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const task = useSelector((state) => selectTaskById(state, taskId)) || null;
  const [complianceReload, setComplianceReload] = useState(0);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const users = useSelector(selectAllUsers);
  const projectId = task?.projectId || task?.project?.id;
  const project = useSelector((state) => (projectId ? selectProjectById(state, projectId) : null));
  const allEvidence = useSelector(selectAllEvidence);
  const violations = useSelector(selectAllComplianceViolations);

  // Assignable: direct reports plus members of the project's team.
  const members = useMemo(() => {
    const teamUserIds = new Set(
      (project?.team?.teamMembers || []).map((m) => String(m.userId || m.user?.id))
    );
    return users.filter((member) => (
      String(member.id) !== String(user.id)
      && (String(member.managerUserId) === String(user.id) || teamUserIds.has(String(member.id)))
    ));
  }, [users, project, user.id]);

  const taskEvidence = useMemo(() => allEvidence.filter((item) => (
    String(item.taskId || item.task_id || item.task?.id) === String(taskId)
  )), [allEvidence, taskId]);

  // Compliance state comes from the server: open violations recorded for this
  // task (the backend decides what blocks a transition).
  const compliance = useMemo(() => {
    const open = violations.filter((violation) => (
      ['Open', 'Under_Review'].includes(violation.status)
      && violation.entityType === 'Task'
      && String(violation.entityId) === String(taskId)
    ));
    return {
      hasRules: open.length > 0,
      evidenceBlocked: open.length > 0,
      primaryViolationId: open[0]?.id || null,
    };
  }, [violations, taskId]);
  // Every user (main's allUsers): resolves subtask assignee names beyond the assignable members.
  const allUsers = users;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // Subtasks live in the task row; the tasks slice keeps them in step with subtask changes.
  const userMap = new Map((allUsers.length ? allUsers : members).map((u) => [String(u.id), u.fullName || u.name]));
  const subtasks = (Array.isArray(task?.subtasks) ? task.subtasks : []).map((st) => {
    const assigneeName = userMap.get(String(st.assignedToId || st.assignedTo));
    return assigneeName && !st.assignedToName ? { ...st, assignedToName: assigneeName } : st;
  });

  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((st) => String(st.status || '').toLowerCase().includes('complete')).length;
  const allSubtasksComplete = totalSubtasks === 0 || completedSubtasks === totalSubtasks;

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitFile, setSubmitFile] = useState(null);
  const [submitFileTitle, setSubmitFileTitle] = useState('');
  const [submitFileType, setSubmitFileType] = useState('Document');
  const [submittingWork, setSubmittingWork] = useState(false);

  const [blockerOpen, setBlockerOpen] = useState(false);
  const [blockerType, setBlockerType] = useState(BLOCKER_TYPES[0]);
  const [blockerDesc, setBlockerDesc] = useState('');

  const [extensionOpen, setExtensionOpen] = useState(false);
  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');

  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [stForm, setStForm] = useState({ title: '', assignee: '', due: '' });
  const [savingSt, setSavingSt] = useState(false);
  const [subtaskError, setSubtaskError] = useState('');

  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  const toastTimer = useRef(null);
  const showToast = (type, message) => {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, type, message });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!taskId) return;
    let active = true;
    Promise.all([
      dispatch(fetchTaskById(taskId)).unwrap().catch(() => null),
      // Never rejects when dispatched: a failed user load leaves the assignee list empty.
      dispatch(fetchUsers()),
    ])
      .then(async ([t]) => {
        if (!active) return;
        if (!t) { setNotFound(true); return; }
        const taskProjectId = t.projectId || t.project?.id;
        if (taskProjectId) await dispatch(fetchProjectById(taskProjectId)).unwrap().catch(() => null);
      })
      .catch(() => active && showToast('error', 'Failed to load task.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [dispatch, taskId]);

  // Violations and evidence; after a submit or upload, bypass the freshness window.
  useEffect(() => {
    if (!taskId) return undefined;
    let active = true;
    const force = complianceReload > 0;
    Promise.all([
      dispatch(fetchComplianceViolations(force ? { force: true } : undefined)),
      dispatch(fetchEvidence(force ? { force: true } : undefined)),
    ]).then(([violationsAction, evidenceAction]) => {
      if (!active) return;
      if (fetchComplianceViolations.rejected.match(violationsAction) || fetchEvidence.rejected.match(evidenceAction)) {
        showToast('error', 'Some compliance details could not be loaded.');
      }
    });
    return () => { active = false; };
  }, [dispatch, taskId, complianceReload]);

  const handleDeleteEvidence = async (evId) => {
    try {
      await dispatch(deleteEvidence(evId)).unwrap();
      showToast('success', 'Evidence removed.');
    } catch {
      showToast('error', 'Failed to delete evidence.');
    }
  };

  const handleSubmitWork = async (e) => {
    e?.preventDefault();
    if (!allSubtasksComplete) {
      showToast('error', `Cannot submit task: all subtasks are not complete (${completedSubtasks}/${totalSubtasks} completed).`);
      return;
    }
    if (compliance.evidenceBlocked && taskEvidence.length === 0 && !submitFile) {
      showToast('error', 'Compliance requires an evidence deliverable. Please attach a document.');
      return;
    }

    setSubmittingWork(true);
    try {
      if (submitFile) {
        const title = submitFileTitle.trim() || submitFile.name || 'Deliverable Artifact';
        const created = await dispatch(createEvidence({
          taskId: String(taskId),
          title,
          evidenceType: submitFileType,
          notes: submitNotes.trim() || undefined,
          fileUrl: submitFile.name,
          userId: user?.id,
        })).unwrap();
        try {
          await dispatch(uploadEvidenceFile({ id: created.id, file: submitFile })).unwrap();
        } catch (uploadError) {
          // Do not leave an evidence row that points at no file; a successful delete
          // also removes the row from the store.
          await dispatch(deleteEvidence(created.id)).unwrap().catch(() => {});
          throw uploadError;
        }
      }

      // Handover notes go to the PM with the review notification (and the audit log).
      await dispatch(updateTask({
        id: taskId,
        data: { status: 'In_Review', submissionNote: submitNotes.trim() || undefined },
      })).unwrap();
      setComplianceReload((n) => n + 1);
      showToast('success', 'Work and deliverables submitted to Project Manager for review!');
      setSubmitOpen(false);
      setSubmitNotes('');
      setSubmitFile(null);
      setSubmitFileTitle('');
    } catch (err) {
      showToast('error', err.message || 'Failed to submit work.');
      setComplianceReload((n) => n + 1);
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleReportBlocker = async () => {
    if (!blockerDesc.trim()) return showToast('error', 'Please describe the blocker.');
    try {
      await dispatch(createEscalation({
        taskId,
        title: `Blocker: ${blockerType}`,
        blockerType,
        description: blockerDesc.trim(),
        priority: 'High',
      })).unwrap();
      showToast('success', 'Blocker reported and escalated to Project Manager.');
      setBlockerOpen(false);
      setBlockerDesc('');
    } catch {
      showToast('error', 'Failed to report blocker.');
    }
  };

  const handleExtension = async () => {
    if (!extDate || !extReason.trim()) return showToast('error', 'Please fill all fields.');
    const minDate = minExtensionDateInput(task?.dueDate || task?.deadline);
    if (minDate && extDate < minDate) {
      return showToast('error', `Proposed deadline must be on or after ${minDate} (later than the current deadline).`);
    }
    try {
      await dispatch(createEscalation({
        taskId,
        projectId: task?.projectId,
        targetManagerId: task?.project?.createdById || task?.createdById,
        title: `Extension request: ${task.title}`,
        blockerType: 'Extension Request',
        description: `Requested deadline: ${extDate}\nReason: ${extReason.trim()}`,
        priority: 'Medium',
      })).unwrap();
      showToast('success', 'Extension request submitted.');
      setExtensionOpen(false);
      setExtDate('');
      setExtReason('');
    } catch {
      showToast('error', 'Failed to submit request.');
    }
  };

  const handleSaveSubtask = async () => {
    setSubtaskError('');
    if (!stForm.title.trim()) {
      setSubtaskError('Title is required.');
      return;
    }
    setSavingSt(true);
    try {
      const created = await dispatch(createSubtask({
        taskId: taskId,
        title: stForm.title.trim(),
        assignedToId: stForm.assignee || undefined,
        dueDate: stForm.due || undefined,
        status: 'Active'
      })).unwrap();
      if (!created?.id) throw new Error('Subtask was not saved. Please reload and try again.');
      // Reload the task so the new subtask comes back with its assignee details.
      dispatch(fetchTaskById(taskId));
      showToast('success', 'Subtask created.');
      setSubtaskOpen(false); setSubtaskError(''); setStForm({ title: '', assignee: '', due: '' });
    } catch (error) {
      setSubtaskError(error?.message || 'Failed to create subtask.');
    }
    finally { setSavingSt(false); }
  };

  const handleToggleSubtask = async (subtaskId, markComplete) => {
    if (!subtaskId) return;
    const sameId = (st) => String(st.id || st.subtaskId) === String(subtaskId);
    const target = subtasks.find(sameId);
    const assignedId = target?.assignedToId || target?.assignedTo?.id;
    if (assignedId && String(assignedId) !== String(user.id)) return; // only TL's own subtasks
    const newStatus = markComplete ? 'Completed' : 'Active';
    try {
      await dispatch(updateSubtask({ id: subtaskId, data: { status: newStatus } })).unwrap();
      showToast('success', markComplete ? 'Subtask marked complete.' : 'Subtask reopened.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update subtask.');
    }
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3"><Loader /><p className="text-sm text-gray-500">Loading task...</p></div>
    </div>
  );

  if (!taskId || notFound || !task) return (
    <div className="p-8">
      <Link to="/team-lead/tasks" className="text-sm text-blue-600 hover:underline">← Back to Tasks</Link>
      <div className="mt-4"><EmptyState title="Task not found" description="This task does not exist or you lack access." /></div>
    </div>
  );

  const currentStage = STAGE_MAP[task.status] ?? 1;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/team-lead/tasks" className="hover:text-gray-700">Team Tasks</Link>
        <span>›</span>
        <span className="text-gray-900 font-semibold truncate max-w-xs">{toStr(task.title, 'Untitled')}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Left column */}
        <div className="space-y-5">
          {compliance.hasRules && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" role="status">
              <div>
                <strong>🛡 Compliance rules apply to this task.</strong>
                {compliance.evidenceBlocked && <p className="text-xs text-amber-800 mt-0.5">Mandatory evidence must be reviewed and approved in the vault before this task can be completed.</p>}
              </div>
              {compliance.evidenceBlocked && (
                <Link
                  to="/team-lead/reviews"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shrink-0 shadow-sm"
                >
                  Review Evidence Vault →
                </Link>
              )}
            </div>
          )}
          <TaskDetailPanel
            task={task}
            onClose={() => window.history.back()}
          >
            <div className="flex justify-end -mb-4 relative z-10 pr-2">
              <Button variant="outline" onClick={() => { setSubtaskError(''); setSubtaskOpen(true); }}>+ Add Subtask</Button>
            </div>
            <SubtaskList
              subtasks={subtasks}
              members={allUsers.length > 0 ? allUsers : members}
              readOnly={false}
              currentUserId={user.id}
              onStatusToggle={(subId, markComplete) =>
                handleToggleSubtask(subId, markComplete)
              }
            />

            <EvidenceUploadCard
              taskId={taskId}
              evidenceList={taskEvidence}
              readOnly={task.status === 'Completed'}
              onRequestUpload={() => setIsEvidenceModalOpen(true)}
              onDelete={handleDeleteEvidence}
            />

            {/* Action Bar */}
            <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {task.status !== 'Completed' && task.status !== 'In_Review' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="primary"
                      disabled={!allSubtasksComplete}
                      title={!allSubtasksComplete ? 'All subtasks are not complete' : undefined}
                      onClick={() => {
                        if (!allSubtasksComplete) {
                          showToast('warning', `All subtasks are not complete (${completedSubtasks}/${totalSubtasks} completed). Complete all subtasks before submitting the task.`);
                          return;
                        }
                        setSubmitNotes('');
                        setSubmitFile(null);
                        setSubmitFileTitle('');
                        setSubmitOpen(true);
                      }}
                    >
                      Submit Work for Review →
                    </Button>
                    {!allSubtasksComplete && (
                      <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                        All subtasks are not complete ({completedSubtasks}/{totalSubtasks} completed)
                      </span>
                    )}
                  </div>
                )}
                {task.status === 'In_Review' && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>In Review — Submitted to Project Manager</span>
                  </div>
                )}
                {task.status === 'Completed' && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-xs">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>Task Completed & Approved</span>
                  </div>
                )}
              </div>

              {task.status !== 'Completed' && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setBlockerOpen(true)}>
                    Report Blocker
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setExtensionOpen(true)}>
                    Request Extension
                  </Button>
                </div>
              )}
            </div>
          </TaskDetailPanel>
        </div>

        {/* Right column — Process stages */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 sticky top-6">
          <h2 className="text-sm font-bold text-gray-900 mb-6">Process Stages</h2>
          {STAGES.map((name, i) => {
            const done = i < currentStage;
            const active = i === currentStage;
            return (
              <div key={name} className="flex gap-4 relative pb-6 last:pb-0">
                {i < STAGES.length - 1 && <div className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-gray-200 z-0" />}
                <div className={`relative z-10 w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${done ? 'bg-blue-600 text-white' : active ? 'border-2 border-amber-400 bg-amber-50 text-amber-600' : 'border border-gray-300 bg-white text-gray-500'}`}>
                  {done
                    ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    : i + 1}
                </div>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{done ? 'Completed' : active ? 'In progress' : 'Pending'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SubmitToPmModal
        isOpen={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmit={handleSubmitWork}
        submitting={submittingWork}
        compliance={compliance}
        taskEvidence={taskEvidence}
        allSubtasksComplete={allSubtasksComplete}
        completedSubtasks={completedSubtasks}
        totalSubtasks={totalSubtasks}
        file={submitFile}
        onFileChange={setSubmitFile}
        fileTitle={submitFileTitle}
        onFileTitleChange={setSubmitFileTitle}
        fileType={submitFileType}
        onFileTypeChange={setSubmitFileType}
        notes={submitNotes}
        onNotesChange={setSubmitNotes}
      />

      <ReportBlockerModal
        isOpen={blockerOpen}
        onClose={() => setBlockerOpen(false)}
        onSubmit={handleReportBlocker}
        blockerType={blockerType}
        onBlockerTypeChange={setBlockerType}
        description={blockerDesc}
        onDescriptionChange={setBlockerDesc}
      />

      <ExtensionRequestModal
        isOpen={extensionOpen}
        onClose={() => setExtensionOpen(false)}
        onSubmit={handleExtension}
        date={extDate}
        onDateChange={setExtDate}
        reason={extReason}
        onReasonChange={setExtReason}
        currentDeadline={task?.dueDate || task?.deadline}
      />

      <CreateSubtaskModal
        isOpen={subtaskOpen}
        onClose={() => { setSubtaskOpen(false); setSubtaskError(''); }}
        onSave={handleSaveSubtask}
        saving={savingSt}
        error={subtaskError}
        form={stForm}
        onFormChange={setStForm}
        user={user}
        members={members}
        taskDueDate={task.dueDate}
      />

      <UploadEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        taskId={taskId}
        violationId={compliance.primaryViolationId}
        onSuccess={() => {
          // The new row is already in the evidence slice. Evidence starts Pending; re-read compliance instead of unblocking locally.
          setComplianceReload((n) => n + 1);
        }}
      />

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  );
}