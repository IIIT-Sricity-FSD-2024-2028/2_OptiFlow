
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../../../shared/components/Button';
import { Badge } from '../../../../shared/components/Badge';
import { formatDate } from '../../../../shared/utils/formatDate';
import { StatCard } from '../../../../shared/components/StatCard';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Toast } from '../../../../shared/components/Toast';
import { EscalationForm } from '../../components/EscalationForm';
import { SubtaskList } from '../../components/SubtaskList';
import { ReviewQueue } from '../components/ReviewQueue';
import { EscalationWatch } from '../components/EscalationWatch';
import { DashboardSubtaskModal, SendBackSubtaskModal } from '../components/DashboardModals';
import { getBadgeStatus, formatStatus } from '../components/statusDisplay';

import * as tasksApi from '../../../../services/api/tasks';
import * as subtasksApi from '../../../../services/api/subtasks';
import * as escalationsApi from '../../../../services/api/escalations';
import * as usersApi from '../../../../services/api/users';
import * as projectsApi from '../../../../services/api/projects';
import { useAuth } from '../../../../context/AuthContext';

export default function TeamLeadDashboard() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);

  const [project, setProject] = useState({
    name: '—',
    status: '',
    progress: 0,
    totalTasks: 0,
  });

  const [loading, setLoading] = useState(true);



  const [isSubtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState('');
  const [isParentLocked, setIsParentLocked] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskAssignee, setSubtaskAssignee] = useState('');
  const [subtaskDeadline, setSubtaskDeadline] = useState('');
  const [savingSubtask, setSavingSubtask] = useState(false);
  const [subtaskError, setSubtaskError] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [reviewTab, setReviewTab] = useState('tasks'); // 'tasks' | 'subtasks' | 'extensions'
  const [sendBackSubtask, setSendBackSubtask] = useState(null);
  const [sendBackReason, setSendBackReason] = useState('');
  const [sendBackError, setSendBackError] = useState('');
  const [sendingBack, setSendingBack] = useState(false);




  const [toast, setToast] = useState({
    visible: false,
    type: 'success',
    message: '',
  });


  const showToast = (type, message) => {
    setToast({
      visible: true,
      type,
      message,
    });

    setTimeout(() => {
      setToast((previous) => ({
        ...previous,
        visible: false,
      }));
    }, 3000);
  };

  const closeToast = () => {
    setToast((previous) => ({
      ...previous,
      visible: false,
    }));
  };

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);

      try {
        const [
          tasksResponse,
          escalationResponse,
          membersResponse,
          projectsResponse,
        ] = await Promise.all([
          tasksApi.list(),
          escalationsApi.list(),
          usersApi.list(),
          projectsApi.list(),
        ]);

        if (!mounted) return;

        const normalizedTasks = Array.isArray(tasksResponse)
          ? tasksResponse
          : tasksResponse?.data || [];

        const normalizedEscalations = Array.isArray(escalationResponse)
          ? escalationResponse
          : escalationResponse?.data || [];

        const normalizedMembers = Array.isArray(membersResponse)
          ? membersResponse
          : membersResponse?.data || [];

        // Filter to include users belonging to the current Team Lead's team(s) or reporting to them
        const myTeamIds = (user?.teams || []).map(t => t.id || t.teamId).filter(Boolean);
        const myTeamMembers = normalizedMembers.filter(member => {
          if (member.id === user?.id) return false;
          const sharesTeam = myTeamIds.length > 0 && (member.teams || []).some(t => myTeamIds.includes(t.id || t.teamId));
          const reportsToMe = member.managerUserId === user?.id;
          return sharesTeam || reportsToMe;
        });

        const normalizedProjects = Array.isArray(projectsResponse)
          ? projectsResponse
          : projectsResponse?.data || [];

        setTasks(normalizedTasks);
        setEscalations(normalizedEscalations);
        setTeamMembers(myTeamMembers);
        setProjects(normalizedProjects);

        if (normalizedProjects.length > 0) {
          setProject(normalizedProjects[0]);
        }
      } catch (error) {
        console.error('Failed to load Team Lead dashboard:', error);

        if (mounted) {
          showToast(
            'error',
            'Failed to load dashboard data.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [user.id, user?.teams]);

  const teamOverviewTasks = tasks.filter(
    (task) => !task.isSubtask && !task.parentId && !task.taskId
  );

  const reviewQueueTasks = tasks.filter((task) =>
    ['In_Review', 'Pending_TL_Review'].includes(task.status)
  );

  // Subtasks submitted for review by team members
  const reviewQueueSubtasks = tasks.flatMap((task) =>
    (task.subtasks || []).filter(
      (st) => st.status === 'In_Review'
    ).map((st) => ({ ...st, _parentTask: task }))
  );

  const inProgressCount = teamOverviewTasks.filter((task) =>
    [
      'Active',
      'In_Review',
      'Pending_TL_Review',
    ].includes(task.status)
  ).length;

  const doneCount = teamOverviewTasks.filter(
    (task) => task.status === 'Completed'
  ).length;

  const blockedCount = teamOverviewTasks.filter(
    (task) => task.status === 'Blocked'
  ).length;

  // Split escalations: extension requests vs regular blockers
  const extensionRequests = escalations.filter(
    (e) =>
      String(e.blockerType || '').toLowerCase().includes('extension') ||
      String(e.title || '').toLowerCase().includes('extension request')
  );

  const regularEscalations = escalations.filter(
    (e) =>
      !String(e.blockerType || '').toLowerCase().includes('extension') &&
      !String(e.title || '').toLowerCase().includes('extension request')
  );

  // ---------------------------------------------------------------------------
  // Subtask
  // ---------------------------------------------------------------------------

  const openSubtaskModal = (parentId = '') => {
    setSubtaskError('');
    setSelectedParentTaskId(parentId);
    setIsParentLocked(!!parentId);
    setSubtaskModalOpen(true);
  };

  const closeSubtaskModal = () => {
    setSubtaskModalOpen(false);
    setSubtaskError('');
    setSelectedParentTaskId('');
    setIsParentLocked(false);
    setSubtaskTitle('');
    setSubtaskAssignee('');
    setSubtaskDeadline('');
    setSavingSubtask(false);
  };

  const handleSaveSubtask = async () => {
    setSubtaskError('');
    if (!selectedParentTaskId) {
      setSubtaskError('Please select a parent task.');
      return;
    }

    if (!subtaskTitle.trim()) {
      setSubtaskError('Subtask title is required.');
      return;
    }

    setSavingSubtask(true);

    const assignedMember = teamMembers.find(
      (m) => String(m.id || m.userId) === String(subtaskAssignee)
    );

    const newSubtask = {
      taskId: selectedParentTaskId,
      title: subtaskTitle.trim(),
      assignedTo: subtaskAssignee || undefined,
      assignedToId: subtaskAssignee || undefined,
      dueDate: subtaskDeadline || undefined,
      isSubtask: true,
      status: 'Active',
    };

    try {
      const response = await subtasksApi.create(newSubtask);

      const createdSubtask =
        response?.data ||
        response || {
          id: Date.now(),
          ...newSubtask,
        };

      const subtaskForDisplay = {
        ...createdSubtask,
        assignedTo: assignedMember?.fullName ||
          assignedMember?.name ||
          (String(subtaskAssignee) === String(user.id) ? user.fullName : subtaskAssignee),
        assignedToName: assignedMember?.fullName ||
          assignedMember?.name ||
          (String(subtaskAssignee) === String(user.id) ? user.fullName : undefined),
      };

      // 1. Immediately update parent task in local state so its subtasks array reflects the new subtask
      setTasks((previous) =>
        previous.map((task) =>
          task.id === selectedParentTaskId
            ? {
                ...task,
                subtasks: [...(task.subtasks || []), subtaskForDisplay],
              }
            : task
        )
      );

      // Auto-expand the parent task so the user sees the newly created subtask immediately
      setExpandedTaskId(selectedParentTaskId);

      showToast(
        'success',
        'Subtask created successfully.'
      );

      closeSubtaskModal();

      // 2. Refresh tasks from backend to guarantee complete sync
      tasksApi.list().then((res) => {
        const normalized = Array.isArray(res) ? res : res?.data || [];
        if (normalized.length > 0) {
          setTasks(normalized);
        }
      }).catch(console.error);
    } catch (error) {
      console.error(
        'Create subtask failed:',
        error
      );

      setSubtaskError(error?.message || 'Failed to create subtask.');
    } finally {
      setSavingSubtask(false);
    }
  };

  const handleApproveSubtask = async (subtask) => {
    try {
      await subtasksApi.update(subtask.id || subtask.subtaskId, { status: 'Completed' });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === subtask._parentTask?.id
            ? {
                ...t,
                subtasks: (t.subtasks || []).map((st) =>
                  (st.id || st.subtaskId) === (subtask.id || subtask.subtaskId)
                    ? { ...st, status: 'Completed' }
                    : st
                ),
              }
            : t
        )
      );
      showToast('success', `Subtask "${subtask.title}" approved.`);
    } catch {
      showToast('error', 'Failed to approve subtask.');
    }
  };

  const openSendBack = (subtask) => {
    setSendBackSubtask(subtask);
    setSendBackReason('');
    setSendBackError('');
  };

  const closeSendBack = () => {
    if (!sendingBack) setSendBackSubtask(null);
  };

  const handleRejectSubtask = async () => {
    const subtask = sendBackSubtask;
    const reason = sendBackReason.trim();
    if (!subtask) return;
    if (!reason) {
      setSendBackError('Tell the team member why the subtask is being sent back.');
      return;
    }
    setSendingBack(true);
    try {
      await subtasksApi.update(subtask.id || subtask.subtaskId, { status: 'Active', reviewComment: reason });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === subtask._parentTask?.id
            ? {
                ...t,
                subtasks: (t.subtasks || []).map((st) =>
                  (st.id || st.subtaskId) === (subtask.id || subtask.subtaskId)
                    ? { ...st, status: 'Active', reviewComment: reason }
                    : st
                ),
              }
            : t
        )
      );
      setSendBackSubtask(null);
      showToast('success', 'Subtask sent back with your comment.');
    } catch (err) {
      setSendBackError(err.message || 'Failed to send the subtask back.');
    } finally {
      setSendingBack(false);
    }
  };

  const handleExtensionDecision = async (ext, approved) => {
    const newStatus = approved ? 'Resolved' : 'Closed';
    try {
      await escalationsApi.update(ext.id, { status: newStatus });
      setEscalations((prev) =>
        prev.map((e) => (e.id === ext.id ? { ...e, status: newStatus } : e))
      );
      showToast(
        approved ? 'success' : 'info',
        approved ? 'Extension approved & member notified.' : 'Extension rejected & member notified.'
      );
    } catch {
      showToast('error', 'Failed to update extension request.');
    }
  };

  // ---------------------------------------------------------------------------
  // Escalation
  // ---------------------------------------------------------------------------

  const handleSendEscalation = async ({ taskId, reason, description, urgency }) => {
    const newEscalation = {
      taskId,
      title: description.trim(),
      blockerType: reason,
      priority: urgency,
    };

    try {
      const response = await escalationsApi.create(newEscalation);

      const createdEscalation = response?.data || response || {
        id: Date.now(),
        ...newEscalation,
      };

      setEscalations((previous) => [
        createdEscalation,
        ...previous,
      ]);

      showToast('success', 'Escalation sent to Project Manager.');
    } catch (error) {
      console.error('Escalation failed:', error);
      showToast('error', 'Failed to send escalation.');
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader />

          <p className="text-sm text-gray-500">
            Loading Team Lead dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Team Orchestration
          </h1>

          <p className="text-gray-500 mt-1">
            Oversee workload, reviews & breakdowns
          </p>
        </div>

        <Badge status="info">
          Team Lead
        </Badge>
      </div>

      {/* Stats */}

      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <StatCard
            title="Team Size"
            value={teamMembers.length}
            trend="Direct reports"
          />

          <StatCard
            title="Team Workload"
            value={teamOverviewTasks.length}
            trend={`${inProgressCount} active`}
          />

          <StatCard
            title="Review Queue"
            value={reviewQueueTasks.length}
            trend={
              reviewQueueTasks.length
                ? 'Awaiting approval'
                : 'Clear'
            }
          />

          <StatCard
            title="Blocked"
            value={blockedCount}
            trend={
              blockedCount > 0
                ? 'Needs attention'
                : 'None'
            }
          />

          <StatCard
            title="Escalations"
            value={regularEscalations.length}
            trend="Filed blockers"
          />

        </div>
      </section>

      {/* Primary actions */}

      <section className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={() => openSubtaskModal()}
        >
          Create subtask
        </Button>
      </section>

      {/* Team overview + Project pulse */}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Team overview */}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Team overview
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Current workload across your team
              </p>
            </div>

            <Link
              to="/team-lead/tasks"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Open task list →
            </Link>
          </div>

          <div className="p-5">
            {teamOverviewTasks.length === 0 ? (
              <EmptyState
                title="No tasks allocated"
                description="No tasks have been allocated to your team yet."
              />
            ) : (
              <div className="divide-y divide-gray-100">

                {teamOverviewTasks
                  .slice(0, 6)
                  .map((task) => {
                    const subtaskCount = task.subtasks?.length || 0;
                    const isExpanded = expandedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className="py-4 first:pt-0 last:pb-0 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                to={`/team-lead/tasks/${task.id}`}
                                className="font-medium text-gray-900 hover:text-blue-600 truncate transition-colors"
                              >
                                {task.title}
                              </Link>

                              {subtaskCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTaskId(
                                      isExpanded ? null : task.id
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                  title="Toggle subtasks view"
                                >
                                  <span>
                                    {subtaskCount} subtask{subtaskCount !== 1 ? 's' : ''}
                                  </span>
                                  <span>{isExpanded ? '▲' : '▼'}</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-gray-400 bg-gray-50 border border-gray-100">
                                  0 subtasks
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 mt-1">
                              {task.assigneeName ||
                                task.assignedTo?.fullName ||
                                task.assignedTo?.email ||
                                'Unassigned'}{' '}
                              · Due{' '}
                              {formatDate(task.dueDate || task.deadline)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              onClick={() =>
                                openSubtaskModal(task.id)
                              }
                            >
                              + Subtask
                            </Button>

                            <Badge
                              status={getBadgeStatus(
                                task.status
                              )}
                            >
                              {formatStatus(task.status)}
                            </Badge>
                          </div>
                        </div>

                        {/* Collapsible SubtaskList */}
                        {isExpanded && (
                          <div className="pl-4 border-l-2 border-blue-300 mt-2">
                            <SubtaskList
                              subtasks={task.subtasks || []}
                              readOnly={true}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

              </div>
            )}
          </div>
        </div>

        {/* Project pulse */}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              Project pulse
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Overall project health
            </p>
          </div>

          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {project.name || 'No project'}
                  </h3>
                  {projects.length > 1 && (
                    <select
                      value={project?.id || ''}
                      onChange={(e) => {
                        const sel = projects.find((p) => p.id === e.target.value);
                        if (sel) setProject(sel);
                      }}
                      className="text-xs border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  Overall progress
                </p>
              </div>

              <Badge
                status={getBadgeStatus(
                  project.status
                )}
              >
                {formatStatus(project.status)}
              </Badge>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Progress</span>

                <span className="font-semibold text-gray-900">
                  {project.progress || 0}%
                </span>
              </div>

              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        Number(project.progress) || 0
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {project.totalTasks || tasks.length}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Scope
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {inProgressCount}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Moving
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {doneCount}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Done
                </p>
              </div>

              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {blockedCount}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Risk
                </p>
              </div>

            </div>
          </div>
        </div>

      </section>

      {/* Review queue — tabbed */}

      <ReviewQueue
        activeTab={reviewTab}
        onTabChange={setReviewTab}
        tasks={reviewQueueTasks}
        subtasks={reviewQueueSubtasks}
        extensionRequests={extensionRequests}
        onBreakDown={openSubtaskModal}
        onApproveSubtask={handleApproveSubtask}
        onSendBackSubtask={openSendBack}
        onExtensionDecision={handleExtensionDecision}
      />

      {/* Escalation + Watch */}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Escalation form */}
        <EscalationForm 
          tasks={teamOverviewTasks}
          onSubmit={handleSendEscalation}
        />

        {/* Escalation watch */}

        <EscalationWatch escalations={regularEscalations} />

      </section>

      {/* Create subtask modal */}

      <DashboardSubtaskModal
        isOpen={isSubtaskModalOpen}
        onClose={closeSubtaskModal}
        onSave={handleSaveSubtask}
        saving={savingSubtask}
        error={subtaskError}
        parentTaskId={selectedParentTaskId}
        onParentTaskChange={setSelectedParentTaskId}
        parentLocked={isParentLocked}
        parentTasks={teamOverviewTasks}
        title={subtaskTitle}
        onTitleChange={setSubtaskTitle}
        assignee={subtaskAssignee}
        onAssigneeChange={setSubtaskAssignee}
        user={user}
        teamMembers={teamMembers}
        deadline={subtaskDeadline}
        onDeadlineChange={setSubtaskDeadline}
        parentDueDate={tasks.find((task) => String(task.id) === String(selectedParentTaskId))?.dueDate}
      />

      {/* Send back subtask modal */}

      <SendBackSubtaskModal
        subtask={sendBackSubtask}
        onClose={closeSendBack}
        onConfirm={handleRejectSubtask}
        sending={sendingBack}
        error={sendBackError}
        reason={sendBackReason}
        onReasonChange={setSendBackReason}
      />

      {/* Toast */}

      {toast.visible && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={closeToast}
        />
      )}

    </div>
  );
}
