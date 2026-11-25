import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { FormField, Select } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/components/Toast';
import {
  assignProjectManager,
  fetchProjectManagers,
  selectProjectManagers,
  selectProjectManagersStatus,
  selectIsAssigningPm,
} from '../../../store/executive';

/**
 * Appoint or replace the Project Manager of one project.
 * `project` needs { id, name, projectManager? }. Calls onAssigned(projectManager) on success.
 * Mount it only while it is open (it keeps no state between projects).
 */
export function AssignManagerModal({ project, onClose, onAssigned }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const managers = useSelector(selectProjectManagers);
  const managersStatus = useSelector(selectProjectManagersStatus);
  const saving = useSelector(selectIsAssigningPm(project?.id));
  // The parent mounts this modal per project, so the initial value is enough (no reset effect).
  const [managerId, setManagerId] = useState(project?.projectManager?.id || '');

  useEffect(() => {
    dispatch(fetchProjectManagers());
  }, [dispatch]);

  if (!project) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!managerId) return;
    try {
      const result = await dispatch(
        assignProjectManager({ projectId: project.id, projectManagerId: managerId }),
      ).unwrap();
      toast.success(`${result?.projectManager?.fullName || 'Project Manager'} now manages "${project.name}".`);
      onAssigned?.(result?.projectManager);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not assign the Project Manager.');
    }
  };

  const unchanged = managerId && managerId === project.projectManager?.id;

  return (
    <Modal
      isOpen
      onClose={saving ? undefined : onClose}
      title={project.projectManager ? 'Change Project Manager' : 'Assign Project Manager'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="assign-pm-form" disabled={saving || !managerId || unchanged}>
            {saving ? 'Saving…' : 'Assign'}
          </Button>
        </>
      }
    >
      <form id="assign-pm-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          The Project Manager plans and approves the work in <strong>{project.name}</strong>. Only
          the assigned PM (or the PM of its team) sees the project in their workspace.
        </p>
        <FormField label="Project Manager" required>
          <Select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            disabled={saving || managersStatus === 'loading'}
            required
          >
            <option value="">
              {managersStatus === 'loading' ? 'Loading managers…' : 'Select a Project Manager'}
            </option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
                {m.email ? ` · ${m.email}` : ''}
              </option>
            ))}
          </Select>
        </FormField>
        {managersStatus === 'succeeded' && managers.length === 0 && (
          <p className="text-xs text-amber-700" role="status">
            Nobody holds the Project Manager role yet. Give someone that role under People &amp; Roles first.
          </p>
        )}
      </form>
    </Modal>
  );
}

export default AssignManagerModal;
