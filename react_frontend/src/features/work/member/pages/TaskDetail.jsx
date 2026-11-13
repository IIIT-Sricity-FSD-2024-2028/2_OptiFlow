import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../shared/components/Toast';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { SubtaskList } from '../../components/SubtaskList';
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
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Link to={PATHS.MEMBER.DASHBOARD} className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <Link to={PATHS.MEMBER.TASKS} className="hover:text-blue-600 transition-colors">
            My Tasks
          </Link>
          <span>›</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs">{task.title}</span>
        </div>

        <button
          type="button"
          onClick={() => navigate(PATHS.MEMBER.TASKS)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to tasks</span>
        </button>
      </div>

      {/* Main Task Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                TASK-{String(task.id || taskId).slice(0, 8)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {project?.name || 'General Process'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Assigned by <strong className="text-slate-800">{managerName}</strong>
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {task.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  Due:{' '}
                  <strong className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>
                    {dueDate ? new Date(dueDate).toLocaleDateString() : 'No deadline'}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  Estimated:{' '}
                  <strong className="text-slate-700">
                    {task.estimatedHours || task.estimated_hours || 0} hrs
                  </strong>
                </span>
              </div>

              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} isOverdue={isOverdue} />
              {isLockedOut ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                  title="Compliance SLA expired. Remediation lockout active."
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  Governance Lockout
                </span>
              ) : isEvidenceRequired ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200"
                  title={`Mandated by compliance rule: ${complianceRule?.name || 'Evidence Policy'}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Evidence Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/80">
                  <Check className="w-3 h-3 text-slate-400" />
                  Evidence Optional
                </span>
              )}
            </div>
          </div>

          {/* Member Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="text-xs font-semibold"
                >
                  Request Extension
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBlockerModalOpen(true)}
                  className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mr-1.5" />
                  Report Blocker
                </Button>

                {isPendingReview ? (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled
                    className="text-xs font-semibold opacity-75 cursor-not-allowed bg-purple-600 hover:bg-purple-600"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Under Review by Lead
                  </Button>
                ) : isLockedOut ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled
                    className="text-xs font-semibold opacity-90 cursor-not-allowed bg-rose-600 hover:bg-rose-600 flex items-center gap-1.5"
                    title="Remediation deadline expired. Task completion locked by Compliance Governance."
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    Locked by Compliance
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Work for Review
                  </Button>
                )}
              </>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Task Completed & Approved
              </span>
            )}
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {stages.map((stg, i) => (
              <React.Fragment key={stg.label}>
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      stg.done
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {stg.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold mt-1.5 ${
                      stg.done ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {stg.label}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 -mt-4 transition-all ${
                      stages[i + 1].done ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Compliance Governance & Remediation Card */}
          {(primaryViolation || isEvidenceRequired || latestRejectedEvidence) && (
            <div
              className={`rounded-2xl p-6 border shadow-xs transition-all ${
                isLockedOut
                  ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-200'
                  : primaryViolation
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-blue-50/70 border-blue-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isLockedOut
                        ? 'bg-rose-600 text-white shadow-xs'
                        : primaryViolation
                        ? 'bg-amber-500 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {isLockedOut ? <AlertOctagon size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isLockedOut
                            ? 'bg-rose-200 text-rose-900'
                            : primaryViolation
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-blue-200 text-blue-900'
                        }`}
                      >
                        {isLockedOut
                          ? '🚨 Governance Lockout Engaged'
                          : primaryViolation
                          ? '⚠️ Remediation SLA Active'
                          : '🛡️ Evidence Policy Active'}
                      </span>
                      {primaryViolation?.severity && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                          Severity: {primaryViolation.severity}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {primaryViolation?.rule?.name || complianceRule?.name || 'Deliverable Compliance Policy'}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {primaryViolation?.description ||
                        complianceRule?.description ||
                        'This deliverable requires formal regulatory documentation and audit evidence prior to completion.'}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <Button
                    variant={isLockedOut ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => setIsEvidenceModalOpen(true)}
                    className="text-xs font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Upload Remediation Evidence</span>
                  </Button>
                </div>
              </div>

              {/* Rejection Alert Banner if officer rejected previous upload */}
              {latestRejectedEvidence && (
                <div className="mt-4 p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Prior Submission Rejected by Compliance Officer: </span>
                    <span>"{latestRejectedEvidence.rejectionReason}"</span>
                    <p className="mt-1 text-[11px] text-rose-700">
                      Please resolve the feedback above and submit revised documentation.
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata Grid: Officer Contact, SLA Countdown, Policy Scope */}
              <div className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Assigned Compliance Officer:</span>
                  <div className="mt-0.5 font-bold text-slate-900 flex items-center gap-1">
                    <UserCheck size={13} className="text-blue-600" />
                    <span>
                      {primaryViolation?.assignedOfficer?.fullName ||
                        primaryViolation?.rule?.assignedOfficer?.fullName ||
                        'Compliance Governance Office'}
                    </span>
                  </div>
                  <a
                    href={`mailto:${
                      primaryViolation?.assignedOfficer?.email ||
                      primaryViolation?.rule?.assignedOfficer?.email ||
                      'compliance@optiflow.io'
                    }`}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Mail size={11} />
                    <span>
                      {primaryViolation?.assignedOfficer?.email ||
                        primaryViolation?.rule?.assignedOfficer?.email ||
                        'compliance@optiflow.io'}
                    </span>
                  </a>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Remediation SLA Deadline:</span>
                  {primaryViolation?.dueDate ? (
                    <div className="mt-0.5">
                      <span
                        className={`font-bold flex items-center gap-1 ${
                          isLockedOut ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        <Clock size={13} className={isLockedOut ? 'text-rose-600' : 'text-amber-600'} />
                        <span>{new Date(primaryViolation.dueDate).toLocaleString()}</span>
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          isLockedOut ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {isLockedOut
                          ? '⛔ Deadline Breached (Lockout active)'
                          : getSlaTimeRemaining(primaryViolation.dueDate)?.text || 'Pending evaluation'}
                      </span>
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-700 mt-0.5 block">Standard SLA Window</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-500 font-medium block">Resolution Actions:</span>
                  <p className="mt-0.5 text-[11px] text-slate-600 leading-normal">
                    {isLockedOut ? (
                      <>
                        1. Upload remediation evidence.<br />
                        2. Contact officer for Fast-Track Waiver.<br />
                        3. Request PM deadline extension.
                      </>
                    ) : (
                      <>
                        Submit evidence before deadline to maintain continuous task workflow.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

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
