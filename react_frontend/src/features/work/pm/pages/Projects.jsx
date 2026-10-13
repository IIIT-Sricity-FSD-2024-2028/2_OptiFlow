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
import { Pagination } from '../../../../shared/components/Pagination';
import * as projectsApi from '../../../../services/api/projects';
import * as teamsApi from '../../../../services/api/teams';
import { createInstance, listTemplates } from '../../../../services/api/process';

const normalize = (response) => Array.isArray(response) ? response : response?.data || [];
const projectPath = (id) => PATHS.PM.PROJECT_DETAIL.replace(':id', id);
const PAGE_SIZE = 9;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [teams, setTeams] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateError, setTemplateError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    teamId: '',
    templateId: '',
    status: 'Active',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    description: '',
  });
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
    listTemplates()
      .then((response) => {
        if (!active) return;
        setTemplates(normalize(response).filter((template) => template.isActive !== false));
      })
      .catch((error) => {
        if (active) setTemplateError(error.message || 'Failed to load workflow templates.');
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
  const selectedTemplate = templates.find((template) => String(template.id) === String(form.templateId));
  const templateSteps = selectedTemplate?.steps || selectedTemplate?.stages || [];

  const createProject = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 3 || form.description.trim().length < 10 || !form.teamId || !form.endDate) {
      showToast('error', 'Enter a project name (at least 3 characters), description (at least 10 characters), team, and end date.');
      return;
    }
    setSaving(true);
    try {
      const response = await projectsApi.create({
        name: form.name.trim(),
        teamId: form.teamId,
        targetDate: form.endDate,
        status: form.status,
        startDate: form.startDate || undefined,
        description: form.description.trim(),
      });
      const project = response?.data || response;
      setProjects((current) => [project, ...current]);
      setForm({
        name: '',
        teamId: '',
        templateId: '',
        status: 'Active',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        description: '',
      });
      setIsOpen(false);
      if (form.templateId) {
        try {
          await createInstance({
            templateId: form.templateId,
            projectId: project.id,
            title: `${selectedTemplate?.name || 'Workflow'} - ${project.name}`,
          });
          showToast('success', 'Project created with its workflow.');
        } catch (error) {
          showToast('warning', `Project created, but its workflow could not be started: ${error.message || 'Request failed.'}`);
        }
      } else {
        showToast('success', 'Project created.');
      }
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
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-5 pt-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((project) => {
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

          <Pagination
            currentPage={currentPage}
            totalItems={filteredProjects.length}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => !saving && setIsOpen(false)}
        title="+ New Project"
        className="max-w-2xl"
        footer={(
          <>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="submit" form="create-project-form" disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</Button>
          </>
        )}
      >
        <form id="create-project-form" onSubmit={createProject} className="space-y-4">
          <FormField label="Project Name" required>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Q1 Compliance Review" minLength={3} required disabled={saving} />
          </FormField>
          <FormField label="Description" required>
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Brief project description..." rows={3} minLength={10} required disabled={saving} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Assigned Team" required>
                <Select value={form.teamId} onChange={(event) => setForm((current) => ({ ...current, teamId: event.target.value }))} required disabled={saving}>
                  <option value="">Select a team</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}{team.branch?.name ? ` · ${team.branch.name}` : ''}</option>)}
                </Select>
              </FormField>
              <FormField label="Workflow Template (Optional)">
                <Select value={form.templateId} onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value }))} disabled={saving}>
                  <option value="">No Template (Manual Tasks)</option>
                  {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </Select>
                {templateError && <p className="mt-1 text-xs text-amber-700" role="status">{templateError}</p>}
              </FormField>
          </div>
          {form.templateId && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Auto-generated Stages</p>
              {templateSteps.length ? (
                <div className="flex flex-wrap gap-2">
                  {templateSteps.map((step, index) => (
                    <span key={step.id || index} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                      {index + 1}. {step.name || step}
                    </span>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500">This template has no stages yet.</p>}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="End Date" required>
              <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} required disabled={saving} />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} disabled={saving}>
                {['Active', 'Planning', 'OnHold', 'Completed'].map((status) => <option key={status} value={status}>{status === 'OnHold' ? 'On Hold' : status}</option>)}
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast((current) => ({ ...current, visible: false }))} />
    </div>
  );
}
