import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Modal } from '../../../../shared/components/Modal';
import { Toast } from '../../../../shared/components/Toast';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { SubtaskList, EvidenceUploadCard, StatusBadge, PriorityBadge } from '../../components';
import {
  Calendar,
  Clock,
  FileText,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import * as tasksApi from '../../../../services/api/tasks';
import * as subtasksApi from '../../../../services/api/subtasks';
import * as escalationsApi from '../../../../services/api/escalations';
import * as usersApi from '../../../../services/api/users';
import * as evidenceApi from '../../../../services/api/evidence';
import * as complianceApi from '../../../../services/api/compliance';

const BLOCKER_TYPES = ['Missing Information / Data', 'System Issue / Bug', 'Dependency Delay', 'Access / permission', 'Other'];
const STAGES = ['Data Collection', 'Work In Progress', 'Team Leader Review', 'Compliance Audit'];
const STAGE_MAP = {
  Draft: 0,
  Active: 1,
  In_Progress: 1,
  in_progress: 1,
  In_Review: 2,
  in_review: 2,
  Pending_TL_Review: 2,
  pending_tl_review: 2,
  Under_Review: 2,
  under_review: 2,
  'Under Review': 2,
  Completed: 3,
  completed: 3,
};

const toStr = (val, fb = '—') => {
  if (val == null) return fb;
  if (typeof val === 'object') return val.fullName || val.name || val.label || val.title || fb;
  return String(val) || fb;
};
const fmt = (s) => String(s || 'Unknown').replace(/_/g, ' ');

export default function TeamLeadTaskDetail() {
  const { id: taskId } = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [compliance, setCompliance] = useState({ hasRules: false, evidenceBlocked: false });
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [subtasks, setSubtasks] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isChangesModalOpen, setIsChangesModalOpen] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [submittingChanges, setSubmittingChanges] = useState(false);

  const [actionOpen, setActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('submit');
  const [blockerType, setBlockerType] = useState(BLOCKER_TYPES[0]);
  const [blockerDesc, setBlockerDesc] = useState('');
  const [extDate, setExtDate] = useState('');
  const [extReason, setExtReason] = useState('');

  const [subtaskOpen, setSubtaskOpen] = useState(false);
  const [stForm, setStForm] = useState({ title: '', assignee: '', due: '' });
  const [savingSt, setSavingSt] = useState(false);
  const [subtaskError, setSubtaskError] = useState('');

  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  useEffect(() => {
    if (!taskId) return;
    let active = true;
    Promise.all([tasksApi.get(taskId).catch(() => null), usersApi.list().catch(() => [])])
      .then(([taskRes, membersRes]) => {
        if (!active) return;
        const t = taskRes?.data || taskRes;
        if (!t) { setNotFound(true); return; }
        setTask(t);
        setSubtasks(Array.isArray(t.subtasks) ? t.subtasks : []);
        const membersData = Array.isArray(membersRes) ? membersRes : membersRes?.data || [];
        setMembers(membersData.filter(member => member.managerUserId === user.id));
      })
      .catch(() => active && showToast('error', 'Failed to load task.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [taskId, user.id]);

  useEffect(() => {
    if (!task) return undefined;
    let active = true;
    Promise.all([
      complianceApi.getBindings(),
      complianceApi.getViolations(),
      evidenceApi.getEvidenceList(),
    ]).then(([bindingResponse, violationResponse, evidenceResponse]) => {
      if (!active) return;
      const bindings = Array.isArray(bindingResponse) ? bindingResponse : bindingResponse?.data || [];
      const violations = Array.isArray(violationResponse) ? violationResponse : violationResponse?.data || [];
      const evidence = Array.isArray(evidenceResponse) ? evidenceResponse : evidenceResponse?.data || [];
      const taskEv = evidence.filter((item) => (
        String(item.taskId || item.task_id || item.task?.id) === String(taskId)
      ));
      setEvidenceList(taskEv);
      const projectId = task.projectId || task.project?.id;
      const teamId = task.project?.teamId || task.project?.team?.id;
      const branchId = task.project?.team?.branchId;
      const companyId = task.companyId;

      const relevantBindings = bindings.filter((binding) => {
        if (binding.rule?.isActive === false) return false;
        if (binding.scopeType === 'Task' && String(binding.scopeId) === String(taskId)) return true;
        if (binding.scopeType === 'Project' && String(binding.scopeId) === String(projectId)) return true;
        if (binding.scopeType === 'Team' && String(binding.scopeId) === String(teamId)) return true;
        if (binding.scopeType === 'Branch' && String(binding.scopeId) === String(branchId)) return true;
        if (binding.scopeType === 'Company' && String(binding.scopeId) === String(companyId)) return true;
        return false;
      });

      const activeViolations = violations.filter((violation) => (
        ['Open', 'Under_Review'].includes(violation.status)
        && ((violation.entityType === 'Task' && String(violation.entityId) === String(taskId))
          || (violation.entityType === 'Project' && String(violation.entityId) === String(projectId)))
      ));

      const evidenceRules = [
        ...relevantBindings.map((binding) => binding.rule),
        ...activeViolations.map((violation) => violation.rule),
      ].filter((rule) => {
        if (!rule?.criteria) return false;
        const trigger = rule.criteria.trigger;
        const req = rule.criteria.requirement;
        return req?.type === 'EVIDENCE_REQUIRED' || (trigger?.field === 'status' && trigger?.transitionTo === 'Completed');
      });

      const hasApprovedEvidence = evidence.some((item) => (
        String(item.taskId || item.task_id || item.task?.id) === String(taskId)
        && String(item.status).toLowerCase() === 'approved'
      ));

      setCompliance({
        hasRules: relevantBindings.length > 0 || activeViolations.length > 0,
        evidenceBlocked: (evidenceRules.length > 0 || activeViolations.length > 0) && !hasApprovedEvidence,
      });
    }).catch((error) => {
      if (active) showToast('error', error.message || 'Failed to load compliance status.');
    }).finally(() => {
      if (active) setComplianceLoading(false);
    });
    return () => { active = false; };
  }, [task, taskId]);

  const patchTask = async (patch) => {
    try {
      await tasksApi.update(taskId, patch);
      setTask(prev => ({ ...prev, ...patch }));
      return true;
    } catch (error) {
      showToast('error', error.message || 'Update failed.');
      return false;
    }
  };

  const handleApprove = async () => {
    if (compliance.evidenceBlocked) {
      showToast('error', 'Mandatory evidence must be approved before completing this task.');
      return;
    }
    if (await patchTask({ status: 'Completed' })) {
      showToast('success', 'Deliverable approved! Task marked as Completed.');
    }
  };

  const handleConfirmRequestChanges = async () => {
    if (!changeNotes.trim()) {
      showToast('error', 'Please provide feedback explaining the changes required.');
      return;
    }
    setSubmittingChanges(true);
    try {
      const feedbackText = `⚠️ Revisions Requested: ${changeNotes.trim()}`;
      const success = await patchTask({
        status: 'Active',
        notes: feedbackText,
      });
      if (success) {
        setIsChangesModalOpen(false);
        setChangeNotes('');
        showToast('success', 'Revisions requested. Task sent back to assignee.');
      }
    } catch (error) {
      showToast('error', error?.message || 'Failed to request changes.');
    } finally {
      setSubmittingChanges(false);
    }
  };

  const handleApproveEvidence = async (evidenceId) => {
    try {
      await evidenceApi.update(evidenceId, { status: 'Approved' });
      setEvidenceList((prev) =>
        prev.map((item) => (item.id === evidenceId ? { ...item, status: 'Approved' } : item))
      );
      setCompliance((prev) => ({ ...prev, evidenceBlocked: false }));
      showToast('success', 'Evidence artifact approved.');
    } catch (error) {
      showToast('error', error?.message || 'Failed to approve evidence.');
    }
  };

  const handleReportBlocker = async () => {
    if (!blockerDesc.trim()) return showToast('error', 'Please describe the blocker.');
    try {
      await escalationsApi.create({ taskId, title: `Blocker: ${blockerType}`, blockerType, description: blockerDesc.trim(), priority: 'High' });
      showToast('success', 'Blocker reported.');
      setActionOpen(false); setBlockerDesc('');
    } catch { showToast('error', 'Failed to report blocker.'); }
  };

  const handleExtension = async () => {
    if (!extDate || !extReason.trim()) return showToast('error', 'Please fill all fields.');
    try {
      await escalationsApi.create({
        taskId,
        title: `Extension request: ${task.title}`,
        blockerType: 'Extension Request',
        description: `Requested deadline: ${extDate}\nReason: ${extReason.trim()}`,
        priority: 'Medium',
      });
      showToast('success', 'Extension requested.');
      setActionOpen(false); setExtDate(''); setExtReason('');
    } catch { showToast('error', 'Failed to submit request.'); }
  };

  const handleSaveSubtask = async () => {
    setSubtaskError('');
    if (!stForm.title.trim()) {
      setSubtaskError('Title is required.');
      return;
    }
    setSavingSt(true);
    try {
      const assignedMember = members.find(m => String(m.id || m.userId) === String(stForm.assignee));
      const res = await subtasksApi.create({
        taskId: taskId,
        title: stForm.title.trim(),
        assignedTo: stForm.assignee || undefined,
        assignedToId: stForm.assignee || undefined,
        dueDate: stForm.due || undefined,
        isSubtask: true,
        status: 'Active'
      });
      const created = res?.data || res || { id: Date.now(), ...stForm };
      const assigneeName = assignedMember?.fullName || assignedMember?.name ||
        (String(stForm.assignee) === String(user.id) ? user.fullName : stForm.assignee);
      const subtaskItem = {
        ...created,
        assignedTo: assigneeName,
        assignedToName: assigneeName,
      };
      setSubtasks(prev => [...prev, subtaskItem]);
      showToast('success', 'Subtask created.');
      setSubtaskOpen(false); setSubtaskError(''); setStForm({ title: '', assignee: '', due: '' });
    } catch (error) {
      setSubtaskError(error?.message || 'Failed to create subtask.');
    }
    finally { setSavingSt(false); }
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

  const statusNormalized = String(task.status || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isInReview = statusNormalized.includes('review') || statusNormalized === 'pendingtlreview';
  const isCompleted = String(task.status || '').toLowerCase().includes('complete');
  const currentStage = isCompleted ? 3 : (STAGE_MAP[task.status] ?? (isInReview ? 2 : 1));
  const dueDate = task.dueDate || task.deadline;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isCompleted;
  const assigneeName = task.assigneeName || (typeof task.assignedTo === 'object' ? task.assignedTo?.fullName || task.assignedTo?.email : task.assignedTo) || task.assignee || 'Unassigned';
  const projectName = task.project?.name || 'General Process';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/team-lead/tasks" className="hover:text-gray-700">Team Tasks</Link>
          <span>›</span>
          <span className="text-gray-900 font-semibold truncate max-w-xs">{toStr(task.title, 'Untitled')}</span>
        </div>
        <Link
          to="/team-lead/tasks"
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to tasks</span>
        </Link>
      </div>

      {/* Main Task Header Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                TASK-{String(task.id || taskId).slice(0, 8)}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {projectName}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500 font-medium">
                Assigned to: <strong className="text-gray-900">{assigneeName}</strong>
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-snug">
              {task.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Due:{' '}
                  <strong className={isOverdue ? 'text-rose-600' : 'text-gray-700'}>
                    {dueDate ? new Date(dueDate).toLocaleDateString() : 'No deadline'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  Estimated:{' '}
                  <strong className="text-gray-700">
                    {task.estimatedHours || task.estimated_hours || 0} hrs
                  </strong>
                </span>
              </div>

              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} isOverdue={isOverdue} />
            </div>
          </div>

          {/* Team Lead Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isInReview && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChangeNotes('');
                    setIsChangesModalOpen(true);
                  }}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold"
                >
                  Request Changes
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  disabled={complianceLoading || compliance.evidenceBlocked}
                  title={compliance.evidenceBlocked ? 'Evidence must be approved first.' : undefined}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Approve Deliverable
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSubtaskError(''); setSubtaskOpen(true); }}
            >
              + Add Subtask
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setActiveTab('blocker'); setActionOpen(true); }}
              className="text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mr-1.5" />
              Report Blocker
            </Button>

            {!isInReview && !isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => { setActiveTab('submit'); setActionOpen(true); }}
              >
                Submit Work
              </Button>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Task Completed & Approved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left / Main Column */}
        <div className="space-y-6">
          {/* Team Leader Review Callout Banner */}
          {isInReview && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    Review Required
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    Deliverable Submitted for Team Leader Review
                  </h3>
                  <p className="text-xs text-gray-600">
                    {assigneeName} has submitted this deliverable for your sign-off. Review the requirements, subtasks, and evidence below before deciding.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChangeNotes('');
                      setIsChangesModalOpen(true);
                    }}
                    className="border-gray-300 text-gray-700 hover:bg-white bg-white/80 font-semibold"
                  >
                    Request Changes
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApprove}
                    disabled={complianceLoading || compliance.evidenceBlocked}
                    title={compliance.evidenceBlocked ? 'Evidence must be approved before completing this task.' : undefined}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    ✓ Approve Deliverable
                  </Button>
                </div>
              </div>

              {compliance.evidenceBlocked && (
                <div className="rounded-lg bg-amber-100/80 border border-amber-300 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Approval Blocked by Policy: </span>
                    Mandatory deliverable evidence must be submitted and approved before this task can be approved.
                    {evidenceList.length > 0 ? (
                      <span> Review and approve evidence items in the section below.</span>
                    ) : (
                      <span> Click <strong>Request Changes</strong> to notify the assignee that compliance evidence is required.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {compliance.hasRules && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm" role="status">
              <div>
                <strong>Compliance rules apply to this task.</strong>
                {compliance.evidenceBlocked && (
                  <p className="text-xs text-amber-800 mt-0.5">
                    Mandatory evidence must be reviewed and approved in the vault before this task can be completed.
                  </p>
                )}
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

          {/* Deliverable Scope & Requirements */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Deliverable Requirements & Scope</span>
            </h2>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-normal">
              {task.description || 'No detailed instructions or acceptance criteria provided.'}
            </div>
            {task.notes && (
              <div className={`p-3.5 rounded-xl text-xs border ${
                task.notes.includes('Feedback') || task.notes.includes('Revision')
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : 'bg-amber-50/70 border-amber-200/70 text-amber-900'
              }`}>
                <span className="font-bold">
                  {task.notes.includes('Feedback') || task.notes.includes('Revision')
                    ? '⚠️ Revisions Requested by Team Lead: '
                    : 'Latest Submission Notes: '}
                </span>
                {task.notes}
              </div>
            )}
          </div>

          {/* Execution Subtasks */}
          <SubtaskList
            subtasks={subtasks}
            readOnly={true}
          />

          {/* Evidence Artifacts */}
          <EvidenceUploadCard
            taskId={taskId}
            evidenceList={evidenceList}
            readOnly={true}
            onApprove={handleApproveEvidence}
          />
        </div>

        {/* Right Info Sidebar */}
        <div className="space-y-6 sticky top-6">
          {/* Process Stages Stepper */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-6">Process Stages</h2>
            {STAGES.map((name, i) => {
              const done = isCompleted || i < currentStage;
              const active = !isCompleted && i === currentStage;
              return (
                <div key={name} className="flex gap-4 relative pb-6 last:pb-0">
                  {i < STAGES.length - 1 && (
                    <div
                      className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${
                        done ? 'bg-blue-600' : 'bg-gray-200'
                      } z-0`}
                    />
                  )}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${
                      done
                        ? 'bg-blue-600 text-white shadow-sm'
                        : active
                        ? 'border-2 border-amber-400 bg-amber-50 text-amber-600 font-bold'
                        : 'border border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 size={14} className="stroke-[2.5]" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {done ? 'Completed' : active ? 'In progress' : 'Pending'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Task Metadata */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-gray-900 text-sm">Task Metadata</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Process</span>
                <span className="font-semibold text-gray-800">{projectName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Status</span>
                <StatusBadge status={task.status} isOverdue={isOverdue} />
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Priority</span>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Assignee</span>
                <span className="font-semibold text-gray-800">{assigneeName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Due Date</span>
                <span className="font-semibold text-gray-800">{dueDate ? new Date(dueDate).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action modal */}
      <Modal isOpen={actionOpen} onClose={() => setActionOpen(false)} title="Task Actions"
        footer={<>
          <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
          {activeTab === 'submit' && (
            <Button variant="primary" onClick={async () => {
              try { await tasksApi.update(taskId, { status: 'In_Review' }); setTask(p => ({ ...p, status: 'In_Review' })); showToast('success', 'Work submitted.'); setActionOpen(false); }
              catch { showToast('error', 'Failed to submit.'); }
            }}>Submit for Review</Button>
          )}
          {activeTab === 'blocker' && <Button variant="primary" onClick={handleReportBlocker}>Report Blocker</Button>}
          {activeTab === 'extension' && <Button variant="primary" onClick={handleExtension}>Submit Request</Button>}
        </>}>
        <div className="-mx-6 -mt-4 mb-4 border-b border-slate-200 flex px-6 gap-6">
          {[['submit','Submit Work'],['blocker','Report Blocker'],['extension','Request Extension']].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`py-3 text-sm font-semibold transition-colors ${activeTab===id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        {activeTab === 'submit' && <p className="text-sm text-gray-600">Current status: <strong>{fmt(task.status)}</strong>. Submitting will move it to the review queue.</p>}
        {activeTab === 'blocker' && (
          <div className="space-y-4">
            <FormField label="Blocker Type">
              <Select value={blockerType} onChange={e => setBlockerType(e.target.value)}>
                {BLOCKER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Description" required>
              <Textarea value={blockerDesc} onChange={e => setBlockerDesc(e.target.value)} rows={4} placeholder="Describe the blocker in detail..." />
            </FormField>
          </div>
        )}
        {activeTab === 'extension' && (
          <div className="space-y-4">
            <FormField label="New Deadline" required>
              <Input type="date" value={extDate} onChange={e => setExtDate(e.target.value)} />
            </FormField>
            <FormField label="Reason" required>
              <Textarea value={extReason} onChange={e => setExtReason(e.target.value)} rows={4} placeholder="Explain why more time is needed..." />
            </FormField>
          </div>
        )}
      </Modal>

      {/* Subtask modal */}
      <Modal isOpen={subtaskOpen} onClose={() => { setSubtaskOpen(false); setSubtaskError(''); }} title="Create Subtask"
        footer={<>
          <Button variant="outline" onClick={() => { setSubtaskOpen(false); setSubtaskError(''); }}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveSubtask} disabled={savingSt}>{savingSt ? 'Saving…' : 'Assign Subtask'}</Button>
        </>}>
        <div className="space-y-4">
          {subtaskError && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {subtaskError}
            </div>
          )}
          <FormField label="Subtask Title" required>
            <Input value={stForm.title} onChange={e => setStForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" />
          </FormField>
          <FormField label="Assign To">
            <Select value={stForm.assignee} onChange={e => setStForm(f => ({ ...f, assignee: e.target.value }))}>
              <option value="">— Unassigned —</option>
              <option value={user.id}>{user.fullName || 'Me'}</option>
              {members.map(m => <option key={m.id || m.userId} value={m.id || m.userId}>{m.fullName || m.name || 'Member #' + m.id}</option>)}
            </Select>
          </FormField>
          <FormField label="Deadline">
            <Input type="date" value={stForm.due} onChange={e => setStForm(f => ({ ...f, due: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* Request Changes Modal */}
      <Modal
        isOpen={isChangesModalOpen}
        onClose={() => {
          setIsChangesModalOpen(false);
          setChangeNotes('');
        }}
        title="Request Deliverable Revisions"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setIsChangesModalOpen(false);
                setChangeNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmRequestChanges}
              disabled={submittingChanges || !changeNotes.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submittingChanges ? 'Sending Request...' : 'Send Revision Request'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Send this deliverable back to <strong>{assigneeName}</strong> for updates. Please specify what needs to be revised or what evidence is required.
          </p>
          <FormField label="Revision Instructions & Feedback" required>
            <Textarea
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              rows={4}
              placeholder="e.g., Please attach the missing verification logs and complete subtask 1-1 before resubmitting."
            />
          </FormField>
        </div>
      </Modal>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  );
}