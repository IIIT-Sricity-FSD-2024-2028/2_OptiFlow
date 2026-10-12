import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Select } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Table } from '../../../../shared/components/Table';
import { Toast } from '../../../../shared/components/Toast';
import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';

const normalize = (response) => response?.data || response;
const STATUSES = ['Draft', 'Active', 'In_Review', 'Blocked', 'Completed', 'Cancelled'];
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—';

export default function PmTaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
