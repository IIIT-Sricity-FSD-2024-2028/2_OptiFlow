import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Button } from '../../../../shared/components/Button';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FormField, Input, Select } from '../../../../shared/components/FormField';
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
  RotateCcw
} from 'lucide-react';
import * as projectsApi from '../../../../services/api/projects';
import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';
import * as complianceApi from '../../../../services/api/compliance';

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
  const [selectedProjectId, setSelectedProjectId] = useState(selectedProjectParam);
  const [showAssignForm, setShowAssignForm] = useState(false);

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

  // Update selectedProjectId if query param changes
  useEffect(() => {
    setSelectedProjectId(selectedProjectParam);
  }, [selectedProjectParam]);

  const selectedProjectForForm = useMemo(() => {
    if (!form.projectId) return null;
    return projects.find((p) => String(p.id) === String(form.projectId)) || null;
  }, [form.projectId, projects]);

  const eligibleAssignees = useMemo(() => {
    if (!selectedProjectForForm) {
      return users.map((u) => ({
        id: u.id,
        name: u.fullName || u.email,
        detail: u.jobTitle || 'Team Member',
      }));
    }

    const team = selectedProjectForForm.team;
    const teamMembers = team?.teamMembers || [];

    if (teamMembers.length > 0) {
      const memberRoleMap = new Map();
      teamMembers.forEach((tm) => {
        memberRoleMap.set(String(tm.userId), tm.role || 'Member');
      });

      const matched = users
        .filter((u) => memberRoleMap.has(String(u.id)))
        .map((u) => ({
          id: u.id,
          name: u.fullName || u.email,
          detail: `${team.name ? `${team.name} · ` : ''}${memberRoleMap.get(String(u.id))}`,
        }));

      if (matched.length > 0) {
        return matched;
      }
    }

    // Fallback if no specific members assigned yet
    return users.map((u) => ({
      id: u.id,
      name: u.fullName || u.email,
      detail: u.jobTitle || 'Team Member',
    }));
  }, [selectedProjectForForm, users]);

  const handleFormProjectChange = (e) => {
    const nextProjectId = e.target.value;
    setForm((current) => {
      if (!nextProjectId) {
        return { ...current, projectId: '' };
      }
      const targetProject = projects.find((p) => String(p.id) === String(nextProjectId));
      const targetMembers = targetProject?.team?.teamMembers || [];
      const targetMemberIds = new Set(targetMembers.map((tm) => String(tm.userId)));
      
      const shouldKeepAssignee = targetMemberIds.size === 0 || targetMemberIds.has(String(current.assignedToId));
      return {
        ...current,
        projectId: nextProjectId,
        assignedToId: shouldKeepAssignee ? current.assignedToId : '',
      };
    });
  };

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
      setShowAssignForm(false);
    } catch (saveError) {
      setError(saveError.message || 'Failed to assign task.');
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
    setSelectedProjectId(projectId);
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
            Monitor delivery health, triage compliance blockers, and assign workload.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAssignForm((prev) => {
              const nextVal = !prev;
              if (nextVal && selectedProjectId && selectedProjectId !== 'all') {
                setForm((f) => ({ ...f, projectId: selectedProjectId }));
              }
              return nextVal;
            });
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
            showAssignForm
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20'
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
              <span>Assign New Task</span>
            </>
          )}
        </button>
      </div>

      {/* Expandable Task Assignment Form */}
      {showAssignForm && (
        <form onSubmit={submitTask} className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-5 space-y-4 shadow-sm transition-all">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">
                +
              </span>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Assign a New Task</h2>
                <p className="text-[11px] text-gray-500">
                  Assign task to team members assigned to the selected project.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAssignForm(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              title="Close form"
            >
              <X size={16} />
            </button>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Task title" required>
                <Input
                  placeholder="e.g. Implement OAuth token refresh"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </FormField>
            </div>
            <FormField 
              label="Project" 
              hint={
                selectedProjectForForm?.team?.name
                  ? `Assigned Team: ${selectedProjectForForm.team.name}`
                  : 'Select a project to narrow assignees to its team members'
              }
            >
              <Select
                value={form.projectId}
                onChange={handleFormProjectChange}
              >
                <option value="">No project (General / Unassigned)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.team?.name ? `(${project.team.name})` : ''}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField 
              label="Assignee" 
              required
              hint={
                selectedProjectForForm?.team?.name
                  ? `Showing ${eligibleAssignees.length} member(s) of ${selectedProjectForForm.team.name}`
                  : 'No project selected: showing all available company users'
              }
            >
              <Select
                value={form.assignedToId}
                onChange={(event) => setForm((current) => ({ ...current, assignedToId: event.target.value }))}
              >
                <option value="">
                  {selectedProjectForForm?.team?.name
                    ? `Select a member from ${selectedProjectForForm.team.name}…`
                    : 'Select a team member…'}
                </option>
                {eligibleAssignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.detail})
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Due date">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </FormField>
            <FormField label="Priority">
              <Select
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
              >
                {['Low', 'Medium', 'High', 'Urgent'].map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAssignForm(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Assigning…' : 'Confirm & Assign Task'}
            </Button>
          </div>
        </form>
      )}

      {/* Triage & Operational Filter Tabs with Clean Professional Lucide Icons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { key: 'all', label: 'All Tasks', icon: ListFilter, count: counts.all, countBadge: 'bg-slate-100 text-slate-700' },
          { key: 'compliance_blocked', label: 'Compliance Blocked', icon: ShieldAlert, count: counts.compliance_blocked, countBadge: counts.compliance_blocked > 0 ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-100 text-slate-600', iconColor: 'text-amber-600' },
          { key: 'overdue', label: 'Overdue', icon: AlertTriangle, count: counts.overdue, countBadge: counts.overdue > 0 ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-slate-100 text-slate-600', iconColor: 'text-rose-600' },
          { key: 'active', label: 'Active', icon: Clock, count: counts.active, countBadge: 'bg-blue-50 text-blue-700', iconColor: 'text-blue-600' },
          { key: 'in_review', label: 'In Review', icon: Clock, count: counts.in_review, countBadge: 'bg-purple-50 text-purple-700', iconColor: 'text-purple-600' },
          { key: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed, countBadge: 'bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-600' },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TabIcon size={14} className={isActive ? 'text-white' : tab.iconColor || 'text-gray-400'} />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                  isActive ? 'bg-blue-700 text-white' : tab.countBadge
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Project Dropdown + Real-Time Search */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectFilterChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-800 font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          {/* Search Box with Lucide Search & Clear */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or assignee…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-7 py-1.5 bg-gray-50 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary & Quick Reset */}
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <span>Showing {filteredTasks.length} of {taskRows.length} tasks</span>
          {(activeFilter !== 'all' || selectedProjectId !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                handleProjectFilterChange('all');
                handleTabChange('all');
              }}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold ml-1 transition-colors"
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
