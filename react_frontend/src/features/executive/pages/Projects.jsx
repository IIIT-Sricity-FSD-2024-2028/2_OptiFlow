import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../app/paths';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Input, Select } from '../../../shared/components/FormField';
import { Loader } from '../../../shared/components/Loader';
import { Pagination } from '../../../shared/components/Pagination';
import * as projectsApi from '../../../services/api/projects';
import * as teamsApi from '../../../services/api/teams';
import {
  Briefcase,
  Users,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

const normalize = (r) => (Array.isArray(r) ? r : r?.data || []);
const PAGE_SIZE = 9;

const PROJECT_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'OnHold', label: 'At Risk' },
  { value: 'Planning', label: 'Planning' },
  { value: 'Completed', label: 'Completed' },
];

const statusStyle = (status) => {
  if (status === 'Completed') return { border: 'border-t-emerald-500', badge: 'success', bar: 'bg-emerald-500', icon: <CheckCircle2 size={14} className="text-emerald-600" /> };
  if (status === 'OnHold' || status === 'On_Hold') return { border: 'border-t-rose-500', badge: 'danger', bar: 'bg-rose-500', icon: <AlertCircle size={14} className="text-rose-600" /> };
  if (status === 'Active') return { border: 'border-t-blue-500', badge: 'info', bar: 'bg-blue-500', icon: <TrendingUp size={14} className="text-blue-600" /> };
  return { border: 'border-t-slate-300', badge: 'default', bar: 'bg-slate-400', icon: <Clock size={14} className="text-slate-400" /> };
};

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export default function ExecutiveProjects() {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([projectsApi.list(), teamsApi.list()])
      .then(([projectRes, teamRes]) => {
        if (!active) return;
        setProjects(normalize(projectRes));
        setTeams(normalize(teamRes));
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load projects.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredProjects = projects.filter((p) => {
    const status = p.status === 'On_Hold' ? 'OnHold' : p.status;
    const matchesFilter = filter === 'All' || status === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [p.name, p.description, p.team?.name, p.projectManager?.fullName]
      .some((v) => String(v || '').toLowerCase().includes(query));
    const matchesTeam = !teamFilter || String(p.teamId || p.team?.id) === teamFilter;
    return matchesFilter && matchesSearch && matchesTeam;
  });

  const filterCounts = {
    All: projects.length,
    Active: projects.filter((p) => p.status === 'Active').length,
    OnHold: projects.filter((p) => ['OnHold', 'On_Hold'].includes(p.status)).length,
    Planning: projects.filter((p) => p.status === 'Planning').length,
    Completed: projects.filter((p) => p.status === 'Completed').length,
  };

  const paginated = filteredProjects.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Summary stats
  const activeCount = projects.filter((p) => p.status === 'Active').length;
  const completedCount = projects.filter((p) => p.status === 'Completed').length;
  const atRiskCount = projects.filter((p) => ['OnHold', 'On_Hold'].includes(p.status)).length;
  const totalTasks = projects.reduce((s, p) => s + (p.tasks?.length || 0), 0);

  if (loading)
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <Loader />
      </div>
    );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="mt-1 text-gray-500">
          Read-only executive overview of all company projects and delivery progress.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: projects.length, cls: 'text-slate-900' },
          { label: 'Active', value: activeCount, cls: 'text-blue-700' },
          { label: 'Completed', value: completedCount, cls: 'text-emerald-700' },
          { label: 'At Risk', value: atRiskCount, cls: atRiskCount > 0 ? 'text-rose-700' : 'text-slate-900' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className={`text-3xl font-extrabold ${cls}`}>{value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search projects, teams..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {teams.length > 0 && (
          <select
            value={teamFilter}
            onChange={(e) => { setTeamFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
          {PROJECT_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setFilter(value); setCurrentPage(1); }}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                filter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {label} ({filterCounts[value]})
            </button>
          ))}
        </div>
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description={projects.length ? 'Try another search or filter.' : 'No projects have been created yet.'}
        />
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paginated.map((project) => {
              const style = statusStyle(project.status);
              const projectTasks = project.tasks || [];
              const done = projectTasks.filter((t) => t.status === 'Completed').length;
              const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
              const openEscalations = (project.escalations || []).filter(
                (e) => !['Resolved', 'Closed'].includes(e.status)
              ).length;

              return (
                <Link
                  key={project.id}
                  to={PATHS.EXECUTIVE.PROJECT_DETAIL.replace(':id', project.id)}
                  className={`flex min-h-64 flex-col gap-4 rounded-xl border border-slate-200 border-t-4 ${style.border} bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {style.icon}
                      <h2 className="text-base font-bold leading-snug text-slate-900">{project.name}</h2>
                    </div>
                    <Badge status={style.badge}>
                      {project.status === 'OnHold' || project.status === 'On_Hold' ? 'On Hold' : project.status || 'Planning'}
                    </Badge>
                  </div>

                  <p className="min-h-10 text-sm leading-relaxed text-slate-600 line-clamp-2">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="mt-auto space-y-3">
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span className="font-semibold">{progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50/80 rounded-lg px-2.5 py-1.5 border border-slate-100">
                      <span className="flex items-center gap-1.5 min-w-0 truncate" title={`Project Manager: ${project.projectManager?.fullName || 'Unassigned'}`}>
                        <UserCheck size={13} className="text-blue-600 shrink-0" />
                        <span className="text-slate-400 font-normal">PM:</span>
                        <span className="font-semibold text-slate-800 truncate">
                          {project.projectManager?.fullName || 'Unassigned'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 text-slate-500">
                        <Users size={12} className="text-slate-400" />
                        <span className="truncate">{project.team?.name || 'No team'}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 truncate">
                        <Briefcase size={12} className="text-slate-400" />
                        <span>Branch: {project.team?.branch?.name || 'HQ Hub'}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDate(project.targetDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="text-slate-500">
                        {projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}
                      </span>
                      {openEscalations > 0 && (
                        <span className="font-semibold text-rose-600">
                          {openEscalations} escalation{openEscalations !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-slate-400">
                        {done}/{projectTasks.length} done
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredProjects.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
