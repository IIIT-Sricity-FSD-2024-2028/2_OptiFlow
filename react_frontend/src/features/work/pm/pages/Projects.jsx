import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Modal } from '../../../../shared/components/Modal';
import { Toast } from '../../../../shared/components/Toast';
import * as projectsApi from '../../../../services/api/projects';
import * as teamsApi from '../../../../services/api/teams';

const normalize = (response) => Array.isArray(response) ? response : response?.data || [];
const projectPath = (id) => PATHS.PM.PROJECT_DETAIL.replace(':id', id);
const PROJECT_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'OnHold', label: 'At Risk' },
  { value: 'Planning', label: 'Planning' },
  { value: 'Completed', label: 'Completed' },
];

const statusStyle = (status) => {
  if (status === 'Completed') return { border: 'border-t-emerald-500', badge: 'success', bar: 'bg-emerald-500' };
  if (status === 'OnHold' || status === 'On_Hold') return { border: 'border-t-rose-500', badge: 'danger', bar: 'bg-rose-500' };
  if (status === 'Active') return { border: 'border-t-blue-500', badge: 'info', bar: 'bg-blue-500' };
  return { border: 'border-t-slate-300', badge: 'default', bar: 'bg-slate-400' };
};

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  : '—';

export default function PmProjects() {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', teamId: '', status: 'Active', startDate: '', endDate: '', description: '' });
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([projectsApi.list(), teamsApi.list()])
      .then(([projectResponse, teamResponse]) => {
        if (!active) return;
        setProjects(normalize(projectResponse));
        setTeams(normalize(teamResponse));
      })
      .catch((error) => {
        if (active) showToast('error', error.message || 'Failed to load projects.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredProjects = projects.filter((project) => {
    const status = project.status === 'On_Hold' ? 'OnHold' : project.status;
    const matchesFilter = filter === 'All' || status === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [project.name, project.description, project.team?.name]
      .some((value) => String(value || '').toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  const filterCounts = {
    All: projects.length,
    Active: projects.filter((project) => project.status === 'Active').length,
    OnHold: projects.filter((project) => ['OnHold', 'On_Hold'].includes(project.status)).length,
    Planning: projects.filter((project) => project.status === 'Planning').length,
    Completed: projects.filter((project) => project.status === 'Completed').length,
  };

  const createProject = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.teamId) {
      showToast('error', 'Enter a project name and choose a team.');
      return;
    }
    setSaving(true);
    try {
      const response = await projectsApi.create({
        name: form.name.trim(),
        teamId: form.teamId,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        description: form.description.trim() || undefined,
      });
      setProjects((current) => [response?.data || response, ...current]);
      setForm({ name: '', teamId: '', status: 'Active', startDate: '', endDate: '', description: '' });
      setIsOpen(false);
      showToast('success', 'Project created.');
    } catch (error) {
      showToast('error', error.message || 'Failed to create project.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-gray-500">Browse project cards and open one to view its full description and work.</p>
        </div>
        <Button variant="primary" onClick={() => setIsOpen(true)}>+ New Project</Button>
      </header>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
          {PROJECT_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                filter === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {label} ({filterCounts[value]})
            </button>
          ))}
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description={projects.length ? 'Try another search or status filter.' : 'Create a project to start tracking delivery.'}
          action={projects.length === 0 ? <Button variant="primary" onClick={() => setIsOpen(true)}>Create Project</Button> : undefined}
        />
      ) : (
        <section className="grid grid-cols-1 gap-5 pt-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const style = statusStyle(project.status);
            const projectTasks = project.tasks || [];
            const completed = projectTasks.filter((task) => task.status === 'Completed').length;
            const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
            const openEscalations = (project.escalations || []).filter(
              (item) => !['Resolved', 'Closed'].includes(item.status)
            ).length;
            return (
              <Link
                key={project.id}
                to={projectPath(project.id)}
                className={`group flex min-h-64 flex-col gap-4 rounded-xl border border-slate-200 border-t-4 ${style.border} bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold leading-snug text-slate-900 group-hover:text-blue-700">{project.name}</h2>
                  <Badge status={style.badge}>{project.status === 'OnHold' || project.status === 'On_Hold' ? 'On Hold' : project.status || 'Planning'}</Badge>
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

                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="truncate">{project.team?.name || 'No team assigned'}</span>
                    <span className="shrink-0">Due {formatDate(project.targetDate)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-500">{projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}</span>
                    <span className={openEscalations ? 'font-semibold text-rose-600' : 'text-slate-400'}>
                      {openEscalations} open escalation{openEscalations === 1 ? '' : 's'}
                    </span>
                    <span className="font-semibold text-blue-600">View details →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Project"
        footer={(
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={createProject} disabled={saving}>{saving ? 'Creating…' : 'Create project'}</Button>
          </>
        )}
      >
        <form onSubmit={createProject} className="space-y-4">
          <FormField label="Project name" required>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={saving} />
          </FormField>
          <FormField label="Team" required>
            <Select value={form.teamId} onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))} disabled={saving}>
              <option value="">Select a team</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}{team.branch?.name ? ` · ${team.branch.name}` : ''}</option>)}
            </Select>
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} disabled={saving} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Status">
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} disabled={saving}>
                {['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'].map((status) => <option key={status} value={status}>{status === 'OnHold' ? 'On hold' : status}</option>)}
              </Select>
            </FormField>
            <FormField label="Start date">
              <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} disabled={saving} />
            </FormField>
            <FormField label="Target date">
              <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} disabled={saving} />
            </FormField>
          </div>
        </form>
      </Modal>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast((current) => ({ ...current, visible: false }))} />
    </div>
  );
}
