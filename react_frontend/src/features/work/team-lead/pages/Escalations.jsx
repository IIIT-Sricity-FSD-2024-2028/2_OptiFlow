import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { Toast } from '../../../../shared/components/Toast';
import * as escalationsApi from '../../../../services/api/escalations';
import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';

const BLOCKER_TYPES = [
  'Access / permission',
  'Dependency delay',
  'Awaiting approval',
  'System outage / bug',
  'Unclear requirements',
  'Technical issue',
  'Other',
];
const normalize = (response) => Array.isArray(response) ? response : response?.data || [];

export default function TeamLeadEscalations() {
  const { user } = useAuth();
  const [escalations, setEscalations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamUserIds, setTeamUserIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    taskId: '',
    title: '',
    blockerType: BLOCKER_TYPES[0],
    priority: 'Medium',
    description: '',
  });
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([escalationsApi.list(), tasksApi.list(), usersApi.list()])
      .then(([escalationResponse, taskResponse, userResponse]) => {
        if (!active) return;
        setEscalations(normalize(escalationResponse));
        setTasks(normalize(taskResponse));
        const reports = normalize(userResponse)
          .filter((member) => String(member.managerUserId || member.managerId || '') === String(user.id))
          .map((member) => String(member.id || member.userId));
        setTeamUserIds([String(user.id), ...reports]);
      })
      .catch((error) => {
        if (active) showToast('error', error.message || 'Failed to load escalation data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user.id]);

  const teamEscalations = escalations.filter((escalation) => {
    const reporterId = escalation.reportedById || escalation.reportedBy?.id;
    return reporterId && teamUserIds.includes(String(reporterId));
  });

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.taskId || form.title.trim().length < 5) {
      showToast('error', 'Select a task and enter an issue title of at least 5 characters.');
      return;
    }

    setCreating(true);
    try {
      const response = await escalationsApi.create({
        taskId: form.taskId,
        title: form.title.trim(),
        blockerType: form.blockerType,
        priority: form.priority,
        description: form.description.trim() || undefined,
      });
      setEscalations((current) => [response?.data || response, ...current]);
      setForm({ taskId: '', title: '', blockerType: BLOCKER_TYPES[0], priority: 'Medium', description: '' });
      showToast('success', 'Escalation sent to the Project Manager.');
    } catch (error) {
      showToast('error', error.message || 'Failed to send escalation.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader />
          <p className="text-sm text-gray-500">Loading team escalations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Escalations</h1>
        <p className="text-gray-500 mt-1">Raise blockers to the Project Manager and follow your team’s reports.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-5 py-4 bg-amber-50 border-b border-amber-200">
            <h2 className="font-semibold text-amber-800">Escalate to PM</h2>
            <p className="text-xs text-gray-600 mt-1">Escalate a dependency, outage, or other blocker to the Project Manager.</p>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <FormField label="Task" required>
              <Select
                value={form.taskId}
                onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))}
                disabled={creating}
              >
                <option value="">Select a team task…</option>
                {tasks.map((task) => <option key={task.id} value={task.id}>{task.title || `Task #${task.id}`}</option>)}
              </Select>
            </FormField>
            <FormField label="Issue title" required>
              <Input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Brief description of the blocker"
                minLength={5}
                disabled={creating}
              />
            </FormField>
            <FormField label="Blocker type">
              <Select
                value={form.blockerType}
                onChange={(event) => setForm((current) => ({ ...current, blockerType: event.target.value }))}
                disabled={creating}
              >
                {BLOCKER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
              <FormField label="Priority">
                <Select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                  disabled={creating}
                >
                  {['High', 'Medium', 'Low'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </Select>
              </FormField>
              <Button type="submit"  variant="primary" disabled={creating || !form.taskId || form.title.trim().length < 5} 
              className="transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:hover:scale-100 disabled:hover:shadow-none">
                {creating ? 'Sending…' : 'Send escalation' }
              </Button>
            </div>
            <FormField label="Details">
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Add context to help the Project Manager resolve the blocker."
                disabled={creating}
              />
            </FormField>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Team escalation watch</h2>
            <p className="text-xs text-gray-500 mt-1">Blockers reported by you and your team members.</p>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
            {teamEscalations.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No team escalations" description="When your team reports blockers, they will appear here." />
              </div>
            ) : teamEscalations.map((escalation) => {
              const status = String(escalation.status || 'Open');
              const isClosed = ['Resolved', 'Closed'].includes(status);
              const task = escalation.task || tasks.find((item) => String(item.id) === String(escalation.taskId));
              const taskPath = task?.id
                ? PATHS.TEAM_LEAD.TASK_DETAIL.replace(':id', task.id)
                : null;
              return (
                <article key={escalation.id} className={`p-4 ${!isClosed ? 'bg-rose-50/50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{escalation.title || 'Untitled escalation'}</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        {escalation.createdAt
                          ? new Date(escalation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : 'Date unavailable'}
                        {' · '}{escalation.blockerType || 'Blocker'}
                        {escalation.reportedBy?.fullName && ` · ${escalation.reportedBy.fullName}`}
                      </p>
                    </div>
                    <Badge status={isClosed ? 'success' : status === 'Reviewed' ? 'info' : 'warning'}>{status}</Badge>
                  </div>
                  {escalation.description && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{escalation.description}</p>}
                  {taskPath && (
                    <Link to={taskPath} className="inline-block mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                      View task →
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <Toast visible={toast.visible} type={toast.type} message={toast.message} onClose={() => setToast((current) => ({ ...current, visible: false }))} />
    </div>
  );
}
