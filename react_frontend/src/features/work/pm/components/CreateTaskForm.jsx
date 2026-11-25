// "Create Project Task" card used by the PM task page (pm/pages/Tasks.jsx).
// Presentational only: the page owns the form state and the API call.
import { Button } from '../../../../shared/components/Button';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { todayInput } from '../../components/dateLimits';

export function CreateTaskForm({
  onClose,
  onSubmit,
  error,
  saving,
  form,
  onFormChange,
  projects,
  onProjectSelect,
  selectedProject,
  teamLeads,
  projectTeamLeadIds,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-200 ring-1 ring-slate-900/5">
      {/* Card Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Create Project Task</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Define deliverables, set milestones, and assign to a Team Lead.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
          title="Close form"
        >
          <X size={18} />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={onSubmit} className="p-6 space-y-5">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 flex items-start gap-3 text-xs text-rose-800 font-medium">
            <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-900">Task Creation Error</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Task Title */}
          <FormField label="Task Title" required hint="Actionable outcome for the delivery team">
            <Input
              placeholder="e.g. Implement OAuth token refresh & session revocation"
              value={form.title}
              onChange={(event) => onFormChange((c) => ({ ...c, title: event.target.value }))}
              required
            />
          </FormField>

          {/* Project & Team Lead Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Target Project"
              required
              hint={
                selectedProject?.team?.name
                  ? `Assigned Squad: ${selectedProject.team.name}`
                  : 'Select the project to assign this task under'
              }
            >
              <Select
                value={form.projectId}
                onChange={(e) => onProjectSelect(e.target.value)}
                required
              >
                <option value="">Select project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.team?.name ? `(${project.team.name})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Assigned Team Lead"
              required
              hint={
                form.assignedToId
                  ? 'Team Lead responsible for subtask delegation & delivery reviews'
                  : 'Choose the Team Lead who will manage this task'
              }
            >
              <Select
                value={form.assignedToId}
                onChange={(e) => onFormChange((c) => ({ ...c, assignedToId: e.target.value }))}
                required
              >
                <option value="">Select Team Lead...</option>
                {teamLeads.map((tl) => (
                  <option key={tl.id} value={tl.id}>
                    {tl.fullName || tl.email} ({tl.email}) {projectTeamLeadIds.has(tl.id) ? '★ Project Lead' : ''}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Priority, Due Date, Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Priority">
              <Select
                value={form.priority}
                onChange={(event) => onFormChange((c) => ({ ...c, priority: event.target.value }))}
              >
                {['Low', 'Medium', 'High', 'Urgent'].map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Target Due Date"
              hint={
                selectedProject?.targetDate
                  ? `Must be on or before ${String(selectedProject.targetDate).slice(0, 10)}`
                  : undefined
              }
            >
              <Input
                type="date"
                min={selectedProject?.startDate && String(selectedProject.startDate).slice(0, 10) > todayInput() ? String(selectedProject.startDate).slice(0, 10) : todayInput()}
                max={selectedProject?.targetDate ? String(selectedProject.targetDate).slice(0, 10) : undefined}
                value={form.dueDate}
                onChange={(event) => onFormChange((c) => ({ ...c, dueDate: event.target.value }))}
              />
            </FormField>

            <FormField label="Est. Hours (Optional)">
              <Input
                type="number"
                min="1"
                placeholder="e.g. 40"
                value={form.estimatedHours}
                onChange={(event) => onFormChange((c) => ({ ...c, estimatedHours: event.target.value }))}
              />
            </FormField>
          </div>

          {/* Description / Objectives */}
          <FormField label="Scope & Acceptance Criteria (Optional)">
            <Textarea
              rows={2}
              placeholder="Outline key deliverables, compliance guardrails, or technical constraints..."
              value={form.description}
              onChange={(event) => onFormChange((c) => ({ ...c, description: event.target.value }))}
            />
          </FormField>
        </div>

        {/* Footer with clean action buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-[11px] text-slate-400">
            Task will appear immediately in the selected Team Lead's review queue.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Creating Task…' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
