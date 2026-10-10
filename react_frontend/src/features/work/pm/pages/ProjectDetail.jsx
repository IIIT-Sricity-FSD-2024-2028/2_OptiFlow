import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Button } from '../../../../shared/components/Button';
import { Modal } from '../../../../shared/components/Modal';
import { apiClient } from '../../../../services/api/client';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';

const STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];
const normalize = (response) => response?.data || response;

export default function PmProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [teamError, setTeamError] = useState('');
  const [violations, setViolations] = useState([]);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [complianceError, setComplianceError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedToId: '',
    priority: 'Medium',
    estimatedHours: '',
    dueDate: '',
  });

  useEffect(() => {
    let active = true;
    projectsApi.get(id)
      .then((response) => {
        if (active) setProject(normalize(response));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Failed to load project.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    usersApi.list()
      .then((response) => {
        if (active) setUsers(Array.isArray(response) ? response : response?.data || []);
      })
      .catch((loadError) => {
        if (active) setTeamError(loadError.message || 'Failed to load team members.');
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    apiClient('/compliance-violations')
      .then((response) => {
        if (active) setViolations(Array.isArray(response) ? response : []);
      })
      .catch((loadError) => {
        if (active) setComplianceError(loadError.message || 'Failed to load compliance information.');
      })
      .finally(() => {
        if (active) setComplianceLoading(false);
      });

    return () => { active = false; };
  }, [id]);

  const updateStatus = async (status) => {
    setSaving(true);
    setError('');
    try {
      const response = await projectsApi.update(id, { status });
      const updated = normalize(response);
      setProject((current) => ({ ...current, ...updated, status }));
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
    (violation.entityType === 'Project' && violation.entityId === project.id)
    || (violation.entityType === 'Task' && taskIds.includes(violation.entityId))
  ));
  const assignedUserIds = tasks.flatMap((task) => [
    task.assignedTo?.id,
    ...(task.subtasks || []).map((subtask) => subtask.assignedToId),
  ]).filter(Boolean);
  const isTeamLead = (user) => user?.roleAssignments?.some(({ role }) => (
    [role?.name, role?.label].some((name) => (
      String(name || '').toLowerCase().replace(/[^a-z]/g, '').includes('teamlead')
    ))
  ));
  const teamLeadIds = [...new Set(assignedUserIds.flatMap((userId) => {
    const assignedUser = users.find((user) => user.id === userId);
    const manager = users.find((user) => user.id === assignedUser?.managerUserId);
    if (isTeamLead(assignedUser)) return [assignedUser.id];
    return isTeamLead(manager) ? [manager.id] : [];
  }))];
  const members = users.filter((user) => (
    user.isActive !== false
    && teamLeadIds.includes(user.managerUserId)
    && assignedUserIds.includes(user.id)
  ));
  const taskAssignees = users.filter((user) => (
    teamLeadIds.includes(user.id) || teamLeadIds.includes(user.managerUserId)
  ));
  const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const createTask = async (event) => {
    event.preventDefault();
    setTaskError('');
    if (!taskForm.title.trim() || !taskForm.assignedToId) {
      setTaskError('Enter a task title and select a team member.');
      return;
    }

    setSavingTask(true);
    try {
      await tasksApi.create({
        ...taskForm,
        title: taskForm.title.trim(),
        projectId: project.id,
        estimatedHours: taskForm.estimatedHours ? Number(taskForm.estimatedHours) : undefined,
        dueDate: taskForm.dueDate || undefined,
        status: 'Active',
      });
      const response = await projectsApi.get(id);
      setProject(normalize(response));
      setTaskForm({ title: '', description: '', assignedToId: '', priority: 'Medium', estimatedHours: '', dueDate: '' });
      setCreateTaskOpen(false);
    } catch (saveError) {
      setTaskError(saveError.message || 'Failed to create task.');
    } finally {
      setSavingTask(false);
    }
  };

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
            <Link
              to={PATHS.COMPLIANCE.VIOLATIONS}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Compliance
            </Link>
            <Button
              type="button"
              onClick={() => setCreateTaskOpen(true)}
              className="rounded-lg"
            >
              + Create Task
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
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:h-[820px]">
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
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{task.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{task.subtasks?.length || 0} subtasks</div>
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
                    + (task.assignedTo?.id === member.id ? 1 : 0)
                    + (task.subtasks || []).filter((subtask) => subtask.assignedToId === member.id).length
                  ), 0);
                  return (
                    <div key={member.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                        {(member.fullName || member.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">{member.fullName || member.email}</div>
                        <div className="text-xs text-slate-500">Team member</div>
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
              <Link to={PATHS.COMPLIANCE.VIOLATIONS} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Full view →</Link>
            </div>
            {complianceError ? (
              <p className="p-4 text-sm text-rose-600">{complianceError}</p>
            ) : complianceLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading compliance...</p>
            ) : projectViolations.length === 0 ? (
              <div className="flex items-center gap-3 p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">✓</span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">No active violations</div>
                  <div className="text-xs text-slate-500">All checks passed</div>
                </div>
              </div>
            ) : (
              projectViolations.map((violation) => {
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

      <Modal
        isOpen={createTaskOpen}
        onClose={() => setCreateTaskOpen(false)}
        title="+ Create Task"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreateTaskOpen(false)} disabled={savingTask}>Cancel</Button>
            <Button onClick={createTask} disabled={savingTask}>{savingTask ? 'Creating…' : 'Add Task'}</Button>
          </>
        )}
      >
        <form onSubmit={createTask} className="space-y-4">
          {taskError && <p className="text-sm text-red-600" role="alert">{taskError}</p>}
          <FormField label="Task name" required>
            <Input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} disabled={savingTask} />
          </FormField>
          <FormField label="Description">
            <Textarea value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} disabled={savingTask} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Assign to" required>
              <Select value={taskForm.assignedToId} onChange={(event) => setTaskForm({ ...taskForm, assignedToId: event.target.value })} disabled={savingTask}>
                <option value="">Select member</option>
                {taskAssignees.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })} disabled={savingTask}>
                {['Low', 'Medium', 'High', 'Urgent'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </Select>
            </FormField>
            <FormField label="Estimated hours">
              <Input type="number" min="0" step="0.5" value={taskForm.estimatedHours} onChange={(event) => setTaskForm({ ...taskForm, estimatedHours: event.target.value })} disabled={savingTask} />
            </FormField>
            <FormField label="Deadline">
              <Input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} disabled={savingTask} />
            </FormField>
          </div>
        </form>
      </Modal>

      {selectedTask && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40"
            aria-label="Close task details"
            onClick={() => setSelectedTask(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Task Review</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">ID: T-{selectedTask.id.slice(0, 8)}</p>
              </div>
              <button type="button" onClick={() => setSelectedTask(null)} className="rounded-full bg-slate-200 px-2.5 py-1 text-lg text-slate-600" aria-label="Close">×</button>
            </header>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">{selectedTask.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedTask.description || 'No task description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</p>
                  <Badge>{(selectedTask.status || 'Draft').replace(/_/g, ' ')}</Badge>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Priority</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedTask.priority || 'Medium'}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Assigned to</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedTask.assignedTo?.fullName || selectedTask.assignedTo?.email || 'Unassigned'}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Deadline</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDate(selectedTask.dueDate)}</p>
                </div>
              </div>
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Checklist / Subtasks</h3>
                {selectedTask.subtasks?.length ? selectedTask.subtasks.map((subtask) => (
                  <div key={subtask.id} className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <span className={`text-sm ${subtask.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{subtask.title}</span>
                    <Badge>{(subtask.status || 'Draft').replace(/_/g, ' ')}</Badge>
                  </div>
                )) : <p className="text-sm text-slate-500">No subtasks found for this task.</p>}
              </section>
            </div>
            <footer className="flex justify-end border-t border-slate-200 p-4">
              <Button variant="secondary" onClick={() => setSelectedTask(null)}>Close</Button>
            </footer>
          </aside>
        </>
      )}
    </div>
  );
}
