import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Table } from '../../../../shared/components/Table';
import { Toast } from '../../../../shared/components/Toast';
import { Button } from '../../../../shared/components/Button';
import { Modal } from '../../../../shared/components/Modal';
import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';
import * as complianceApi from '../../../../services/api/compliance';

const normalize = (response) => response?.data || response;
const STATUSES = ['Draft', 'Active', 'In_Review', 'Blocked', 'Completed', 'Cancelled'];
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—';

export default function PmTaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([tasksApi.get(id), usersApi.list()])
      .then(([taskResponse, usersResponse]) => {
        if (!active) return;
        setTask(normalize(taskResponse));
        setUsers(Array.isArray(usersResponse) ? usersResponse : usersResponse?.data || []);
      })
      .catch((error) => {
        if (active) showToast('error', error.message || 'Failed to load task details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    complianceApi.getViolations()
      .then((response) => {
        if (active) setViolations(Array.isArray(response) ? response : response?.data || []);
      })
      .catch((error) => {
        if (active) showToast('error', error.message || 'Failed to load compliance status.');
      });
    return () => { active = false; };
  }, [id]);

  const updateTask = async (patch) => {
    setSaving(true);
    try {
      const response = await tasksApi.update(id, patch);
      setTask((current) => ({ ...current, ...normalize(response), ...patch }));
      showToast('success', 'Task updated.');
    } catch (error) {
      showToast('error', error.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;
  if (!task) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Link to={PATHS.PM.TASKS} className="text-sm text-blue-600 hover:text-blue-700">← Tasks</Link>
        <EmptyState title="Task not found" description="This task is not available." />
      </div>
    );
  }

  const projectLink = task.project?.id ? PATHS.PM.PROJECT_DETAIL.replace(':id', task.project.id) : null;
  const subtasks = task.subtasks || [];
  const escalations = task.escalations || [];
  const activeTaskViolations = violations.filter((violation) => (
    violation.entityType === 'Task'
    && String(violation.entityId) === String(id)
    && ['Open', 'Under_Review'].includes(violation.status)
  ));
  const complianceBlocked = activeTaskViolations.length > 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

  const grantExtension = async () => {
    const reason = extensionReason.trim();
    const proposedDeadline = new Date(extensionDate);
    if (!extensionDate || !reason || proposedDeadline <= new Date()) {
      showToast('error', 'Choose a future deadline and enter a reason.');
      return;
    }
    if (task.dueDate && proposedDeadline <= new Date(task.dueDate)) {
      showToast('error', 'The new deadline must be later than the current deadline.');
      return;
    }
    setSaving(true);
    try {
      const response = await tasksApi.update(id, {
        dueDate: extensionDate,
        deadlineExtensionReason: reason,
      });
      setTask((current) => ({ ...current, ...normalize(response), dueDate: extensionDate }));
      setViolations((current) => current.map((violation) => (
        violation.entityType === 'Task'
        && String(violation.entityId) === String(id)
        && violation.rule?.name?.toLowerCase().includes('overdue')
          ? { ...violation, status: 'Resolved' }
          : violation
      )));
      showToast('success', 'Deadline extended and overdue violations cleared.');
      setExtensionOpen(false);
      setExtensionDate('');
      setExtensionReason('');
    } catch (error) {
      showToast('error', error.message || 'Failed to extend deadline.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Link to={PATHS.PM.TASKS} className="text-sm font-medium text-blue-600 hover:text-blue-700">← All Tasks</Link>

      <header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
              <Badge status={task.status === 'Completed' ? 'success' : task.status === 'Blocked' ? 'danger' : task.status === 'Active' ? 'info' : 'default'}>
                {String(task.status || 'Draft').replace(/_/g, ' ')}
              </Badge>
              {complianceBlocked && <Badge status="danger">⚠ Blocked by Compliance</Badge>}
            </div>
            {projectLink ? (
              <Link to={projectLink} className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700">{task.project.name}</Link>
            ) : <p className="mt-2 text-sm text-gray-500">No linked project</p>}
          </div>
          <div className="grid w-full gap-4 sm:w-auto sm:grid-cols-2">
            <FormField label="Task status">
              <Select value={task.status || 'Draft'} onChange={(event) => updateTask({ status: event.target.value })} disabled={saving}>
                {STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
              </Select>
            </FormField>
            <FormField label="Assignee">
              <Select value={task.assignedToId || ''} onChange={(event) => updateTask({ assignedToId: event.target.value || null })} disabled={saving}>
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}
              </Select>
            </FormField>
          </div>
        </div>
        {saving && <p className="mt-3 text-xs text-gray-500">Saving changes…</p>}
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-900">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{task.description || 'No description provided.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
            <div><p className="text-xs font-semibold uppercase text-gray-500">Priority</p><p className="mt-1 text-sm text-gray-900">{task.priority || 'Medium'}</p></div>
            <div><p className="text-xs font-semibold uppercase text-gray-500">Due date</p><p className="mt-1 text-sm text-gray-900">{formatDate(task.dueDate)}</p></div>
            <div><p className="text-xs font-semibold uppercase text-gray-500">Created by</p><p className="mt-1 text-sm text-gray-900">{task.createdBy?.fullName || '—'}</p></div>
            <div><p className="text-xs font-semibold uppercase text-gray-500">Completed</p><p className="mt-1 text-sm text-gray-900">{formatDate(task.completedAt)}</p></div>
          </div>
          {isOverdue && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-sm text-amber-800">This overdue task may have an active compliance violation.</p>
              <Button variant="warning" onClick={() => setExtensionOpen(true)}>Grant deadline extension</Button>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Work summary</h2>
          <div><p className="text-xs font-semibold uppercase text-gray-500">Subtasks</p><p className="mt-1 text-2xl font-bold text-gray-900">{subtasks.length}</p></div>
          <div><p className="text-xs font-semibold uppercase text-gray-500">Open escalations</p><p className="mt-1 text-2xl font-bold text-gray-900">{escalations.filter((item) => !['Resolved', 'Closed'].includes(item.status)).length}</p></div>
          {projectLink && <Link to={projectLink} className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700">View project →</Link>}
          <Link to={PATHS.PM.ESCALATIONS} className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Escalation inbox →</Link>
        </aside>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Subtasks</h2>
        </div>
        {subtasks.length ? (
          <Table
            columns={[
              { key: 'title', header: 'Title', accessor: 'title' },
              { key: 'assignee', header: 'Assignee', render: (subtask) => subtask.assignedTo?.fullName || '—' },
              { key: 'status', header: 'Status', render: (subtask) => <Badge status={subtask.status === 'Completed' ? 'success' : 'info'}>{String(subtask.status || 'Draft').replace(/_/g, ' ')}</Badge> },
              { key: 'dueDate', header: 'Due date', render: (subtask) => formatDate(subtask.dueDate) },
            ]}
            data={subtasks}
          />
        ) : <div className="p-5"><EmptyState title="No subtasks" description="This task has no subtasks yet." /></div>}
      </section>

      <Modal
        isOpen={extensionOpen}
        onClose={() => setExtensionOpen(false)}
        title="Grant deadline extension"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setExtensionOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={grantExtension} disabled={saving}>{saving ? 'Saving…' : 'Grant extension'}</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">The new deadline and reason will be recorded in the task audit history.</p>
          <FormField label="New deadline" required>
            <Input type="date" value={extensionDate} onChange={(event) => setExtensionDate(event.target.value)} />
          </FormField>
          <FormField label="Reason" required>
            <Textarea value={extensionReason} onChange={(event) => setExtensionReason(event.target.value)} rows={4} placeholder="Explain why the deadline is being extended." />
          </FormField>
        </div>
      </Modal>

      {escalations.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Task escalations</h2>
          {escalations.map((escalation) => (
            <div key={escalation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-100 p-3">
              <div><p className="font-medium text-gray-900">{escalation.title}</p><p className="mt-1 text-xs text-gray-500">{escalation.blockerType || 'Blocker'}</p></div>
              <Badge status={['Resolved', 'Closed'].includes(escalation.status) ? 'success' : 'warning'}>{escalation.status || 'Open'}</Badge>
            </div>
          ))}
        </section>
      )}

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast((current) => ({ ...current, visible: false }))} />
    </div>
  );
}
