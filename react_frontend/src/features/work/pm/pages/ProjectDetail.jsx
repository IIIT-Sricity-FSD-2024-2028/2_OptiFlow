import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Button } from '../../../../shared/components/Button';
import { Modal } from '../../../../shared/components/Modal';
import { Pagination } from '../../../../shared/components/Pagination';
import { Toast } from '../../../../shared/components/Toast';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';
import * as complianceApi from '../../../../services/api/compliance';

const STATUSES = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];
const normalize = (response) => response?.data || response;
const TASK_PAGE_SIZE = 10;

export default function PmProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [teamError, setTeamError] = useState('');
  const [violations, setViolations] = useState([]);
  const [bindings, setBindings] = useState([]);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [complianceError, setComplianceError] = useState('');
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [complianceTab, setComplianceTab] = useState('rules');
  const [selectedTask, setSelectedTask] = useState(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [approvingTask, setApprovingTask] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    estimatedHours: '',
    dueDate: '',
  });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4000);
  };

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

    Promise.all([
      complianceApi.getViolations().catch(() => []),
      complianceApi.getBindings().catch(() => []),
    ])
      .then(([violationsRes, bindingsRes]) => {
        if (active) {
          setViolations(Array.isArray(violationsRes) ? violationsRes : violationsRes?.data || []);
          setBindings(Array.isArray(bindingsRes) ? bindingsRes : bindingsRes?.data || []);
        }
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
  const formatDate = (date) => date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const createTask = async (event) => {
    event.preventDefault();
    setTaskError('');
    if (!taskForm.title.trim()) {
      setTaskError('Enter a task title.');
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
      setTaskForm({ title: '', description: '', priority: 'Medium', estimatedHours: '', dueDate: '' });
      setCreateTaskOpen(false);
    } catch (saveError) {
      setTaskError(saveError.message || 'Failed to create task.');
    } finally {
      setSavingTask(false);
    }
  };

  const handleMarkTaskComplete = async (task) => {
    setApprovingTask(true);
    try {
      await tasksApi.update(task.id, { status: 'Completed', pmApproval: true });
      const response = await projectsApi.get(id);
      setProject(normalize(response));
      setSelectedTask((prev) => prev ? { ...prev, status: 'Completed' } : null);
      showToast('success', `"${task.title}" marked as complete.`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('COMPLIANCE_BLOCK') || msg.toLowerCase().includes('compliance')) {
        showToast('error', 'Blocked by compliance: ensure all required evidence is approved before completing this task.');
      } else {
        showToast('error', msg || 'Failed to mark task as complete.');
      }
    } finally {
      setApprovingTask(false);
    }
  };

  const handleApproveTask = async (task) => {
    setApprovingTask(true);
    try {
      await tasksApi.update(task.id, { status: 'Completed', pmApproval: true });
      const response = await projectsApi.get(id);
      setProject(normalize(response));
      setSelectedTask(null);
      showToast('success', `"${task.title}" approved and marked complete.`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('COMPLIANCE_BLOCK') || msg.toLowerCase().includes('compliance')) {
        showToast('error', 'Blocked by compliance: ensure all required evidence is approved before approving this task.');
      } else {
        showToast('error', msg || 'Failed to approve task.');
      }
    } finally {
      setApprovingTask(false);
    }
  };

  const handleCompleteProject = async () => {
    try {
      await projectsApi.update(id, { status: 'Completed' });
      setProject((prev) => ({ ...prev, status: 'Completed' }));
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
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="whitespace-nowrap text-sm font-bold text-slate-900">{completed}/{tasks.length} tasks ({progress}%)</span>
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
            {complianceError ? (
              <p className="p-4 text-sm text-rose-600">{complianceError}</p>
            ) : complianceLoading ? (
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

      <Modal
        isOpen={complianceOpen}
        onClose={() => setComplianceOpen(false)}
        title={`Compliance Overview — ${project.name}`}
      >
        <div className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setComplianceTab('rules')}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
                complianceTab === 'rules'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Bound Rules ({projectApplicableRules.length})
            </button>
            <button
              type="button"
              onClick={() => setComplianceTab('violations')}
              className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
                complianceTab === 'violations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Active Violations ({activeProjectViolations.length})
            </button>
          </div>

          {/* Tab 1: Bound Rules */}
          {complianceTab === 'rules' && (
            <div className="space-y-3">
              {projectApplicableRules.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  No active compliance rules are bound to this project or its team hierarchy.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {projectApplicableRules.map((rule) => {
                    const req = rule.criteria?.requirement;
                    const trigger = rule.criteria?.trigger;
                    return (
                      <div key={rule.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{rule.name}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge status={rule.scopeType === 'Company' ? 'default' : 'info'}>
                              {rule.scopeType || 'Project'} Scope
                            </Badge>
                            <Badge status={rule.severity === 'Critical' || rule.severity === 'High' ? 'danger' : 'warning'}>
                              {rule.severity || 'Medium'}
                            </Badge>
                          </div>
                        </div>
                        {rule.description && (
                          <p className="text-xs text-slate-600">{rule.description}</p>
                        )}
                        {req && (
                          <div className="mt-1 rounded bg-slate-50 p-2 text-xs text-slate-700">
                            <span className="font-semibold text-slate-900">Enforcement: </span>
                            {req.type === 'EVIDENCE_REQUIRED' && trigger
                              ? `Requires approved evidence before transition to "${trigger.transitionTo || 'Completed'}"`
                              : rule.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Active Violations */}
          {complianceTab === 'violations' && (
            <div>
              {activeProjectViolations.length === 0 ? (
                <p className="text-sm text-slate-600 py-4 text-center">
                  This project has no active compliance violations. All rules are satisfied.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {activeProjectViolations.map((violation) => (
                    <div key={violation.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-900">{violation.rule?.name || 'Compliance violation'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {violation.entityType === 'Task' ? violation.entityName || 'Task' : project.name}
                          {' · '}{String(violation.status).replace(/_/g, ' ')}
                        </p>
                      </div>
                      {violation.entityType === 'Task' && (
                        <Link
                          to={PATHS.PM.TASK_DETAIL.replace(':id', violation.entityId)}
                          className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700"
                          onClick={() => setComplianceOpen(false)}
                        >
                          View task →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

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
                  <Button variant="primary" onClick={() => handleApproveTask(task)} disabled={approvingTask}>Approve ✓</Button>
                  <Button variant="outline" onClick={() => setSelectedTask(task)}>View</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
              This task will be assigned to the project Team Lead automatically.
            </div>
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
                  <Badge status={selectedTask.status === 'Completed' ? 'success' : selectedTask.status === 'In_Review' ? 'info' : 'default'}>{(selectedTask.status || 'Draft').replace(/_/g, ' ')}</Badge>
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
            <footer className="flex justify-between border-t border-slate-200 p-4 gap-2">
              {selectedTask.status !== 'Completed' && (
                <>
                  {selectedTask.status === 'In_Review' || selectedTask.status === 'Pending_TL_Review' ? (
                    <Button
                      variant="primary"
                      onClick={() => handleApproveTask(selectedTask)}
                      className="flex-1"
                      disabled={approvingTask}
                    >
                      {approvingTask ? 'Approving…' : '✓ Approve & Mark Complete'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => handleMarkTaskComplete(selectedTask)}
                      className="flex-1"
                      disabled={approvingTask}
                    >
                      {approvingTask ? 'Saving…' : 'Mark as Complete'}
                    </Button>
                  )}
                </>
              )}
              {selectedTask.status === 'Completed' && (
                <span className="flex-1 text-center text-sm font-semibold text-emerald-600">✓ Task Completed</span>
              )}
              <Button variant="secondary" onClick={() => setSelectedTask(null)}>Close</Button>
            </footer>
          </aside>
        </>
      )}

      <Toast
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}
