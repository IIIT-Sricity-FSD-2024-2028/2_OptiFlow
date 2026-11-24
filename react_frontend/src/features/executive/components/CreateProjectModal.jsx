import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { FormField, Input, Select, Textarea } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/components/Toast';
import { createProject } from '../../../store/projects';
import {
  fetchProjectManagers,
  selectProjectManagers,
  selectProjectManagersStatus,
} from '../../../store/executive';

const todayInput = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  name: '',
  description: '',
  teamId: '',
  projectManagerId: '',
  status: 'Planning',
  startDate: todayInput(),
  targetDate: '',
});

/**
 * Executive "launch a project" flow: name the initiative, give it to a team and appoint its
 * Project Manager in one step, so the PM sees it in their workspace straight away.
 */
export function CreateProjectModal({ isOpen, teams = [], onClose, onCreated }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const managers = useSelector(selectProjectManagers);
  const managersStatus = useSelector(selectProjectManagersStatus);
  // The page mounts this dialog only while it is open, so every opening starts with a clean form.
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) dispatch(fetchProjectManagers());
  }, [isOpen, dispatch]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 3) return setFormError('Project name needs at least 3 characters.');
    if (!form.teamId) return setFormError('Choose the team that will deliver the project.');
    if (!form.targetDate) return setFormError('Set a target date.');
    if (form.startDate && form.targetDate < form.startDate) {
      return setFormError('The target date cannot be before the start date.');
    }
    if (!form.projectManagerId) {
      return setFormError('Appoint a Project Manager; without one no PM can see or run the project.');
    }
    setFormError('');
    setSaving(true);
    try {
      const project = await dispatch(
        createProject({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          teamId: form.teamId,
          projectManagerId: form.projectManagerId,
          status: form.status,
          startDate: form.startDate || undefined,
          targetDate: form.targetDate,
        }),
      ).unwrap();
      toast.success(`Project "${project?.name || form.name.trim()}" launched.`);
      onCreated?.(project);
      onClose();
    } catch (err) {
      setFormError(err?.message || 'Could not create the project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      title="Launch a New Project"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="exec-create-project-form" disabled={saving}>
            {saving ? 'Creating…' : 'Create Project'}
          </Button>
        </>
      }
    >
      <form id="exec-create-project-form" onSubmit={submit} className="space-y-4">
        {formError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
            {formError}
          </div>
        )}
        <FormField label="Project Name" required>
          <Input value={form.name} onChange={set('name')} placeholder="e.g. FY27 ISO Audit Readiness" disabled={saving} required />
        </FormField>
        <FormField label="Objective / Description">
          <Textarea value={form.description} onChange={set('description')} rows={3} placeholder="What should this project achieve?" disabled={saving} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Delivery Team" required>
            <Select value={form.teamId} onChange={set('teamId')} disabled={saving} required>
              <option value="">Select a team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.branch?.name ? ` · ${t.branch.name}` : ''}
                </option>
              ))}
            </Select>
            {teams.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">No teams yet. Create one under Teams first.</p>
            )}
          </FormField>
          <FormField label="Project Manager" required>
            <Select
              value={form.projectManagerId}
              onChange={set('projectManagerId')}
              disabled={saving || managersStatus === 'loading'}
              required
            >
              <option value="">{managersStatus === 'loading' ? 'Loading…' : 'Select a Project Manager'}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </Select>
            {managersStatus === 'succeeded' && managers.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">Nobody holds the Project Manager role yet.</p>
            )}
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Status">
            <Select value={form.status} onChange={set('status')} disabled={saving}>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
            </Select>
          </FormField>
          <FormField label="Start Date">
            <Input type="date" value={form.startDate} onChange={set('startDate')} disabled={saving} />
          </FormField>
          <FormField label="Target Date" required>
            <Input type="date" value={form.targetDate} min={form.startDate || todayInput()} onChange={set('targetDate')} disabled={saving} required />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}

export default CreateProjectModal;
