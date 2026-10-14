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

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTaskDetails() {
      if (!taskId) return;
      setLoading(true);
      try {
        const [taskRes, usersRes, projectsRes, evRes] = await Promise.allSettled([
          tasksApi.get(taskId),
          usersApi.list(),
          projectsApi.list(),
          evidenceApi.list(),
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

        setSubtasks(Array.isArray(rawTask.subtasks) ? rawTask.subtasks : []);
        setEvidenceList(allEv.filter((e) => String(e.taskId || e.task_id || e.task?.id) === String(taskId)));

        const projId = rawTask.projectId || rawTask.project?.id;
        setProject(allProjects.find((p) => String(p.id) === String(projId)) || rawTask.project || null);

        const assignerId = rawTask.createdById || rawTask.createdBy?.id || user?.managerId;
        setManager(allUsers.find((u) => String(u.id) === String(assignerId)) || rawTask.createdBy || null);
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
      toast.error('Could not update subtask');
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

  const STAGES = ['Data Collection', 'Work In Progress', 'Team Leader Review', 'Compliance Audit'];
  const STAGE_MAP = { Active: 1, In_Review: 2, Pending_TL_Review: 2, Under_Review: 2, Completed: 3 };
  const currentStage = isCompleted ? 3 : (STAGE_MAP[task.status] ?? 1);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={PATHS.MEMBER.DASHBOARD} className="hover:text-gray-700">
            Dashboard
          </Link>
          <span>›</span>
          <Link to={PATHS.MEMBER.TASKS} className="hover:text-gray-700">
            My Tasks
          </Link>
          <span>›</span>
          <span className="text-gray-900 font-semibold truncate max-w-xs">{task.title}</span>
        </div>

        <button
          type="button"
          onClick={() => navigate(PATHS.MEMBER.TASKS)}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to tasks</span>
        </button>
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
                {project?.name || 'General Process'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-gray-500 font-medium">
                Assigned by <strong className="text-gray-900">{managerName}</strong>
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
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left / Main Column */}
        <div className="space-y-6">
          {/* Deliverable Requirements & Scope */}
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

          {/* Reusable SubtaskList */}
          <SubtaskList
            subtasks={subtasks}
            readOnly={isCompleted}
            onStatusToggle={handleSubtaskToggle}
          />

          {/* Reusable EvidenceUploadCard */}
          <EvidenceUploadCard
            taskId={taskId}
            evidenceList={evidenceList}
            readOnly={isCompleted}
            onRequestUpload={() => setIsEvidenceModalOpen(true)}
            onDelete={handleDeleteEvidence}
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
                <span className="font-semibold text-gray-800">{project?.name || 'General'}</span>
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
                <span className="text-gray-400 font-medium">Lead</span>
                <span className="font-semibold text-gray-800">{managerName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span className="text-gray-400 font-medium">Due Date</span>
                <span className="font-semibold text-gray-800">{dueDate ? new Date(dueDate).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Modular Modals */}
      <SubmitWorkModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        taskId={taskId}
        onSuccess={(notes) => setTask((prev) => ({ ...prev, status: 'In_Review', notes: notes || prev?.notes }))}
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
        onSuccess={(newEv) => setEvidenceList((prev) => [newEv, ...prev])}
      />
    </div>
  );
}
