// Modals and the task review drawer used by the PM project page
// (pm/pages/ProjectDetail.jsx). Presentational only: the page owns state and API calls.
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Badge } from '../../../../shared/components/Badge';
import { Button } from '../../../../shared/components/Button';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Modal } from '../../../../shared/components/Modal';
import { todayInput } from '../../components/dateLimits';
import { formatDate } from './formatDate';

export function ComplianceOverviewModal({ isOpen, onClose, projectName, activeTab, onTabChange, rules, violations }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Compliance Overview — ${projectName}`}
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => onTabChange('rules')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Bound Rules ({rules.length})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('violations')}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'violations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Active Violations ({violations.length})
          </button>
        </div>

        {/* Tab 1: Bound Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-3">
            {rules.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No active compliance rules are bound to this project or its team hierarchy.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {rules.map((rule) => {
                  const req = rule.criteria?.requirement;
                  const trigger = rule.criteria?.trigger;
                  return (
                    <div key={rule.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900">{rule.name}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge status={rule.scopeType === 'Company' ? 'default' : 'info'}>
                            {rule.scopeType || 'Project'} Scope
                          </Badge>
                          <Badge status={rule.severity === 'Critical' || rule.severity === 'High' ? 'danger' : 'warning'}>
                            {rule.severity || 'Medium'}
                          </Badge>
                        </div>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-slate-600">{rule.description}</p>
                      )}
                      {req && (
                        <div className="mt-1 rounded bg-slate-50 p-2 text-xs text-slate-700">
                          <span className="font-semibold text-slate-900">Enforcement: </span>
                          {req.type === 'EVIDENCE_REQUIRED' && trigger
                            ? `Requires approved evidence before transition to "${trigger.transitionTo || 'Completed'}"`
                            : rule.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Active Violations */}
        {activeTab === 'violations' && (
          <div>
            {violations.length === 0 ? (
              <p className="text-sm text-slate-600 py-4 text-center">
                This project has no active compliance violations. All rules are satisfied.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {violations.map((violation) => (
                  <div key={violation.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-slate-900">{violation.rule?.name || 'Compliance violation'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {violation.entityType === 'Task' ? violation.entityName || 'Task' : projectName}
                        {' · '}{String(violation.status).replace(/_/g, ' ')}
                      </p>
                    </div>
                    {violation.entityType === 'Task' && (
                      <Link
                        to={PATHS.PM.TASK_DETAIL.replace(':id', violation.entityId)}
                        className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700"
                        onClick={onClose}
                      >
                        View task →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function CreateProjectTaskModal({ isOpen, onClose, onSubmit, saving, error, form, onFormChange }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="+ Create Task"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? 'Creating…' : 'Add Task'}</Button>
        </>
      )}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <FormField label="Task name" required>
          <Input value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} disabled={saving} />
        </FormField>
        <FormField label="Description">
          <Textarea value={form.description} onChange={(event) => onFormChange({ ...form, description: event.target.value })} disabled={saving} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
            This task will be assigned to the project Team Lead automatically.
          </div>
          <FormField label="Priority">
            <Select value={form.priority} onChange={(event) => onFormChange({ ...form, priority: event.target.value })} disabled={saving}>
              {['Low', 'Medium', 'High', 'Urgent'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </Select>
          </FormField>
          <FormField label="Estimated hours">
            <Input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={(event) => onFormChange({ ...form, estimatedHours: event.target.value })} disabled={saving} />
          </FormField>
          <FormField label="Deadline">
            <Input type="date" min={todayInput()} value={form.dueDate} onChange={(event) => onFormChange({ ...form, dueDate: event.target.value })} disabled={saving} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}

export function TaskReviewDrawer({ task, onClose, onApprove, onMarkComplete }) {
  if (!task) return null;
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/40"
        aria-label="Close task details"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Task Review</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">ID: T-{task.id.slice(0, 8)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-200 px-2.5 py-1 text-lg text-slate-600" aria-label="Close">×</button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">{task.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description || 'No task description provided.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</p>
              <Badge status={task.status === 'Completed' ? 'success' : task.status === 'In_Review' ? 'info' : 'default'}>{(task.status || 'Draft').replace(/_/g, ' ')}</Badge>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Priority</p>
              <p className="text-sm font-semibold text-slate-900">{task.priority || 'Medium'}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Assigned to</p>
              <p className="text-sm font-semibold text-slate-900">{task.assignedTo?.fullName || task.assignedTo?.email || 'Unassigned'}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Deadline</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(task.dueDate)}</p>
            </div>
          </div>
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Checklist / Subtasks</h3>
            {task.subtasks?.length ? task.subtasks.map((subtask) => (
              <div key={subtask.id} className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <span className={`text-sm ${subtask.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{subtask.title}</span>
                <Badge>{(subtask.status || 'Draft').replace(/_/g, ' ')}</Badge>
              </div>
            )) : <p className="text-sm text-slate-500">No subtasks found for this task.</p>}
          </section>
        </div>
        <footer className="flex justify-between border-t border-slate-200 p-4 gap-2">
          {task.status !== 'Completed' && (
            <>
              {task.status === 'In_Review' || task.status === 'Pending_TL_Review' ? (
                <Button
                  variant="primary"
                  onClick={() => onApprove(task)}
                  className="flex-1"
                >
                  ✓ Approve & Mark Complete
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => onMarkComplete(task)}
                  className="flex-1"
                >
                  Mark as Complete
                </Button>
              )}
            </>
          )}
          {task.status === 'Completed' && (
            <span className="flex-1 text-center text-sm font-semibold text-emerald-600">✓ Task Completed</span>
          )}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </footer>
      </aside>
    </>
  );
}
