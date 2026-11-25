import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../shared/components/Toast';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { SubtaskList } from '../../components/SubtaskList';
import TaskHeader from '../components/TaskHeader';
import TaskComplianceCard from '../components/TaskComplianceCard';
import { EvidenceUploadCard } from '../../components/EvidenceUploadCard';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import {
  SubmitWorkModal,
  ReportBlockerModal,
  RequestExtensionModal,
  UploadEvidenceModal,
} from '../components/modals';
import { useDispatch, useSelector } from 'react-redux';
import { memberReads, useMemberReads } from '../useMemberReads';
import { fetchTaskById, selectTaskById, selectTaskMutation } from '../../../../store/tasks';
import { updateSubtask, selectSubtasksByTaskId } from '../../../../store/subtasks';
import { selectUserById, selectAllUsers } from '../../../../store/users';
import { selectProjectById } from '../../../../store/projects';
import { selectAllEvidence, deleteEvidence } from '../../../../store/evidence';
import { selectAllComplianceBindings } from '../../../../store/complianceBindings';
import { selectAllComplianceViolations, fetchComplianceViolations } from '../../../../store/complianceViolations';
import { AlertTriangle, FileText, ShieldAlert } from 'lucide-react';

const reads = [memberReads.users, memberReads.projects, memberReads.evidence, memberReads.complianceBindings, memberReads.complianceViolations];

