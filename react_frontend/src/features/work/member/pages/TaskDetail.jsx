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
import * as tasksApi from '../../../../services/api/tasks';
import * as subtasksApi from '../../../../services/api/subtasks';
import * as evidenceApi from '../../../../services/api/evidence';
import * as complianceApi from '../../../../services/api/compliance';
import * as usersApi from '../../../../services/api/users';
import * as projectsApi from '../../../../services/api/projects';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  ArrowLeft,
  Send,
  ShieldAlert,
  Check,
  AlertOctagon,
  UserCheck,
  Mail,
} from 'lucide-react';

export default function MemberTaskDetail() {
  const { id: taskId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [manager, setManager] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [taskViolations, setTaskViolations] = useState([]);
  // Track which subtasks have been submitted this session so Submit btn hides after send
  const [submittedSubtaskIds, setSubmittedSubtaskIds] = useState(new Set());
  const [isEvidenceRequired, setIsEvidenceRequired] = useState(false);
  const [complianceRule, setComplianceRule] = useState(null);

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
    let isMounted = true;

    async function loadTaskDetails() {
      if (!taskId) return;
      setLoading(true);
      try {
        const [taskRes, usersRes, projectsRes, evRes, bindingsRes, violationsRes] = await Promise.allSettled([
          tasksApi.get(taskId),
          usersApi.list(),
          projectsApi.list(),
          evidenceApi.list(),
          complianceApi.getBindings(),
          complianceApi.getViolations(),
        ]);

        if (!isMounted) return;

        const rawTask = taskRes.status === 'fulfilled' && taskRes.value ? (taskRes.value.data || taskRes.value) : null;
        if (!rawTask) {
          setLoading(false);
          return;
        }

        setTask(rawTask);

        const allUsers = usersRes.status === 'fulfilled' && usersRes.value ? (Array.isArray(usersRes.value) ? usersRes.value : usersRes.value.data || []) : [];
        const allProjects = projectsRes.status === 'fulfilled' && projectsRes.value ? (Array.isArray(projectsRes.value) ? projectsRes.value : projectsRes.value.data || []) : [];
        const allEv = evRes.status === 'fulfilled' && evRes.value ? (Array.isArray(evRes.value) ? evRes.value : evRes.value.data || []) : [];
        const allBindings = bindingsRes.status === 'fulfilled' && bindingsRes.value ? (Array.isArray(bindingsRes.value) ? bindingsRes.value : bindingsRes.value.data || []) : [];
        const allViolations = violationsRes.status === 'fulfilled' && violationsRes.value ? (Array.isArray(violationsRes.value) ? violationsRes.value : violationsRes.value.data || []) : [];

        setSubtasks(Array.isArray(rawTask.subtasks) ? rawTask.subtasks : []);
        setEvidenceList(allEv.filter((e) => String(e.taskId || e.task_id || e.task?.id) === String(taskId)));

        const activeViolations = allViolations.filter(
          (v) => String(v.entityId) === String(taskId) && ['Open', 'Under_Review'].includes(v.status)
        );
        setTaskViolations(activeViolations);

        const projId = rawTask.projectId || rawTask.project?.id;
        const projectObj = allProjects.find((p) => String(p.id) === String(projId)) || rawTask.project || null;
        setProject(projectObj);

        const assignerId = rawTask.createdById || rawTask.createdBy?.id || user?.managerId;
        setManager(allUsers.find((u) => String(u.id) === String(assignerId)) || rawTask.createdBy || null);

        // Check if any active compliance rule mandates evidence for this deliverable
        const matchingRule = allBindings.find((b) => {
          if (!b.rule || !b.rule.isActive) return false;
          const reqType = b.rule.criteria?.requirement?.type;
          if (reqType !== 'EVIDENCE_REQUIRED') return false;

          const scopeType = b.scopeType;
          const scopeId = String(b.scopeId);
          if (scopeType === 'Company' && scopeId === String(rawTask.companyId || user?.companyId)) return true;
          if (scopeType === 'Project' && scopeId === String(rawTask.projectId || projectObj?.id)) return true;
          if (scopeType === 'Team' && scopeId === String(projectObj?.teamId || projectObj?.team?.id)) return true;
          if (scopeType === 'Branch' && scopeId === String(projectObj?.team?.branchId)) return true;
          return false;
        });

        setIsEvidenceRequired(Boolean(matchingRule || activeViolations.length > 0));
        setComplianceRule(matchingRule?.rule || activeViolations[0]?.rule || null);
      } catch (err) {
        console.error('Error loading task details:', err);
        if (isMounted) toast.error('Failed to load task');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTaskDetails();
    return () => {
      isMounted = false;
    };
  }, [taskId, user?.id]);

  const handleSubtaskToggle = async (subId, completed) => {
    try {
      const nextStatus = completed ? 'Completed' : 'Active';
      await subtasksApi.update(subId, { status: nextStatus });
      setSubtasks((prev) =>
        prev.map((st) => ((st.id || st.subtaskId) === subId ? { ...st, status: nextStatus } : st))
      );
    } catch (err) {
      toast.error('Could not update subtask. Please try again.');
    }
  };

  const handleSubtaskSubmit = async (subId) => {
    try {
      await subtasksApi.update(subId, { status: 'In_Review' });
      setSubtasks((prev) =>
        prev.map((st) => ((st.id || st.subtaskId) === subId ? { ...st, status: 'In_Review' } : st))
      );
      setSubmittedSubtaskIds((prev) => new Set([...prev, subId]));
      toast.success('Subtask submitted to Team Lead for review!');
    } catch (err) {
      toast.error('Could not submit subtask for review.');
    }
  };

  const handleDeleteEvidence = async (evId) => {
    try {
      await evidenceApi.remove(evId);
      setEvidenceList((prev) => prev.filter((e) => e.id !== evId));
      toast.success('Evidence removed.');
    } catch (err) {
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

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-amber-500" />}
          title="Task not found"
          description="The requested deliverable could not be loaded or may have been reassigned."
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
  const dueDate = task.dueDate || task.deadline;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isCompleted;
  const managerName = manager?.fullName || manager?.name || 'Team Lead';

  const isLockedOut = taskViolations.some((v) => {
    if (v.breachedAt) return true;
    if (v.dueDate && new Date(v.dueDate) < new Date() && v.status === 'Open') return true;
    return false;
  });

  const primaryViolation = taskViolations.find((v) => v.breachedAt) || taskViolations[0];
  const latestRejectedEvidence = evidenceList.find((e) => e.status === 'Rejected' && e.rejectionReason);

  const stages = [
    { label: 'Assigned', done: true },
    { label: 'In Progress', done: !isCompleted && !isPendingReview && task.status !== 'Draft' && task.status !== 'Pending' },
    { label: 'Under Review', done: isPendingReview || isCompleted },
    { label: 'Completed', done: isCompleted },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
            onStatusToggle={handleSubtaskToggle}
            onSubmitSubtask={!isCompleted ? handleSubtaskSubmit : undefined}
            submittedSubtaskIds={submittedSubtaskIds}
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
                    {primaryViolation?.assignedOfficer?.fullName ||
                      primaryViolation?.rule?.assignedOfficer?.fullName ||
                      'Compliance Lead'}
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
        isEvidenceRequired={isEvidenceRequired}
        complianceRuleName={complianceRule?.name}
        existingEvidenceCount={evidenceList.length}
        onSuccess={(newEv) => {
          setTask((prev) => ({ ...prev, status: 'In_Review' }));
          if (newEv) {
            setEvidenceList((prev) => [newEv, ...prev]);
          }
        }}
      />

      <ReportBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        taskId={taskId}
        projectId={task?.projectId || project?.id}
        managerId={manager?.id || task?.createdById}
        onSuccess={() => setTask((prev) => ({ ...prev, status: 'Blocked' }))}
      />

      <RequestExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        taskId={taskId}
        projectId={task?.projectId || project?.id}
        managerId={manager?.id || task?.createdById}
        taskTitle={task?.title}
      />

      <UploadEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        taskId={taskId}
        onSuccess={(newEv) => {
          if (newEv) setEvidenceList((prev) => [newEv, ...prev]);
          complianceApi.getViolations().then((res) => {
            const list = Array.isArray(res) ? res : res?.data || [];
            setTaskViolations(list.filter((v) => String(v.entityId) === String(taskId) && ['Open', 'Under_Review'].includes(v.status)));
          }).catch(() => {});
        }}
      />
    </div>
  );
}
