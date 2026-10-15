import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATHS } from '../../../app/paths';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Loader } from '../../../shared/components/Loader';
import { Pagination } from '../../../shared/components/Pagination';
import * as projectsApi from '../../../services/api/projects';
import * as usersApi from '../../../services/api/users';
import * as tasksApi from '../../../services/api/tasks';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  GitBranch,
  ChevronRight,
  User,
  ListTodo,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

const normalize = (r) => r?.data || r;
const TASK_PAGE_SIZE = 10;

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const taskStatusVariant = (status) => {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s.includes('complet')) return 'success';
  if (s.includes('review')) return 'warning';
  if (s.includes('active') || s.includes('progress')) return 'info';
  if (s.includes('cancel')) return 'danger';
  return 'default';
};

const priorityVariant = (p) => {
  if (!p) return 'default';
  if (p === 'Critical' || p === 'High') return 'danger';
  if (p === 'Medium') return 'warning';
  return 'default';
};

function Avatar({ name, size = 'sm' }) {
  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const sizeCls = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  return (
    <div
      className={`${sizeCls} rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0`}
    >
      {initials}
    </div>
  );
}

export default function ExecutiveProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      projectsApi.get(id),
      usersApi.list(),
      tasksApi.list().catch(() => []),
    ])
      .then(([projectRes, usersRes, tasksRes]) => {
        if (!active) return;
        const proj = normalize(projectRes);
        setProject(proj);
        setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data || []);
        // Fetch ALL tasks and filter to this project so the progress bar
        // reflects every task, not just those visible under the executive's role scope.
        const fetchedTasks = Array.isArray(tasksRes) ? tasksRes : tasksRes?.data || [];
        const projectTasks = fetchedTasks.filter(
          (t) => String(t.projectId || t.project?.id || '') === String(id)
        );
        // Fall back to the tasks embedded in the project response if needed.
        setAllTasks(projectTasks.length > 0 ? projectTasks : (proj?.tasks || []));
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load project.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  if (loading)
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <Loader />
      </div>
    );

  if (!project)
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Link to={PATHS.EXECUTIVE.PROJECTS} className="text-sm text-blue-600 hover:text-blue-700">
          ← Projects
        </Link>
        <EmptyState title="Project not found" description={error || 'This project is not available.'} />
      </div>
    );

  // Use separately-fetched allTasks for accurate progress (not project.tasks which may be role-scoped).
  const tasks = allTasks;
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => ['Active', 'In_Review'].includes(t.status)).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < today && t.status !== 'Completed'
  ).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  // Paginated tasks
  const paginatedTasks = tasks.slice(
    (currentTaskPage - 1) * TASK_PAGE_SIZE,
    currentTaskPage * TASK_PAGE_SIZE
  );

  // Team members working on this project
  const assignedUserIds = new Set(
    tasks.flatMap((t) => [
      t.assignedToId,
      t.assignedTo?.id,
      ...(t.subtasks || []).map((s) => s.assignedToId),
    ]).filter(Boolean).map(String)
  );

  const teamMembersFromRoster = (project.team?.teamMembers || [])
    .map((m) => {
      const u = users.find((u) => String(u.id) === String(m.userId));
      return u ? { ...u, teamRole: m.role || 'Member' } : null;
    })
    .filter(Boolean);

  const contributors = teamMembersFromRoster.length
    ? teamMembersFromRoster
    : users.filter((u) => assignedUserIds.has(String(u.id)));

  // Build task-to-assignee lookup
  const userById = Object.fromEntries(users.map((u) => [String(u.id), u]));
  const getAssignee = (task) => {
    const uid = task.assignedToId || task.assignedTo?.id;
    return uid ? (userById[String(uid)] || task.assignedTo) : null;
  };

  const statusVariant =
    project.status === 'Completed'
      ? 'success'
      : project.status === 'Active'
      ? 'info'
      : project.status === 'OnHold' || project.status === 'On_Hold'
      ? 'danger'
      : 'default';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to={PATHS.EXECUTIVE.PROJECTS} className="font-medium text-blue-600 hover:text-blue-700">
          Projects
        </Link>
        <span className="text-slate-400">›</span>
        <span className="text-slate-600">{project.name}</span>
      </div>

      {/* Project Header */}
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{project.name}</h1>
              <Badge status={statusVariant}>
                {project.status === 'OnHold' || project.status === 'On_Hold'
                  ? 'On Hold'
                  : project.status || 'Planning'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-medium text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100/80">
                <UserCheck size={13} className="text-blue-600" />
                PM: {project.projectManager?.fullName || 'Not Assigned'}
              </span>
              <span className="flex items-center gap-1">
                <Users size={13} className="text-slate-400" />
                Team: {project.team?.name || '—'}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch size={13} className="text-slate-400" />
                Branch: {project.team?.branch?.name || '—'}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays size={13} className="text-slate-400" />
                Due: {formatDate(project.targetDate)}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase size={13} className="text-slate-400" />
                ID: {String(project.id).slice(0, 8)}
              </span>
            </div>
            {project.description && (
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600 pt-1">{project.description}</p>
            )}
          </div>
          {/* Read-only executive governance indicator */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs">
            <ShieldCheck size={13} className="text-slate-500" />
            Read-Only Governance
          </span>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Total Tasks', value: tasks.length, color: 'text-slate-900', bg: 'bg-slate-50' },
            { label: 'In Progress', value: inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Completed', value: completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Overdue', value: overdue, color: overdue ? 'text-rose-600' : 'text-slate-400', bg: overdue ? 'bg-rose-50' : 'bg-slate-50' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg ${stat.bg} p-3 text-center`}>
              <div className={`text-2xl font-extrabold leading-none ${stat.color}`}>{stat.value}</div>
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-4">
          <span className="w-28 shrink-0 text-sm font-semibold text-slate-600">Overall Progress</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-24 text-right text-sm font-bold text-slate-900">
            {completed}/{tasks.length} ({progress}%)
          </span>
        </div>
      </header>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Tasks list — takes 2/3 */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo size={16} className="text-blue-600" />
                <h2 className="font-semibold text-slate-900 text-sm">Tasks & Assignments</h2>
              </div>
              <span className="text-xs text-slate-500">{tasks.length} total task{tasks.length !== 1 ? 's' : ''}</span>
            </div>

            {tasks.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No tasks" description="This project has no tasks yet." />
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {paginatedTasks.map((task) => {
                    const assignee = getAssignee(task);
                    const subtasks = task.subtasks || [];
                    const isOverdue =
                      task.dueDate &&
                      new Date(task.dueDate) < today &&
                      task.status !== 'Completed';

                    return (
                      <div
                        key={task.id}
                        className="px-5 py-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Status icon */}
                            <div className="mt-0.5 shrink-0">
                              {task.status === 'Completed' ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : isOverdue ? (
                                <AlertCircle size={16} className="text-rose-500" />
                              ) : (
                                <Clock size={16} className="text-blue-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 leading-tight">{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                              )}
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-400">
                                {task.dueDate && (
                                  <span className={isOverdue ? 'text-rose-500 font-semibold' : ''}>
                                    Due {formatDate(task.dueDate)}
                                  </span>
                                )}
                                {subtasks.length > 0 && (
                                  <span>{subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {task.priority && (
                              <Badge status={priorityVariant(task.priority)}>
                                {task.priority}
                              </Badge>
                            )}
                            <Badge status={taskStatusVariant(task.status)}>
                              {String(task.status || 'Active').replace(/_/g, ' ')}
                            </Badge>
                            <ChevronRight
                              size={14}
                              className={`text-slate-300 transition-transform ${selectedTask?.id === task.id ? 'rotate-90' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Assignee row */}
                        {assignee && (
                          <div className="mt-2 ml-7 flex items-center gap-2">
                            <Avatar name={assignee.fullName || assignee.name} />
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                {assignee.fullName || assignee.name || 'Unknown'}
                              </p>
                              {assignee.jobTitle && (
                                <p className="text-[10px] text-slate-400">{assignee.jobTitle}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Expanded: subtasks */}
                        {selectedTask?.id === task.id && subtasks.length > 0 && (
                          <div className="mt-3 ml-7 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtasks</p>
                            {subtasks.map((sub) => {
                              const subAssignee = sub.assignedToId
                                ? userById[String(sub.assignedToId)]
                                : null;
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {sub.status === 'Completed' ? (
                                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                    ) : (
                                      <Clock size={13} className="text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-xs text-slate-700 font-medium truncate">{sub.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {subAssignee && (
                                      <span className="text-[10px] text-slate-500">
                                        {subAssignee.fullName || subAssignee.name}
                                      </span>
                                    )}
                                    <Badge status={taskStatusVariant(sub.status)}>
                                      {String(sub.status || 'Active').replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {tasks.length > TASK_PAGE_SIZE && (
                  <div className="border-t border-slate-100 px-5 py-3">
                    <Pagination
                      currentPage={currentTaskPage}
                      totalItems={tasks.length}
                      pageSize={TASK_PAGE_SIZE}
                      onPageChange={setCurrentTaskPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Team sidebar — takes 1/3 */}
        <div className="space-y-4">
          {/* Team members */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Team Roster</h2>
              <span className="ml-auto text-xs text-slate-400">
                {contributors.length + (project.projectManager ? 1 : 0)}
              </span>
            </div>

            {project.projectManager && (
              <div className="px-5 py-3.5 bg-blue-50/40 border-b border-blue-100/70 flex items-center gap-3">
                <Avatar name={project.projectManager.fullName} size="base" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-slate-900 truncate">
                      {project.projectManager.fullName}
                    </p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      PM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {project.projectManager.email || project.projectManager.jobTitle || 'Lead Project Manager'}
                  </p>
                </div>
                <Badge status="info">Lead PM</Badge>
              </div>
            )}

            {contributors.length === 0 && !project.projectManager ? (
              <div className="p-4">
                <EmptyState title="No team assigned" description="No members found for this project." />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {contributors.slice(0, 12).map((member) => {
                  const memberTasks = tasks.filter(
                    (t) => String(t.assignedToId || t.assignedTo?.id) === String(member.id)
                  );
                  const doneTasks = memberTasks.filter((t) => t.status === 'Completed').length;

                  return (
                    <div key={member.id} className="px-5 py-3 flex items-center gap-3">
                      <Avatar name={member.fullName} size="base" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-900 truncate">{member.fullName}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {member.jobTitle || member.teamRole || '—'}
                        </p>
                        {memberTasks.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {doneTasks}/{memberTasks.length} tasks done
                          </p>
                        )}
                      </div>
                      <Badge status={member.isActive !== false ? 'success' : 'danger'}>
                        {member.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  );
                })}
                {contributors.length > 12 && (
                  <div className="px-5 py-2.5 text-xs text-slate-400 text-center">
                    +{contributors.length - 12} more members
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Project info card */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50">
              <h2 className="font-semibold text-slate-900 text-sm">Project Info</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {[
                { label: 'Status', value: project.status || 'Planning' },
                { label: 'Project Manager', value: project.projectManager?.fullName || 'Not Assigned' },
                { label: 'Team', value: project.team?.name || '—' },
                { label: 'Branch', value: project.team?.branch?.name || '—' },
                { label: 'Start Date', value: formatDate(project.startDate) },
                { label: 'Target Date', value: formatDate(project.targetDate) },
                { label: 'Members', value: contributors.length },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-800 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
