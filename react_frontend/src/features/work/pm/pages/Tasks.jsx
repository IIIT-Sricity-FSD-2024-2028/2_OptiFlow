import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Button } from '../../../../shared/components/Button';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select, Textarea } from '../../../../shared/components/FormField';
import { Loader } from '../../../../shared/components/Loader';
import { TaskTable } from '../../components/TaskTable';
import { Pagination } from '../../../../shared/components/Pagination';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ListFilter, 
  Plus, 
  X, 
  Search,
  RotateCcw,
  UserCheck
} from 'lucide-react';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as complianceApi from '../../../../services/api/compliance';
import * as usersApi from '../../../../services/api/users';

const normalize = (response) => Array.isArray(response) ? response : response?.data || [];
const PAGE_SIZE = 10;

export default function PmTasks() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get('filter') || 'all';
  const selectedProjectParam = searchParams.get('projectId') || 'all';

  const [tasks, setTasks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [complianceError, setComplianceError] = useState('');
  const [complianceBlockedIds, setComplianceBlockedIds] = useState(new Set());
  
  // Interactive filters
  const [searchQuery, setSearchQuery] = useState('');
  const selectedProjectId = selectedProjectParam;
  const [showAssignForm, setShowAssignForm] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedToId: '',
    dueDate: '',
    estimatedHours: '',
    priority: 'Medium',
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      tasksApi.list(),
      projectsApi.list(),
      usersApi.list().catch(() => []),
    ])
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
        if (active) setError(loadError.message || 'Failed to load task data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    complianceApi.getViolations()
      .then((response) => {
        if (!active) return;
        const violations = normalize(response).filter((violation) => (
          ['Open', 'Under_Review'].includes(violation.status) && violation.entityType === 'Task'
        ));
        setComplianceBlockedIds(new Set(violations.map((violation) => String(violation.entityId))));
      })
      .catch((loadError) => {
        if (active) setComplianceError(loadError.message || 'Failed to load compliance status.');
      });
    return () => { active = false; };
  }, []);

  const selectedProjectForForm = useMemo(() => {
    if (!form.projectId) return null;
    return projects.find((p) => String(p.id) === String(form.projectId)) || null;
  }, [form.projectId, projects]);

  // Extract designated Team Leads from the selected project's squad
  const projectTeamLeads = useMemo(() => {
    if (!selectedProjectForForm?.team?.teamMembers) return [];
    return selectedProjectForForm.team.teamMembers
      .filter((m) => /lead/i.test(m.role || ''))
      .map((m) => m.user)
      .filter(Boolean);
  }, [selectedProjectForForm]);

  const projectTeamLeadIds = useMemo(() => {
    return new Set(projectTeamLeads.map((tl) => tl.id));
  }, [projectTeamLeads]);

  // Extract all active Team Leads across the company
  const allTeamLeads = useMemo(() => {
    return users.filter((u) => {
      const hasTlRole = (u.roleAssignments || []).some((ra) => {
        const name = (ra.role?.label || ra.role?.name || '').toLowerCase();
        return name.includes('lead') || name.includes('team_lead');
      });
      const hasTlTitle = (u.jobTitle || '').toLowerCase().includes('lead');
      const hasTlTeamRole = (u.teamMembers || []).some((tm) => (tm.role || '').toLowerCase().includes('lead'));
      return hasTlRole || hasTlTitle || hasTlTeamRole;
    });
  }, [users]);

  // Combined list with project leads prioritized at the top
  const availableTeamLeads = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const tl of projectTeamLeads) {
      if (tl?.id && !seen.has(tl.id)) {
        seen.add(tl.id);
        result.push(tl);
      }
    }
    for (const tl of allTeamLeads) {
      if (tl?.id && !seen.has(tl.id)) {
        seen.add(tl.id);
        result.push(tl);
      }
    }
    return result;
  }, [projectTeamLeads, allTeamLeads]);

  // Helper when user selects a project: pre-fill primary Team Lead
  const handleProjectSelect = (newProjectId) => {
    const proj = projects.find((p) => String(p.id) === String(newProjectId));
    const projTl = proj?.team?.teamMembers?.find((m) => /lead/i.test(m.role || ''))?.user;
    setForm((current) => ({
      ...current,
      projectId: newProjectId,
      assignedToId: projTl?.id || current.assignedToId || '',
    }));
  };

  const submitTask = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.projectId) {
      setError('Enter a task title and select a target project.');
      return;
    }

    setSaving(true);
    try {
      const response = await tasksApi.create({
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        projectId: form.projectId,
        assignedToId: form.assignedToId || undefined,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        priority: form.priority,
        status: 'Active',
      });
      const createdTask = response?.data || response;
      setTasks((current) => [{
        ...createdTask,
        assigneeName: createdTask.assignedTo?.fullName || createdTask.assignedTo?.email,
      }, ...current]);
      setForm({
        title: '',
        description: '',
        projectId: '',
        assignedToId: '',
        dueDate: '',
        estimatedHours: '',
        priority: 'Medium',
      });
      setShowAssignForm(false);
    } catch (saveError) {
      setError(saveError.message || 'Failed to create task.');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (filterKey) => {
    const nextParams = new URLSearchParams(searchParams);
    if (filterKey === 'all') {
      nextParams.delete('filter');
    } else {
      nextParams.set('filter', filterKey);
    }
    setSearchParams(nextParams);
    setCurrentPage(1);
  };

  const handleProjectFilterChange = (projectId) => {
    const nextParams = new URLSearchParams(searchParams);
    if (projectId === 'all') {
      nextParams.delete('projectId');
    } else {
      nextParams.set('projectId', projectId);
    }
    setSearchParams(nextParams);
    setCurrentPage(1);
  };

  // Tag every task with its compliance status & overdue status
  const taskRows = useMemo(() => {
    const now = new Date();
    return tasks.map((task) => {
      const isBlocked = complianceBlockedIds.has(String(task.id));
      const isOverdue = task.dueDate && new Date(task.dueDate) < now && !['Completed', 'Cancelled'].includes(task.status);
      return {
        ...task,
        complianceBlocked: isBlocked,
        isOverdue: !!isOverdue,
      };
    });
  }, [tasks, complianceBlockedIds]);

  // Metric counts for filter pills
  const counts = useMemo(() => {
    return {
      all: taskRows.length,
      compliance_blocked: taskRows.filter((t) => t.complianceBlocked).length,
      overdue: taskRows.filter((t) => t.isOverdue).length,
      active: taskRows.filter((t) => ['Active', 'In_Progress'].includes(t.status)).length,
      in_review: taskRows.filter((t) => ['In_Review', 'Pending_TL_Review'].includes(t.status)).length,
      completed: taskRows.filter((t) => t.status === 'Completed').length,
    };
  }, [taskRows]);

  // Filtered dataset
  const filteredTasks = useMemo(() => {
    return taskRows.filter((task) => {
      // 1. Category Tab Filter
      if (activeFilter === 'compliance_blocked' && !task.complianceBlocked) return false;
      if (activeFilter === 'overdue' && !task.isOverdue) return false;
      if (activeFilter === 'active' && !['Active', 'In_Progress'].includes(task.status)) return false;
      if (activeFilter === 'in_review' && !['In_Review', 'Pending_TL_Review'].includes(task.status)) return false;
      if (activeFilter === 'completed' && task.status !== 'Completed') return false;

      // 2. Project Filter
      if (selectedProjectId !== 'all' && String(task.projectId) !== String(selectedProjectId)) {
        return false;
      }

      // 3. Search Query Filter (title or assignee)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = String(task.title || '').toLowerCase().includes(query);
        const matchesAssignee = String(task.assigneeName || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesAssignee) return false;
      }

      return true;
    });
  }, [taskRows, activeFilter, selectedProjectId, searchQuery]);

  // Pagination slice (10 per page)
  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filteredTasks, currentPage]);

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header with Title and Professional Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Task Command Center</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor delivery health, triage compliance blockers, and create team tasks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAssignForm((prev) => {
              const nextVal = !prev;
              if (nextVal && selectedProjectId && selectedProjectId !== 'all') {
                handleProjectSelect(selectedProjectId);
              }
              return nextVal;
            });
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs ${
            showAssignForm
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              : 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-2 focus:ring-slate-900/20'
          }`}
        >
          {showAssignForm ? (
            <>
              <X size={16} />
              <span>Close Form</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Create Task</span>
            </>
          )}
        </button>
      </div>

      {/* Enterprise Create Task Modal / Card */}
      {showAssignForm && (
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
              onClick={() => {
                setShowAssignForm(false);
                setError('');
              }}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              title="Close form"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={submitTask} className="p-6 space-y-5">
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
                  onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))}
                  required
                />
              </FormField>

              {/* Project & Team Lead Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField 
                  label="Target Project" 
                  required
                  hint={
                    selectedProjectForForm?.team?.name
                      ? `Assigned Squad: ${selectedProjectForForm.team.name}`
                      : 'Select the project to assign this task under'
                  }
                >
                  <Select
                    value={form.projectId}
                    onChange={(e) => handleProjectSelect(e.target.value)}
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
                    onChange={(e) => setForm((c) => ({ ...c, assignedToId: e.target.value }))}
                    required
                  >
                    <option value="">Select Team Lead...</option>
                    {availableTeamLeads.map((tl) => (
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
                    onChange={(event) => setForm((c) => ({ ...c, priority: event.target.value }))}
                  >
                    {['Low', 'Medium', 'High', 'Urgent'].map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </Select>
                </FormField>

                <FormField label="Target Due Date">
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((c) => ({ ...c, dueDate: event.target.value }))}
                  />
                </FormField>

                <FormField label="Est. Hours (Optional)">
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 40"
                    value={form.estimatedHours}
                    onChange={(event) => setForm((c) => ({ ...c, estimatedHours: event.target.value }))}
                  />
                </FormField>
              </div>

              {/* Description / Objectives */}
              <FormField label="Scope & Acceptance Criteria (Optional)">
                <Textarea
                  rows={2}
                  placeholder="Outline key deliverables, compliance guardrails, or technical constraints..."
                  value={form.description}
                  onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))}
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
                  onClick={() => {
                    setShowAssignForm(false);
                    setError('');
                  }}
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
      )}

      {/* Unified Professional Filter Pills (No Carnival Saturated Colors) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'all', label: 'All Tasks', icon: ListFilter, count: counts.all },
          { key: 'compliance_blocked', label: 'Compliance Blocked', icon: ShieldAlert, count: counts.compliance_blocked, hasAlert: counts.compliance_blocked > 0 },
          { key: 'overdue', label: 'Overdue', icon: AlertTriangle, count: counts.overdue, hasAlert: counts.overdue > 0 },
          { key: 'active', label: 'Active', icon: Clock, count: counts.active },
          { key: 'in_review', label: 'In Review', icon: Clock, count: counts.in_review },
          { key: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <TabIcon
                size={14}
                className={
                  isActive
                    ? 'text-white'
                    : tab.hasAlert
                    ? 'text-amber-500'
                    : 'text-slate-400'
                }
              />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-slate-200'
                    : tab.hasAlert
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Project Dropdown + Real-Time Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectFilterChange(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium outline-none focus:border-slate-400 focus:bg-white transition-colors"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          {/* Search Box with Lucide Search & Clear */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or assignee…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 bg-slate-50 text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary & Quick Reset */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Showing {filteredTasks.length} of {taskRows.length} tasks</span>
          {(activeFilter !== 'all' || selectedProjectId !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                handleProjectFilterChange('all');
                handleTabChange('all');
              }}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold ml-1 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Compliance Warning Banner if filter is active */}
      {activeFilter === 'compliance_blocked' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <ShieldAlert size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                Filtered: Compliance-Blocked Tasks ({filteredTasks.length})
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These tasks have unresolved policy violations or pending evidence submissions preventing completion.
              </p>
            </div>
          </div>
        </div>
      )}

      {complianceError && <p className="text-sm text-amber-700" role="status">{complianceError}</p>}

      {/* Main Task List with TaskTable and Pagination */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks match the active filters"
          description="Try selecting a different filter tab, clearing the project selection, or adjusting your search query."
        />
      ) : (
        <div className="space-y-4">
          <TaskTable
            tasks={paginatedTasks}
            visibleColumns={['title', 'assignee', 'priority', 'status', 'dueDate']}
            onRowClick={(task) => navigate(PATHS.PM.TASK_DETAIL.replace(':id', task.id))}
          />
          <Pagination
            currentPage={currentPage}
            totalItems={filteredTasks.length}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}