export default function MemberTaskDetail() {
  const { id: taskId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const lists = useMemberReads(reads);
  const task = useSelector(state => selectTaskById(state, taskId));
  const detailStatus = useSelector(state => selectTaskMutation(state, 'getById').status);
  const detailError = useSelector(state => selectTaskMutation(state, 'getById').error);
  const loading = lists.loading || detailStatus === 'idle' || detailStatus === 'loading';
  const error = lists.error;
  const project = useSelector(state => selectProjectById(state, task?.projectId || task?.project?.id)) || task?.project;
  const manager = useSelector(state => selectUserById(state, task?.createdById || task?.createdBy?.id || user?.managerId)) || task?.createdBy;
  const subtasks = useSelector(state => selectSubtasksByTaskId(state, taskId));
  const allEvidence = useSelector(selectAllEvidence);
  const evidenceList = allEvidence.filter(e => String(e.taskId || e.task_id || e.task?.id) === taskId);
  const bindings = useSelector(selectAllComplianceBindings);
  const violations = useSelector(selectAllComplianceViolations);
  const taskViolations = violations.filter(v => String(v.entityId) === taskId && ['Open', 'Under_Review'].includes(v.status));
  const primaryViolation = taskViolations.find((v) => v.breachedAt) || taskViolations[0];
  const matchingRule = bindings.find(({ rule, scopeType, scopeId }) => {
    if (!task || !rule?.isActive || rule.criteria?.requirement?.type !== 'EVIDENCE_REQUIRED') return false;
    const scopes = {
      Company: task.companyId || user?.companyId,
      Project: task.projectId || project?.id,
      Team: project?.teamId || project?.team?.id,
      Branch: project?.team?.branchId,
    };
    return scopes[scopeType] != null && String(scopes[scopeType]) === String(scopeId);
  });
  const isEvidenceRequired = Boolean(matchingRule || taskViolations.length);
  const complianceRule = matchingRule?.rule || taskViolations[0]?.rule;
  const allUsers = useSelector(selectAllUsers);
  const complianceOfficer =
    primaryViolation?.assignedOfficer ||
    primaryViolation?.rule?.category?.owner ||
    complianceRule?.category?.owner ||
    complianceRule?.assignedOfficer ||
    allUsers.find((u) => {
      const r = String(u.role || u.roleName || u.roleSlug || '').toLowerCase();
      return r.includes('compliance_officer') || r === 'compliance';
    }) || null;

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  const getSlaTimeRemaining = (dueDate) => {
    if (!dueDate) return null;
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff <= 0) return { expired: true, text: 'Expired' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return { expired: false, text: `${days}d ${remHours}h remaining` };
    }
    return { expired: false, text: `${hours}h ${minutes}m remaining` };
  };

  useEffect(() => {
    if (taskId) dispatch(fetchTaskById(taskId));
  }, [dispatch, taskId]);

  const handleSubtaskSubmit = async (subId) => {
    try {
      await dispatch(updateSubtask({ id: subId, data: { status: 'In_Review' } })).unwrap();
      toast.success('Subtask sent to your Team Lead for review.');
    } catch (err) {
      toast.error(err.message || 'Could not submit subtask for review.');
    }
  };

  const handleDeleteEvidence = async (evId) => {
    try {
      await dispatch(deleteEvidence(evId)).unwrap();
      toast.success('Evidence removed.');
    } catch {
      toast.error('Failed to delete evidence.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader />
        <p className="text-sm font-medium text-slate-500">Loading task deliverable...</p>
      </div>
    );
  }

  if (!task || detailStatus === 'failed') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-amber-500" />}
          title="Task not found"
          description={detailError?.message || "The requested deliverable could not be loaded or may have been reassigned."}
          action={
            <Button variant="primary" onClick={() => navigate(PATHS.MEMBER.TASKS)}>
              Back to My Tasks
            </Button>
          }
        />
      </div>
    );
  }

  const isCompleted = String(task.status || '').toLowerCase().includes('complete');
  const isPendingReview = ['pending_tl_review', 'in_review', 'under_review'].includes(String(task.status || '').toLowerCase());
  const subtaskStatus = (st) => String(st.status || '').toLowerCase();
  const mySubtasks = subtasks.filter((st) => String(st.assignedToId || st.assignedTo?.id || '') === String(user?.id || ''));
  const myOpenSubtaskIds = mySubtasks
    .filter((st) => !subtaskStatus(st).includes('complete') && !subtaskStatus(st).includes('review') && subtaskStatus(st) !== 'cancelled')
    .map((st) => st.id || st.subtaskId);
  const myWorkInReview = mySubtasks.length > 0 && myOpenSubtaskIds.length === 0
    && mySubtasks.some((st) => subtaskStatus(st).includes('review'));
  const dueDate = task.dueDate || task.deadline;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isCompleted;
  const managerName = manager?.fullName || manager?.name || 'Team Lead';

  const isLockedOut = taskViolations.some((v) => {
    if (v.breachedAt) return true;
    if (v.dueDate && new Date(v.dueDate) < new Date() && v.status === 'Open') return true;
    return false;
  });

  const latestRejectedEvidence = evidenceList.find((e) => e.status === 'Rejected' && e.rejectionReason);

  const stages = [
    { label: 'Assigned', done: true },
    { label: 'In Progress', done: !isCompleted && !isPendingReview && task.status !== 'Draft' && task.status !== 'Pending' },
    { label: 'Under Review', done: isPendingReview || isCompleted },
    { label: 'Completed', done: isCompleted },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {/* Decomposed Header Section */}
      <TaskHeader
        task={task}
        taskId={taskId}
        project={project}
        managerName={managerName}
        dueDate={dueDate}
        isOverdue={isOverdue}
        isCompleted={isCompleted}
        isPendingReview={isPendingReview}
        myWorkInReview={myWorkInReview}
        hasOpenSubtasks={myOpenSubtaskIds.length > 0}
        isLockedOut={isLockedOut}
        isEvidenceRequired={isEvidenceRequired}
        complianceRule={complianceRule}
        stages={stages}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
        onOpenBlockerModal={() => setIsBlockerModalOpen(true)}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
      />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Compliance Governance & Remediation Card */}
          <TaskComplianceCard
            primaryViolation={primaryViolation}
            isEvidenceRequired={isEvidenceRequired}
            latestRejectedEvidence={latestRejectedEvidence}
            isLockedOut={isLockedOut}
            complianceRule={complianceRule}
            complianceOfficer={complianceOfficer}
            taskDueDate={dueDate}
            getSlaTimeRemaining={getSlaTimeRemaining}
            onOpenEvidenceModal={() => setIsEvidenceModalOpen(true)}
          />

          {/* Deliverable Scope */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Deliverable Requirements & Scope</span>
            </h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
              {task.description || 'No detailed instructions or acceptance criteria provided.'}
            </div>
            {task.notes && (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900">
                <span className="font-bold">Latest Submission Notes: </span>
                {task.notes}
              </div>
            )}
          </div>

          {/* Reusable SubtaskList */}
          <SubtaskList
            subtasks={subtasks}
            readOnly={isCompleted}
            onSubmitSubtask={!isCompleted ? handleSubtaskSubmit : undefined}
            currentUserId={user?.id}
          />

          {/* Reusable EvidenceUploadCard */}
          <EvidenceUploadCard
            taskId={taskId}
            evidenceList={evidenceList}
            readOnly={isCompleted}
            required={isEvidenceRequired}
            onRequestUpload={() => setIsEvidenceModalOpen(true)}
            onDelete={handleDeleteEvidence}
          />
        </div>

        {/* Right Info Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm">Task Metadata</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Process</span>
                <span className="font-semibold text-slate-800">{project?.name || 'General'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Status</span>
                <StatusBadge status={task.status} isOverdue={isOverdue} />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Priority</span>
                <PriorityBadge priority={task.priority} />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Lead</span>
                <span className="font-semibold text-slate-800">{managerName}</span>
              </div>
            </div>
          </div>

          {/* Compliance Officer POC Sidebar Card */}
          {(primaryViolation || isEvidenceRequired) && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-blue-600" />
                <span>Compliance Governance</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Policy Domain</span>
                  <span className="font-semibold text-slate-800">
                    {primaryViolation?.rule?.category?.name || 'Regulatory Standard'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Officer Contact</span>
                  <span className="font-semibold text-slate-800">
                    {complianceOfficer?.fullName || 'Compliance Officer'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Governance State</span>
                  <span className={`font-bold ${isLockedOut ? 'text-rose-600' : 'text-amber-600'}`}>
                    {isLockedOut ? 'Locked Out' : 'Remediating'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Modular Modals */}
      <SubmitWorkModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        taskId={taskId}
        taskTitle={task?.title}
        subtaskIds={myOpenSubtaskIds}
        isEvidenceRequired={isEvidenceRequired}
        complianceRuleName={complianceRule?.name}
        existingEvidenceCount={evidenceList.length}
      />

      <ReportBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        taskId={taskId}
        projectId={task?.projectId || project?.id}
        managerId={manager?.id || task?.createdById}
      />

      <RequestExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        taskId={taskId}
        projectId={task?.projectId || project?.id}
        managerId={manager?.id || task?.createdById}
        taskTitle={task?.title}
        currentDeadline={task?.dueDate || task?.deadline}
      />

      <UploadEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        taskId={taskId}
        onSuccess={() => dispatch(fetchComplianceViolations({ force: true }))}
      />
    </div>
  );
}
