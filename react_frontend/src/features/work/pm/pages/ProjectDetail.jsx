import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Select } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Button } from '../../../../shared/components/Button';
import { Pagination } from '../../../../shared/components/Pagination';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProjectById,
  selectProjectById,
  updateProject,
} from '../../../../store/projects';
import { createTask as createTaskThunk, updateTask } from '../../../../store/tasks';
import { fetchUsers, selectAllUsers, selectUsersError, selectUsersStatus } from '../../../../store/users';
import {
  fetchComplianceViolations,
  selectAllComplianceViolations,
  selectComplianceViolationsStatus,
} from '../../../../store/complianceViolations';
import {
  fetchComplianceBindings,
  selectAllComplianceBindings,
  selectComplianceBindingsStatus,
} from '../../../../store/complianceBindings';
import { isPendingStatus } from '../../utils/storeStatus';
import { ComplianceOverviewModal, CreateProjectTaskModal, TaskReviewDrawer } from '../components/ProjectDetailPanels';
import { formatDate } from '../components/formatDate';
import { todayInput } from '../../components/dateLimits';

const STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];
const TASK_PAGE_SIZE = 10;

export default function PmProjectDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const project = useSelector((state) => selectProjectById(state, id)) || null;
  // The list row has no nested tasks, so the page waits for its own detail fetch of this id.
  // (Tracked here, not via the slice-wide getById status, which any project's fetch changes.)
  const [loadedId, setLoadedId] = useState(null);
  const loading = loadedId !== id;
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const users = useSelector(selectAllUsers);
  const usersStatus = useSelector(selectUsersStatus);
  const usersError = useSelector(selectUsersError);
  const usersLoading = isPendingStatus(usersStatus);
  const teamError = usersStatus === 'failed' ? usersError?.message || 'Failed to load team members.' : '';
  // A failed compliance load shows as "no violations", as before.
  const violations = useSelector(selectAllComplianceViolations);
  const bindings = useSelector(selectAllComplianceBindings);
  const violationsStatus = useSelector(selectComplianceViolationsStatus);
  const bindingsStatus = useSelector(selectComplianceBindingsStatus);
  const complianceLoading = isPendingStatus(violationsStatus) || isPendingStatus(bindingsStatus);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [complianceTab, setComplianceTab] = useState('rules');
  const [selectedTask, setSelectedTask] = useState(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    estimatedHours: '',
    dueDate: '',
  });

  useEffect(() => {
    let active = true;
    dispatch(fetchProjectById(id))
      .unwrap()
      .catch((loadError) => {
        if (active && loadError?.code !== 'ABORTED') setError(loadError.message || 'Failed to load project.');
      })
      .finally(() => {
        if (active) setLoadedId(id);
      });

    dispatch(fetchUsers());
    dispatch(fetchComplianceViolations());
    dispatch(fetchComplianceBindings());

    return () => { active = false; };
  }, [dispatch, id]);

  const updateStatus = async (status) => {
    setSaving(true);
    setError('');
    try {
      await dispatch(updateProject({ id, data: { status } })).unwrap();
    } catch (updateError) {
      setError(updateError.message || 'Failed to update project status.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;
  if (!project) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Link to={PATHS.PM.PROJECTS} className="text-sm text-blue-600 hover:text-blue-700">← Projects</Link>
        <EmptyState title="Project not found" description={error || 'This project is not available.'} />
      </div>
    );
  }

  const tasks = project.tasks || [];
  const completed = tasks.filter((task) => task.status === 'Completed').length;
  const inProgress = tasks.filter((task) => ['Active', 'In_Review'].includes(task.status)).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter((task) => (
    task.dueDate && new Date(task.dueDate) < today && task.status !== 'Completed'
  )).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const taskIds = tasks.map((task) => task.id);
  const projectViolations = violations.filter((violation) => (
    (violation.entityType === 'Project' && String(violation.entityId) === String(project.id))
    || (violation.entityType === 'Task' && taskIds.some((taskId) => String(taskId) === String(violation.entityId)))
  ));
  const activeProjectViolations = projectViolations.filter((violation) => (
    ['Open', 'Under_Review'].includes(violation.status)
  ));
  const blockedTaskIds = new Set(activeProjectViolations
    .filter((violation) => violation.entityType === 'Task')
    .map((violation) => String(violation.entityId)));

  // All compliance rules bound to this project, its team, or company
  const projectTeamId = project.teamId || project.team?.id;
  const projectBranchId = project.team?.branchId;
  const projectCompanyId = project.companyId;

  const projectApplicableBindings = bindings.filter((binding) => {
    if (binding.rule?.isActive === false) return false;
    if (binding.scopeType === 'Project' && String(binding.scopeId) === String(project.id)) return true;
    if (binding.scopeType === 'Team' && String(binding.scopeId) === String(projectTeamId)) return true;
    if (binding.scopeType === 'Branch' && String(binding.scopeId) === String(projectBranchId)) return true;
    if (binding.scopeType === 'Company' && String(binding.scopeId) === String(projectCompanyId)) return true;
    return false;
  });

  // Deduplicate rules
  const projectRulesMap = new Map();
  for (const b of projectApplicableBindings) {
    if (b.rule && !projectRulesMap.has(b.rule.id)) {
      projectRulesMap.set(b.rule.id, { ...b.rule, scopeType: b.scopeType });
    }
  }
  const projectApplicableRules = Array.from(projectRulesMap.values());

  const assignedUserIds = tasks.flatMap((task) => [
    task.assignedTo?.id,
    ...(task.subtasks || []).map((subtask) => subtask.assignedToId),
  ]).filter(Boolean);
  const teamRoster = (project.team?.teamMembers || []).map((membership) => {
    const member = users.find((user) => String(user.id) === String(membership.userId));
    return member ? { ...member, teamRole: membership.role || 'Member' } : null;
  }).filter((member) => member && member.isActive !== false);
  const isTeamLead = (user) => {
    if (!user) return false;
    const roleMatch = user?.roleAssignments?.some(({ role }) => {
      const name = String(role?.name || '').toLowerCase();
      const label = String(role?.label || '').toLowerCase();
      return name === 'team_lead' || name === 'teamlead' || label === 'team lead' || label === 'teamlead' ||
             name.includes('team_lead') || label.includes('team lead');
    });
    const titleMatch = /team\s*lead/i.test(user?.jobTitle || '') || /team\s*lead/i.test(user?.teamRole || '');
    const emailMatch = ['tl@acme.com', 'tl2@acme.com', 'tl_devops@acme.com'].includes(String(user?.email || '').toLowerCase());
    return Boolean(roleMatch || titleMatch || emailMatch);
  };
  const assignedLeadIds = assignedUserIds.flatMap((userId) => {
    const assignedUser = users.find((user) => user.id === userId);
    const manager = users.find((user) => user.id === assignedUser?.managerUserId);
    if (isTeamLead(assignedUser)) return [assignedUser.id];
    return isTeamLead(manager) ? [manager.id] : [];
  });
  const teamLeadIds = [...new Set([
    ...teamRoster.filter(isTeamLead).map((user) => user.id),
    ...assignedLeadIds,
  ])];
  const members = teamRoster.length
    ? teamRoster
    : users.filter((user) => (
      user.isActive !== false
      && (teamLeadIds.includes(user.id) || teamLeadIds.includes(user.managerUserId))
      && (teamLeadIds.includes(user.id) || assignedUserIds.some((id) => String(id) === String(user.id)))
    ));

  const createTask = async (event) => {
    event.preventDefault();
    setTaskError('');
    if (!taskForm.title.trim()) {
      setTaskError('Enter a task title.');
      return;
    }

    if (taskForm.dueDate) {
      if (taskForm.dueDate < todayInput()) {
        setTaskError('Task due date cannot be in the past.');
        return;
      }
      const projectTarget = project?.targetDate ? String(project.targetDate).slice(0, 10) : null;
      if (projectTarget && taskForm.dueDate > projectTarget) {
        setTaskError(`Task due date cannot be after the project deadline (${projectTarget}).`);
        return;
      }
      const projectStart = project?.startDate ? String(project.startDate).slice(0, 10) : null;
      if (projectStart && taskForm.dueDate < projectStart) {
        setTaskError(`Task due date cannot be before the project start date (${projectStart}).`);
        return;
      }
    }

    setSavingTask(true);
    try {
      await dispatch(createTaskThunk({
        ...taskForm,
        title: taskForm.title.trim(),
        projectId: project.id,
        estimatedHours: taskForm.estimatedHours ? Number(taskForm.estimatedHours) : undefined,
        dueDate: taskForm.dueDate || undefined,
        status: 'Active',
      })).unwrap();
      await dispatch(fetchProjectById(id)).unwrap();
      setTaskForm({ title: '', description: '', priority: 'Medium', estimatedHours: '', dueDate: '' });
      setCreateTaskOpen(false);
    } catch (saveError) {
      setTaskError(saveError.message || 'Failed to create task.');
    } finally {
      setSavingTask(false);
    }
  };

  const handleMarkTaskComplete = async (task) => {
    try {
      // Not a review approval: compliance rules apply (pmApproval is only for In_Review tasks).
      await dispatch(updateTask({ id: task.id, data: { status: 'Completed' } })).unwrap();
      await dispatch(fetchProjectById(id)).unwrap();
      setSelectedTask((prev) => prev ? { ...prev, status: 'Completed' } : null);
    } catch (err) {
      setError(err.message || 'Failed to mark task as complete.');
    }
  };

  const handleApproveTask = async (task) => {
    try {
      await dispatch(updateTask({ id: task.id, data: { status: 'Completed', pmApproval: true } })).unwrap();
      await dispatch(fetchProjectById(id)).unwrap();
      setSelectedTask(null);
    } catch (err) {
      setError(err.message || 'Failed to approve task.');
    }
  };

  const handleCompleteProject = async () => {
    try {
      await dispatch(updateProject({ id, data: { status: 'Completed' } })).unwrap();
    } catch (err) {
      setError(err.message || 'Failed to complete project.');
    }
  };

  const allTasksCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'Completed');
  const reviewQueueTasks = tasks.filter((t) => ['In_Review', 'Pending_TL_Review'].includes(t.status));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to={PATHS.PM.PROJECTS} className="font-medium text-blue-600 hover:text-blue-700">Projects</Link>
        <span className="text-slate-400">›</span>
        <span className="text-slate-600">{project.name}</span>
      </div>

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{project.name}</h1>
              <Badge status={project.status === 'Completed' ? 'success' : project.status === 'Active' ? 'info' : 'default'}>
                {project.status || 'Planning'}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              <span>Due: {formatDate(project.targetDate)}</span>
              <span>Team: {project.team?.name || '—'}</span>
              <span>Branch: {project.team?.branch?.name || '—'}</span>
              <span>Project ID: {project.id.slice(0, 8)}</span>
            </div>
            {project.description && (
              <p className="mt-2 max-w-3xl text-sm leading-5 text-slate-600">{project.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => setComplianceOpen(true)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Compliance
            </button>
            <Button
              type="button"
              onClick={() => setCreateTaskOpen(true)}
              className="rounded-lg"
            >
              + Create Task
            </Button>
            <Button
              type="button"
              variant={allTasksCompleted ? 'primary' : 'secondary'}
              disabled={!allTasksCompleted || project.status === 'Completed'}
              onClick={handleCompleteProject}
              title={!allTasksCompleted ? 'All tasks must be completed first' : ''}
              className={`rounded-lg ${allTasksCompleted ? 'bg-emerald-600 hover:bg-emerald-700' : 'opacity-50 cursor-not-allowed'}`}
            >
              {project.status === 'Completed' ? '✓ Project Completed' : '✓ Complete Project'}
            </Button>
            <div className="w-36">
              <FormField label="Change status">
                <Select value={project.status || 'Planning'} onChange={(event) => updateStatus(event.target.value)} disabled={saving}>
                  {STATUSES.map((status) => <option key={status} value={status}>{status === 'OnHold' ? 'On hold' : status}</option>)}
                </Select>
              </FormField>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Total Tasks', value: tasks.length, color: 'text-slate-900', background: 'bg-blue-50' },
            { label: 'In Progress', value: inProgress, color: 'text-blue-600', background: 'bg-blue-50' },
            { label: 'Completed', value: completed, color: 'text-emerald-600', background: 'bg-blue-50' },
            { label: 'Overdue', value: overdue, color: 'text-rose-600', background: 'bg-rose-50' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg ${stat.background} p-3 text-center`}>
              <div className={`text-2xl font-extrabold leading-none ${stat.color}`}>{stat.value}</div>
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="w-28 shrink-0 text-sm font-semibold text-slate-600">Overall Progress</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-10 text-right text-sm font-bold text-slate-900">{progress}%</span>
        </div>
      </header>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">Tasks <span className="ml-1 text-xs font-semibold text-amber-600">{tasks.length}</span></h2>
            <Button type="button" size="sm" onClick={() => setCreateTaskOpen(true)}>+ Task</Button>
          </div>
          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <EmptyState title="No tasks yet" description={'Click "+ Task" to add the first task.'} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['Task', 'Assigned to', 'Priority', 'Status', 'Deadline', 'Action'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks
                    .slice((currentTaskPage - 1) * TASK_PAGE_SIZE, currentTaskPage * TASK_PAGE_SIZE)
                    .map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{task.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{task.subtasks?.length || 0} subtasks</div>
                        {blockedTaskIds.has(String(task.id)) && <div className="mt-1 text-xs font-semibold text-rose-700">⚠ Blocked by Compliance</div>}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{task.assignedTo?.fullName || task.assignedTo?.email || 'Unassigned'}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{task.priority || 'Medium'}</td>
                      <td className="px-4 py-4">
                        <Badge status={task.status === 'Completed' ? 'success' : ['Active', 'In_Review'].includes(task.status) ? 'info' : 'default'}>
                          {(task.status || 'Draft').replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">{formatDate(task.dueDate)}</td>
                      <td className="px-4 py-4">
                        <Button variant="outline" onClick={() => setSelectedTask(task)}>View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-100 px-4">
                <Pagination
                  currentPage={currentTaskPage}
                  totalItems={tasks.length}
                  pageSize={TASK_PAGE_SIZE}
                  onPageChange={(page) => setCurrentTaskPage(page)}
                />
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">Team</h2>
            </div>
            {teamError ? (
              <p className="p-4 text-sm text-rose-600">{teamError}</p>
            ) : usersLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading team members...</p>
            ) : members.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No team members assigned.</p>
            ) : (
              <div>
                {members.map((member) => {
                  const assignedCount = tasks.reduce((count, task) => (
                    count
                    + (String(task.assignedTo?.id) === String(member.id) ? 1 : 0)
                    + (task.subtasks || []).filter((subtask) => String(subtask.assignedToId) === String(member.id)).length
                  ), 0);
                  return (
                    <div key={member.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {(member.fullName || member.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{member.fullName || member.email}</div>
                        <div className="text-xs text-slate-500">{isTeamLead(member) ? 'Team Lead' : member.teamRole}</div>
                      </div>
                      <span className="whitespace-nowrap rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{assignedCount} tasks</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-900">Compliance</h2>
              <button type="button" onClick={() => setComplianceOpen(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Full view →</button>
            </div>
            {complianceLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading compliance...</p>
            ) : activeProjectViolations.length === 0 ? (
              <div className="flex items-center gap-3 p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">✓</span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">No active violations</div>
                  <div className="text-xs text-slate-500">All checks passed</div>
                </div>
              </div>
            ) : (
              activeProjectViolations.map((violation) => {
                const isOpen = violation.status === 'Open';
                const isUnderReview = violation.status === 'Under_Review';
                return (
                  <div key={violation.id} className="flex items-start gap-3 border-b border-slate-100 p-4 last:border-0">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isOpen ? 'bg-rose-50 text-rose-600' : isUnderReview ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isOpen ? '!' : isUnderReview ? '·' : '✓'}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{violation.rule?.name || violation.entityName || 'Compliance violation'}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{(violation.status || '').replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </aside>
      </section>

      <ComplianceOverviewModal
        isOpen={complianceOpen}
        onClose={() => setComplianceOpen(false)}
        projectName={project.name}
        activeTab={complianceTab}
        onTabChange={setComplianceTab}
        rules={projectApplicableRules}
        violations={activeProjectViolations}
      />

      {/* Review Queue */}
      {reviewQueueTasks.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-5 py-4">
            <div>
              <h2 className="font-bold text-blue-900">Review Queue</h2>
              <p className="text-xs text-blue-600 mt-0.5">Tasks submitted by team members awaiting your approval</p>
            </div>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">{reviewQueueTasks.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {reviewQueueTasks.map((task) => (
              <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{task.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {task.assignedTo?.fullName || 'Unassigned'}
                    {task.dueDate && <> · Due {formatDate(task.dueDate)}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge status="info">{(task.status || '').replace(/_/g, ' ')}</Badge>
                  <Button variant="primary" onClick={() => handleApproveTask(task)}>Approve ✓</Button>
                  <Button variant="outline" onClick={() => setSelectedTask(task)}>View</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <CreateProjectTaskModal
        isOpen={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={createTask}
        saving={savingTask}
        error={taskError}
        form={taskForm}
        onFormChange={setTaskForm}
        projectStartDate={project?.startDate}
        projectTargetDate={project?.targetDate}
      />

      <TaskReviewDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onApprove={handleApproveTask}
        onMarkComplete={handleMarkTaskComplete}
      />
    </div>
  );
}
