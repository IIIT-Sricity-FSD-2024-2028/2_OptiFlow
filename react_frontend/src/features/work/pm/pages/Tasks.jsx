import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Button } from '../../../../shared/components/Button';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { TaskTable } from '../../components/TaskTable';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';

const normalize = (response) => Array.isArray(response) ? response : response?.data || [];

export default function PmTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', projectId: '', assignedToId: '', dueDate: '', priority: 'Medium' });

  useEffect(() => {
    let active = true;
    Promise.all([tasksApi.list(), projectsApi.list(), usersApi.list()])
      .then(([taskResponse, projectResponse, userResponse]) => {
        if (!active) return;
        setTasks(normalize(taskResponse).map((task) => ({
          ...task,
          assigneeName: task.assignedTo?.fullName || task.assignedTo?.email,
        })));
        setProjects(normalize(projectResponse));
        setUsers(normalize(userResponse));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Failed to load task assignment data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const submitTask = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.assignedToId) {
      setError('Enter a task title and select an assignee.');
      return;
    }

    setSaving(true);
    try {
      const response = await tasksApi.create({
        title: form.title.trim(),
        projectId: form.projectId || undefined,
        assignedToId: form.assignedToId,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        status: 'Active',
      });
      const createdTask = response?.data || response;
      setTasks((current) => [{
        ...createdTask,
        assigneeName: createdTask.assignedTo?.fullName || createdTask.assignedTo?.email,
      }, ...current]);
      setForm({ title: '', projectId: '', assignedToId: '', dueDate: '', priority: 'Medium' });
    } catch (saveError) {
      setError(saveError.message || 'Failed to assign task.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-500 mt-1">Create and assign team tasks. Team Leads can break them into subtasks.</p>
      </div>

      <form onSubmit={submitTask} className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Assign a task</h2>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Task title" required>
            <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </FormField>
          <FormField label="Assignee" required>
            <Select value={form.assignedToId} onChange={(event) => setForm((current) => ({ ...current, assignedToId: event.target.value }))}>
              <option value="">Select a team member…</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}
            </Select>
          </FormField>
          <FormField label="Project">
            <Select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}>
              <option value="">No project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Due date">
            <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
          </FormField>
          <FormField label="Priority">
            <Select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
              {['Low', 'Medium', 'High', 'Urgent'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </Select>
          </FormField>
        </div>
        <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Assigning…' : 'Assign task'}</Button>
      </form>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks" description="Tasks assigned by the Project Manager will appear here." />
      ) : (
        <TaskTable
          tasks={tasks}
          visibleColumns={['title', 'assignee', 'priority', 'status', 'dueDate']}
          onRowClick={(task) => navigate(PATHS.PM.TASK_DETAIL.replace(':id', task.id))}
        />
      )}
    </div>
  );
}
