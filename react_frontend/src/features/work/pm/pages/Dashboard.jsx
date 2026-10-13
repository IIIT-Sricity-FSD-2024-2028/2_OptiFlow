import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Loader } from '../../../../shared/components/Loader';
import { StatCard } from '../../../../shared/components/StatCard';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileCheck,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import * as escalationsApi from '../../../../services/api/escalations';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as complianceApi from '../../../../services/api/compliance';
import * as evidenceApi from '../../../../services/api/evidence';
import * as teamsApi from '../../../../services/api/teams';

const normalize = (response) => Array.isArray(response) ? response : response?.data || [];
const projectPath = (id) => PATHS.PM.PROJECT_DETAIL.replace(':id', id);

export default function PmDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [violations, setViolations] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      projectsApi.list(),
      tasksApi.list(),
      escalationsApi.list(),
      complianceApi.getViolations().catch(() => []),
      evidenceApi.getEvidenceList().catch(() => []),
      teamsApi.list().catch(() => []),
    ])
      .then(([projectResponse, taskResponse, escalationResponse, violationResponse, evidenceResponse, teamResponse]) => {
        if (!active) return;
        setProjects(normalize(projectResponse));
        setTasks(normalize(taskResponse));
        setEscalations(normalize(escalationResponse));
        setViolations(normalize(violationResponse));
        setEvidenceList(normalize(evidenceResponse));
        setTeams(normalize(teamResponse));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Failed to load PM dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;
  if (error) return <div className="p-6 text-sm text-red-600" role="alert">{error}</div>;

  const openEscalations = escalations.filter((item) => !['Resolved', 'Closed'].includes(item.status));
  const activeProjects = projects.filter((item) => item.status === 'Active').length;
  const completedTasks = tasks.filter((item) => item.status === 'Completed').length;
  const overdueTasks = tasks.filter((item) =>
    item.dueDate && new Date(item.dueDate) < new Date() && !['Completed', 'Cancelled'].includes(item.status)
  );

  // Compliance calculations
  const activeViolations = violations.filter((v) => ['Open', 'Under_Review'].includes(v.status));
  const blockedTaskIds = new Set(
    activeViolations
      .filter((v) => v.entityType === 'Task')
      .map((v) => String(v.entityId))
  );
  const tasksBlockedByCompliance = tasks.filter((t) => blockedTaskIds.has(String(t.id)));
  const pendingEvidenceCount = evidenceList.filter((e) =>
    ['pending', 'under_review'].includes(String(e.status || '').toLowerCase())
  ).length;

  const complianceHealthStatus =
    activeViolations.length === 0
      ? '100% Compliant'
      : activeViolations.some((v) => ['High', 'Critical'].includes(v.severity))
      ? 'Action Required'
      : 'Warnings Present';

  // Team Workload calculation
  const teamWorkloadMap = {};
  teams.forEach((t) => {
    teamWorkloadMap[t.id] = {
      name: t.name,
      total: 0,
      completed: 0,
      blocked: 0,
    };
  });

  tasks.forEach((task) => {
    // If task has project with team, roll up
    const proj = projects.find((p) => p.id === task.projectId);
    const teamId = proj?.teamId || proj?.team?.id;
    if (teamId && teamWorkloadMap[teamId]) {
      teamWorkloadMap[teamId].total += 1;
      if (task.status === 'Completed') teamWorkloadMap[teamId].completed += 1;
      if (blockedTaskIds.has(String(task.id))) teamWorkloadMap[teamId].blocked += 1;
    }
  });

  const teamWorkloadList = Object.values(teamWorkloadMap).filter((item) => item.total > 0);

  const recentProjects = projects.slice(0, 5);
  const recentEscalations = openEscalations.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Project Management Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time delivery progress, team capacity, and compliance governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={PATHS.PM.TASKS}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Assign Task
          </Link>
          <Link
            to={PATHS.PM.PROJECTS}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Manage Projects
          </Link>
        </div>
      </header>

      {/* Compliance Health & Risk Banner (clean, professional warning) */}
      {tasksBlockedByCompliance.length > 0 && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shadow-xs">
              <ShieldAlert size={20} />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {tasksBlockedByCompliance.length} Task{tasksBlockedByCompliance.length > 1 ? 's' : ''} Blocked by Compliance Policy
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These tasks require approved compliance evidence or audit resolution before they can be marked completed.
              </p>
            </div>
          </div>
          <Link
            to={`${PATHS.PM.TASKS}?filter=compliance_blocked`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-700 transition-colors"
          >
            <span>Review Blocked Tasks</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* Primary KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Projects" 
          value={projects.length} 
          trend={`${activeProjects} active`}
          icon={<Briefcase size={18} className="text-blue-600" />}
        />
        <StatCard 
          title="Tasks" 
          value={tasks.length} 
          trend={`${completedTasks} completed`}
          icon={<CheckCircle2 size={18} className="text-emerald-600" />}
        />
        <StatCard 
          title="Overdue tasks" 
          value={overdueTasks.length} 
          trend={overdueTasks.length ? 'Action required' : 'On track'} 
          trendDirection={overdueTasks.length ? 'down' : 'up'}
          icon={<AlertCircle size={18} className={overdueTasks.length ? 'text-rose-500' : 'text-slate-400'} />}
        />
        <StatCard 
          title="Open escalations" 
          value={openEscalations.length} 
          trend="Awaiting PM review"
          icon={<Clock size={18} className="text-amber-500" />}
        />
      </section>

      {/* Compliance Health Governance Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Compliance Health</h2>
          </div>
          <Badge status={activeViolations.length === 0 ? 'success' : 'danger'}>
            {complianceHealthStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat 1: Violations */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Violations</span>
              <ShieldAlert size={16} className={activeViolations.length > 0 ? 'text-rose-500' : 'text-slate-400'} />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{activeViolations.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {activeViolations.filter((v) => ['High', 'Critical'].includes(v.severity)).length} High / Critical severity flags
            </p>
          </div>

          {/* Stat 2: Tasks Blocked */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tasks Blocked</span>
              <AlertCircle size={16} className={tasksBlockedByCompliance.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{tasksBlockedByCompliance.length}</p>
            <p className="mt-1 text-xs text-slate-500">Pending required compliance evidence</p>
          </div>

          {/* Stat 3: Pending Evidence */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Evidence</span>
              <FileCheck size={16} className={pendingEvidenceCount > 0 ? 'text-blue-500' : 'text-slate-400'} />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{pendingEvidenceCount}</p>
            <p className="mt-1 text-xs text-slate-500">Evidence submissions pending verification</p>
          </div>
        </div>
      </section>

      {/* Projects, Team Workload & Escalations Section */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Projects Delivery & Team Workload */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/50">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Projects & Team Workload</h2>
              <p className="mt-0.5 text-xs text-slate-500">Active projects with team allocation and progress.</p>
            </div>
            <Link to={PATHS.PM.PROJECTS} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              All projects →
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="p-6 flex-1 flex items-center justify-center">
              <EmptyState title="No projects" description="Create a project to start tracking delivery." />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {recentProjects.map((project) => {
                const projectTasks = project.tasks || tasks.filter((task) => task.projectId === project.id);
                const progress = projectTasks.length
                  ? Math.round((projectTasks.filter((task) => task.status === 'Completed').length / projectTasks.length) * 100)
                  : 0;
                const teamName = project.team?.name || 'Assigned Team';

                return (
                  <Link key={project.id} to={projectPath(project.id)} className="block px-5 py-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{project.name}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Users size={12} className="text-slate-400" />
                          {teamName}
                        </span>
                      </div>
                      <Badge status={project.status === 'Completed' ? 'success' : project.status === 'Active' ? 'info' : 'default'}>
                        {project.status || 'Planning'}
                      </Badge>
                    </div>

                    {/* Progress Bar & Workload Stats */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Workload: {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}</span>
                        <span className="font-semibold text-slate-800">{progress}% complete</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div 
                          className="h-full rounded-full bg-blue-600 transition-all duration-300" 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Quick Team Workload Capacity Summary Footer */}
          {teamWorkloadList.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Team Capacity Summary</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {teamWorkloadList.slice(0, 3).map((tw, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs">
                    <p className="font-semibold text-slate-800 truncate">{tw.name}</p>
                    <div className="mt-1 flex items-center justify-between text-slate-500">
                      <span>{tw.total} tasks</span>
                      <span className={tw.blocked > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}>
                        {tw.completed}/{tw.total} done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Escalation Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/50">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Escalation Alerts</h2>
              <p className="mt-0.5 text-xs text-slate-500">Open blockers and extension requests from teams.</p>
            </div>
            <Link to={PATHS.PM.ESCALATIONS} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Inbox →
            </Link>
          </div>
          {recentEscalations.length === 0 ? (
            <div className="p-6 flex-1 flex items-center justify-center">
              <EmptyState title="No open escalations" description="New team escalations will appear here." />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {recentEscalations.map((item) => (
                <Link key={item.id} to={PATHS.PM.ESCALATIONS} className="block px-5 py-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-sm text-slate-900">{item.title}</span>
                    <Badge status={['High', 'Critical'].includes(item.priority) ? 'danger' : 'warning'}>
                      {item.priority || 'Medium'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                    <span>{item.reportedBy?.fullName || 'Team member'}</span>
                    <span>·</span>
                    <span className="font-medium text-slate-700">{item.blockerType || 'Blocker'}</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
