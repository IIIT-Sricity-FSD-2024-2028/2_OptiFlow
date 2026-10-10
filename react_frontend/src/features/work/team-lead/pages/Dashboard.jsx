
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '../../../../shared/components/Button';
import { Badge } from '../../../../shared/components/Badge';
import { StatCard } from '../../../../shared/components/StatCard';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import {
  FormField,
  
  Input,
  Select,
} from '../../../../shared/components/FormField';
import { Modal } from '../../../../shared/components/Modal';
import { Toast } from '../../../../shared/components/Toast';
import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog';
import { EscalationForm } from '../../components/EscalationForm';
import { SubtaskList } from '../../components/SubtaskList';

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
  const [expandedTaskId, setExpandedTaskId] = useState(null);


  const [escTaskId, setEscTaskId] = useState('');
  const [escTitle, setEscTitle] = useState('');
  const [escType, setEscType] = useState('Access / permission');
  const [escPriority, setEscPriority] = useState('medium');


  const [isApproveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [isRejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);


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

        // Filter to only include users managed by the current Team Lead
        const myTeamMembers = normalizedMembers.filter(member => member.managerUserId === user.id);

        const normalizedProjects = Array.isArray(projectsResponse)
          ? projectsResponse
          : projectsResponse?.data || [];

        setTasks(normalizedTasks);
        setEscalations(normalizedEscalations);
        setTeamMembers(myTeamMembers);

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
  }, []);

  const teamOverviewTasks = tasks.filter(
    (task) => !task.isSubtask && !task.parentId && !task.taskId
  );

  const reviewQueueTasks = tasks.filter((task) =>
    ['In_Review', 'Pending_TL_Review'].includes(task.status)
  );

  const inProgressCount = teamOverviewTasks.filter((task) =>
    [
      'In_Progress',
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

  const getBadgeStatus = (status) => {
    if (!status) return 'default';

    const value = String(status).toLowerCase();

    if (
      value.includes('completed') ||
      value.includes('approved')
    ) {
      return 'success';
    }

    if (
      value.includes('progress') ||
      value.includes('review')
    ) {
      return 'info';
    }

    if (
      value.includes('pending') ||
      value.includes('blocked')
    ) {
      return 'warning';
    }

    if (
      value.includes('rejected') ||
      value.includes('failed')
    ) {
      return 'danger';
    }

    return 'default';
  };

  const formatStatus = (status) =>
    String(status || 'Unknown').replace(/_/g, ' ');

  const openApproveConfirm = (task) => {
    setSelectedTask(task);
    setApproveConfirmOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedTask) return;

    try {
      await tasksApi.update(selectedTask.id, {
        status: 'Completed',
      });

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                status: 'Completed',
              }
            : task
        )
      );

      showToast(
        'success',
        'Task approved successfully.'
      );
    } catch (error) {
      console.error('Approve task failed:', error);

      showToast(
        'error',
        'Failed to approve task.'
      );
    } finally {
      setApproveConfirmOpen(false);
      setSelectedTask(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Reject / request changes
  // ---------------------------------------------------------------------------

  const openRejectConfirm = (task) => {
    setSelectedTask(task);
    setRejectConfirmOpen(true);
  };

  const handleReject = async () => {
    if (!selectedTask) return;

    try {
      await tasksApi.update(selectedTask.id, {
        status: 'In_Progress',
      });

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                status: 'In_Progress',
              }
            : task
        )
      );

      showToast(
        'success',
        'Task sent back for changes.'
      );
    } catch (error) {
      console.error('Reject task failed:', error);

      showToast(
        'error',
        'Failed to reject task.'
      );
    } finally {
      setRejectConfirmOpen(false);
      setSelectedTask(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Subtask
  // ---------------------------------------------------------------------------

  const openSubtaskModal = (parentId = '') => {
    setSelectedParentTaskId(parentId);
    setIsParentLocked(!!parentId);
    setSubtaskModalOpen(true);
  };

  const closeSubtaskModal = () => {
    setSubtaskModalOpen(false);
    setSelectedParentTaskId('');
    setIsParentLocked(false);
    setSubtaskTitle('');
    setSubtaskAssignee('');
    setSubtaskDeadline('');
    setSavingSubtask(false);
  };

  const handleSaveSubtask = async () => {
    if (!selectedParentTaskId) {
      showToast(
        'error',
        'Please select a parent task.'
      );
      return;
    }

    if (!subtaskTitle.trim()) {
      showToast(
        'error',
        'Subtask title is required.'
      );
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
        assignedTo:
          assignedMember?.fullName ||
          assignedMember?.name ||
          subtaskAssignee,
        assignedToName:
          assignedMember?.fullName ||
          assignedMember?.name,
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

      showToast(
        'error',
        'Failed to create subtask.'
      );
    } finally {
      setSavingSubtask(false);
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
      status: 'Pending',
      createdAt: new Date().toISOString(),
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
            icon="👥"
          />

          <StatCard
            title="Team Workload"
            value={teamOverviewTasks.length}
            trend={`${inProgressCount} active`}
            icon="📋"
          />

          <StatCard
            title="Review Queue"
            value={reviewQueueTasks.length}
            trend={
              reviewQueueTasks.length
                ? 'Awaiting approval'
                : 'Clear'
            }
            icon="🔍"
          />

          <StatCard
            title="Blocked"
            value={blockedCount}
            trend={
              blockedCount > 0
                ? 'Needs attention'
                : 'None'
            }
            icon="🚨"
          />

          <StatCard
            title="Escalations"
            value={escalations.length}
            trend="Filed blockers"
            icon="⚠️"
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
                                task.assignee?.fullName ||
                                task.assignee ||
                                'Unassigned'}{' '}
                              · Due{' '}
                              {task.dueDate ||
                                task.deadline ||
                                '—'}
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

            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {project.name || 'No project'}
                </h3>

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

      {/* Review queue */}

      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            Review queue
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Pending TL Review or In Review — approve or send back
          </p>
        </div>

        <div className="p-5">

          {reviewQueueTasks.length === 0 ? (
            <EmptyState
              title="Review queue is clear"
              description="Nothing is waiting for your approval right now."
            />
          ) : (
            <div className="divide-y divide-gray-100">

              {reviewQueueTasks.map((task) => (
                <div
                  key={task.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >

                  <div>
                    <p className="font-medium text-gray-900">
                      {task.title}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      By{' '}
                      {task.assigneeName ||
                        task.assignee ||
                        'Unknown'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">

                    <Badge
                      status={getBadgeStatus(
                        task.status
                      )}
                    >
                      {formatStatus(task.status)}
                    </Badge>

                    <Button
                      variant="primary"
                      onClick={() =>
                        openApproveConfirm(task)
                      }
                    >
                      Approve
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() =>
                        openRejectConfirm(task)
                      }
                    >
                      Reject
                    </Button>

                    {!task.isSubtask &&
                      !task.parentId && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            openSubtaskModal(task.id)
                          }
                        >
                          Break down
                        </Button>
                      )}

                  </div>
                </div>
              ))}

            </div>
          )}

        </div>
      </section>

      {/* Escalation + Watch */}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Escalation form */}
        <EscalationForm 
          tasks={teamOverviewTasks}
          onSubmit={handleSendEscalation}
        />

        {/* Escalation watch */}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              Team escalation watch
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Blockers filed by your team
            </p>
          </div>

          <div className="p-5 max-h-[380px] overflow-y-auto">

            {escalations.length === 0 ? (
              <EmptyState
                title="No escalations"
                description="When blockers are reported, they will appear here."
              />
            ) : (
              <div className="divide-y divide-gray-100">

                {escalations.map((escalation) => (
                  <div
                    key={escalation.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                  >

                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {escalation.title}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {escalation.createdAt
                          ? new Date(
                              escalation.createdAt
                            ).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                              }
                            )
                          : '—'}{' '}
                        ·{' '}
                        {escalation.blockerType || '—'}
                      </p>
                    </div>

                    <Badge
                      status={
                        escalation.status === 'Resolved'
                          ? 'success'
                          : getBadgeStatus(
                              escalation.status
                            )
                      }
                    >
                      {escalation.status || 'Pending'}
                    </Badge>

                  </div>
                ))}

              </div>
            )}

          </div>
        </div>

      </section>

      {/* Create subtask modal */}

      <Modal
        isOpen={isSubtaskModalOpen}
        onClose={closeSubtaskModal}
        title="Create subtask"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={closeSubtaskModal}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleSaveSubtask}
              disabled={savingSubtask}
            >
              {savingSubtask ? 'Saving…' : 'Save & assign'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">

          <p className="text-sm text-gray-500">
            {selectedParentTaskId
              ? `Breaking down task #${selectedParentTaskId}`
              : 'Pick the parent task this subtask rolls up under.'}
          </p>

          <FormField
            label="Parent task"
            required
          >
            <Select
              value={selectedParentTaskId}
              onChange={(event) =>
                setSelectedParentTaskId(
                  event.target.value
                )
              }
              disabled={isParentLocked}
              options={[
                {
                  value: '',
                  label: 'Select parent task…',
                },
                ...teamOverviewTasks.map(
                  (task) => ({
                    value: task.id,
                    label: task.title,
                  })
                ),
              ]}
            />
          </FormField>

          <FormField
            label="Subtask title"
            required
          >
            <Input
              value={subtaskTitle}
              onChange={(event) =>
                setSubtaskTitle(
                  event.target.value
                )
              }
              placeholder="What should be done?"
            />
          </FormField>

          <FormField label="Assign to">
            <Select
              value={subtaskAssignee}
              onChange={(event) =>
                setSubtaskAssignee(
                  event.target.value
                )
              }
              options={[
                {
                  value: '',
                  label: 'Select team member…',
                },
                ...teamMembers.map(
                  (member) => ({
                    value: member.id,
                    label:
                      member.fullName ||
                      member.name ||
                      member.email ||
                      `Member ${member.id}`,
                  })
                ),
              ]}
            />
          </FormField>

          <FormField label="Deadline">
            <Input
              type="date"
              value={subtaskDeadline}
              onChange={(event) =>
                setSubtaskDeadline(
                  event.target.value
                )
              }
            />
          </FormField>

        </div>
      </Modal>

      {/* Approve confirmation */}

      <ConfirmDialog
        isOpen={isApproveConfirmOpen}
        title="Approve Task"
        message={
          selectedTask
            ? `Are you sure you want to approve "${selectedTask.title}"?`
            : 'Are you sure you want to approve this task?'
        }
        confirmText="Yes, Approve"
        onConfirm={handleApprove}
        onCancel={() => {
          setApproveConfirmOpen(false);
          setSelectedTask(null);
        }}
      />

      {/* Reject confirmation */}

      <ConfirmDialog
        isOpen={isRejectConfirmOpen}
        title="Request Changes"
        message={
          selectedTask
            ? `Send "${selectedTask.title}" back to In Progress?`
            : 'Are you sure you want to request changes?'
        }
        confirmText="Yes, Request Changes"
        onConfirm={handleReject}
        onCancel={() => {
          setRejectConfirmOpen(false);
          setSelectedTask(null);
        }}
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
