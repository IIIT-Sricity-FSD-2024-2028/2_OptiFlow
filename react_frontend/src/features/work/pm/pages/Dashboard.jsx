import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Loader } from '../../../../shared/components/Loader';
import { StatCard } from '../../../../shared/components/StatCard';
import * as escalationsApi from '../../../../services/api/escalations';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';

const normalize = (response) => Array.isArray(response) ? response : response?.data || [];
const projectPath = (id) => PATHS.PM.PROJECT_DETAIL.replace(':id', id);

export default function PmDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([projectsApi.list(), tasksApi.list(), escalationsApi.list()])
      .then(([projectResponse, taskResponse, escalationResponse]) => {
        if (!active) return;
        setProjects(normalize(projectResponse));
        setTasks(normalize(taskResponse));
        setEscalations(normalize(escalationResponse));
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
  const recentProjects = projects.slice(0, 5);
  const recentEscalations = openEscalations.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Project Manager Dashboard</h1>
        <p className="mt-1 text-gray-500">Project delivery, task workload, and team escalations at a glance.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Projects" value={projects.length} trend={`${activeProjects} active`} />
        <StatCard title="Tasks" value={tasks.length} trend={`${completedTasks} completed`} />
        <StatCard title="Overdue tasks" value={overdueTasks.length} trend={overdueTasks.length ? 'Needs attention' : 'On track'} />
        <StatCard title="Open escalations" value={openEscalations.length} trend="Awaiting PM review" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">Projects</h2>
              <p className="mt-1 text-xs text-gray-500">Recent project status and progress.</p>
            </div>
            <Link to={PATHS.PM.PROJECTS} className="text-sm font-medium text-blue-600 hover:text-blue-700">All projects →</Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="p-5"><EmptyState title="No projects" description="Create a project to start tracking delivery." /></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentProjects.map((project) => {
                const projectTasks = project.tasks || tasks.filter((task) => task.projectId === project.id);
                const progress = projectTasks.length
                  ? Math.round((projectTasks.filter((task) => task.status === 'Completed').length / projectTasks.length) * 100)
                  : 0;
                return (
                  <Link key={project.id} to={projectPath(project.id)} className="block px-5 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium text-gray-900">{project.name}</span>
                      <Badge status={project.status === 'Completed' ? 'success' : project.status === 'Active' ? 'info' : 'default'}>{project.status || 'Planning'}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500">{progress}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">Escalation alerts</h2>
              <p className="mt-1 text-xs text-gray-500">Open blockers and extension requests from teams.</p>
            </div>
            <Link to={PATHS.PM.ESCALATIONS} className="text-sm font-medium text-blue-600 hover:text-blue-700">Inbox →</Link>
          </div>
          {recentEscalations.length === 0 ? (
            <div className="p-5"><EmptyState title="No open escalations" description="New team escalations will appear here." /></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentEscalations.map((item) => (
                <Link key={item.id} to={PATHS.PM.ESCALATIONS} className="block px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-900">{item.title}</span>
                    <Badge status={['High', 'Critical'].includes(item.priority) ? 'danger' : 'warning'}>{item.priority || 'Medium'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{item.reportedBy?.fullName || 'Team member'} · {item.blockerType || 'Blocker'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to={PATHS.PM.TASKS} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Assign a task</Link>
        <Link to={PATHS.PM.PROJECTS} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Manage projects</Link>
      </div>
    </div>
  );
}
