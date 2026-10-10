import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Modal } from '../../../../shared/components/Modal';
import { Table } from '../../../../shared/components/Table';
import { Toast } from '../../../../shared/components/Toast';
import * as escalationsApi from '../../../../services/api/escalations';
import * as projectsApi from '../../../../services/api/projects';

const FILTERS = ['all', 'high', 'medium', 'resolved'];
const normalize = (response) => Array.isArray(response) ? response : response?.data || [];
const formatStatus = (status) => String(status || 'Open').replace(/_/g, ' ');
const isResolved = (escalation) => ['Resolved', 'Closed'].includes(String(escalation.status));

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

export default function PmEscalations() {
  const [escalations, setEscalations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    projectId: '',
    blockerType: '',
    priority: 'High',
  });
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([escalationsApi.list(), projectsApi.list()])
      .then(([escalationResponse, projectResponse]) => {
        if (!active) return;
        setEscalations(normalize(escalationResponse));
        setProjects(normalize(projectResponse));
      })
      .catch((error) => {
        if (active) showToast('error', error.message || 'Failed to load escalations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    all: escalations.filter((item) => !isResolved(item)).length,
    high: escalations.filter((item) => !isResolved(item) && ['High', 'Critical'].includes(item.priority)).length,
    medium: escalations.filter((item) => !isResolved(item) && item.priority === 'Medium').length,
    resolved: escalations.filter(isResolved).length,
  }), [escalations]);

  const visibleEscalations = useMemo(() => {
    if (filter === 'resolved') return escalations.filter(isResolved);
    const active = escalations.filter((item) => !isResolved(item));
    if (filter === 'high') return active.filter((item) => ['High', 'Critical'].includes(item.priority));
    if (filter === 'medium') return active.filter((item) => item.priority === 'Medium');
    return active;
  }, [escalations, filter]);

  const selectedEscalation = escalations.find((item) => String(item.id) === String(selectedId));

  const columns = [
    {
      key: 'escalation',
      header: 'Escalation',
      render: (item) => (
        <div className="min-w-56 space-y-1">
          <p className="font-semibold text-slate-900">{item.title || 'Untitled escalation'}</p>
          <p className="text-xs text-slate-500">
            {item.reportedBy?.fullName || 'Team member'} · {formatDate(item.createdAt)}
          </p>
          <p className="text-xs text-slate-500">
            {item.project?.name || projects.find((project) => String(project.id) === String(item.projectId))?.name || 'No project'} · {item.blockerType || 'Blocker'}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item) => <Badge status={['High', 'Critical'].includes(item.priority) ? 'danger' : item.priority}>{item.priority || 'Medium'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <Badge status={isResolved(item) ? 'success' : item.status === 'Reviewed' ? 'info' : 'warning'}>{formatStatus(item.status)}</Badge>,
    },
  ];

  const resolveSelected = async (event) => {
    event.preventDefault();
    const notes = resolutionNotes.trim();
    if (!selectedEscalation || !notes) {
      showToast('error', 'Enter resolution notes before resolving this escalation.');
      return;
    }

    setSaving(true);
    try {
      const previousDescription = selectedEscalation.description?.trim();
      const description = previousDescription
        ? `${previousDescription}\n\nResolution: ${notes}`
        : `Resolution: ${notes}`;
      await escalationsApi.update(selectedEscalation.id, { status: 'Resolved', description });
      setEscalations((current) => current.map((item) =>
        item.id === selectedEscalation.id ? { ...item, status: 'Resolved', description } : item
      ));
      setResolutionNotes('');
      showToast('success', 'Escalation resolved.');
    } catch (error) {
      showToast('error', error.message || 'Could not resolve escalation.');
    } finally {
      setSaving(false);
    }
  };

  const createEscalation = async (event) => {
    event.preventDefault();
    if (createForm.title.trim().length < 5 || createForm.description.trim().length < 10 || !createForm.projectId) {
      showToast('error', 'Enter a title, description, and project to report an escalation.');
      return;
    }

    setCreating(true);
    try {
      const response = await escalationsApi.create({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        projectId: createForm.projectId,
        blockerType: createForm.blockerType.trim() || undefined,
        priority: createForm.priority,
      });
      const created = response?.data || response;
      setEscalations((current) => [created, ...current]);
      setFilter('all');
      setSelectedId(created.id);
      setCreateForm({ title: '', description: '', projectId: '', blockerType: '', priority: 'High' });
      setCreateOpen(false);
      showToast('success', 'Escalation reported.');
    } catch (error) {
      showToast('error', error.message || 'Could not submit escalation.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Escalations</h1>
          <Badge status="warning">{counts.all} open</Badge>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>+ New Escalation</Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)] gap-6 items-start">
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)} ({counts[key]})
              </button>
            ))}
          </div>
          <Table
            columns={columns}
            data={visibleEscalations}
            loading={false}
            emptyMessage="No escalations"
            onRowClick={(item) => {
              setSelectedId(item.id);
              setResolutionNotes('');
            }}
            rowClassName={(item) => String(item.id) === String(selectedId) ? 'bg-blue-50' : ''}
          />
        </section>

        <section className="min-h-[420px] rounded-xl border border-slate-200 bg-white shadow-sm">
          {!selectedEscalation ? (
            <div className="p-6">
              <EmptyState title="Select an escalation" description="Choose an item from the list to view its details." />
            </div>
          ) : (
            <article className="p-6 lg:p-8 space-y-6">
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <h2 className="text-xl font-bold text-slate-900">{selectedEscalation.title || 'Untitled escalation'}</h2>
                <Badge status={['High', 'Critical'].includes(selectedEscalation.priority) ? 'danger' : selectedEscalation.priority}>
                  {selectedEscalation.priority || 'Medium'} priority
                </Badge>
              </header>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {[
                  ['Escalated by', selectedEscalation.reportedBy?.fullName || selectedEscalation.reportedBy?.email || 'Unknown'],
                  ['Project', selectedEscalation.project?.name || projects.find((project) => String(project.id) === String(selectedEscalation.projectId))?.name || '—'],
                  ['Type', `Blocker — ${selectedEscalation.blockerType || 'Unknown'}`],
                  ['Status', formatStatus(selectedEscalation.status)],
                  ['Escalated on', formatDate(selectedEscalation.createdAt)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>

              {selectedEscalation.task?.title && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Related task</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedEscalation.task.title}</p>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Escalation notes</h3>
                <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {selectedEscalation.description || 'No description provided.'}
                </div>
              </div>

              {!isResolved(selectedEscalation) ? (
                <form onSubmit={resolveSelected} className="space-y-3">
                  <FormField label="Your response / resolution" required>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(event) => setResolutionNotes(event.target.value)}
                      rows={4}
                      placeholder="Enter resolution notes, next steps, or reassignment details..."
                      disabled={saving}
                    />
                  </FormField>
                  <Button type="submit" variant="primary" disabled={saving || !resolutionNotes.trim()}>
                    {saving ? 'Saving…' : 'Mark Resolved'}
                  </Button>
                </form>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Resolved
                </div>
              )}
            </article>
          )}
        </section>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        title="Report New Escalation"
        footer={(
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" onClick={createEscalation} disabled={creating}>
              {creating ? 'Submitting…' : 'Submit Escalation'}
            </Button>
          </>
        )}
      >
        <form onSubmit={createEscalation} className="space-y-4">
          <FormField label="Title" required>
            <Input
              value={createForm.title}
              onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
              minLength={5}
              placeholder="Brief description of the blocker"
              disabled={creating}
            />
          </FormField>
          <FormField label="Description" required>
            <Textarea
              value={createForm.description}
              onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
              minLength={10}
              rows={4}
              placeholder="Explain what is blocked and why..."
              disabled={creating}
            />
          </FormField>
          <FormField label="Project" required>
            <Select
              value={createForm.projectId}
              onChange={(event) => setCreateForm((current) => ({ ...current, projectId: event.target.value }))}
              disabled={creating}
            >
              <option value="">Select project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Priority" required>
              <Select
                value={createForm.priority}
                onChange={(event) => setCreateForm((current) => ({ ...current, priority: event.target.value }))}
                disabled={creating}
              >
                {['High', 'Medium', 'Low', 'Critical'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </Select>
            </FormField>
            <FormField label="Blocker type">
              <Input
                value={createForm.blockerType}
                onChange={(event) => setCreateForm((current) => ({ ...current, blockerType: event.target.value }))}
                placeholder="e.g. Access issue"
                disabled={creating}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast((current) => ({ ...current, visible: false }))} />
    </div>
  );
}
