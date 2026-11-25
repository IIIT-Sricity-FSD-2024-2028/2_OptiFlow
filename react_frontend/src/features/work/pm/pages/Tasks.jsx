import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { EmptyState } from '../../../../shared/components/EmptyState';
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
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects, selectAllProjects, selectProjectsError, selectProjectsLoading } from '../../../../store/projects';
import {
  createTask,
  fetchTasks,
  selectAllTasks,
  selectTasksError,
  selectTasksLoading,
} from '../../../../store/tasks';
import {
  fetchComplianceViolations,
  selectAllComplianceViolations,
  selectComplianceViolationsError,
  selectComplianceViolationsStatus,
} from '../../../../store/complianceViolations';
import { fetchUsers, selectAllUsers, selectUsersStatus } from '../../../../store/users';
import { isPendingStatus } from '../../utils/storeStatus';
import { CreateTaskForm } from '../components/CreateTaskForm';

const PAGE_SIZE = 10;

export default function PmTasks() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get('filter') || 'all';
  const selectedProjectParam = searchParams.get('projectId') || 'all';

  const dispatch = useDispatch();
  const tasks = useSelector(selectAllTasks);
  const projects = useSelector(selectAllProjects);
  const tasksLoading = useSelector(selectTasksLoading);
  const projectsLoading = useSelector(selectProjectsLoading);
  const tasksError = useSelector(selectTasksError);
  const projectsError = useSelector(selectProjectsError);
  const [currentPage, setCurrentPage] = useState(1);
  // A failed user load leaves the assignee list empty, as before.
  const users = useSelector(selectAllUsers);
  const usersLoading = isPendingStatus(useSelector(selectUsersStatus));
  const loading = tasksLoading || projectsLoading || usersLoading;
  const [saving, setSaving] = useState(false);
  const [actionError, setError] = useState('');
  const violations = useSelector(selectAllComplianceViolations);
  const violationsStatus = useSelector(selectComplianceViolationsStatus);
  const violationsError = useSelector(selectComplianceViolationsError);
  const complianceError = violationsStatus === 'failed'
    ? violationsError?.message || 'Failed to load compliance status.'
    : '';
  const complianceBlockedIds = useMemo(() => new Set(
    violations
      .filter((violation) => ['Open', 'Under_Review'].includes(violation.status) && violation.entityType === 'Task')
      .map((violation) => String(violation.entityId)),
  ), [violations]);
  
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
    dispatch(fetchTasks());
    dispatch(fetchProjects());
    dispatch(fetchUsers());
    dispatch(fetchComplianceViolations());
  }, [dispatch]);

  const loadError = tasksError || projectsError;
  const loadErrorMessage = loadError ? loadError.message || 'Failed to load task data.' : '';

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
      await dispatch(createTask({
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        projectId: form.projectId,
        assignedToId: form.assignedToId || undefined,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        priority: form.priority,
        status: 'Active',
      })).unwrap();
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
        const matchesAssignee = String(task.assignedTo?.fullName || task.assignedTo?.email || '').toLowerCase().includes(query);
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

      {loadErrorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {loadErrorMessage}
        </div>
      )}

      {/* Enterprise Create Task Modal / Card */}
      {showAssignForm && (
        <CreateTaskForm
          onClose={() => {
            setShowAssignForm(false);
            setError('');
          }}
          onSubmit={submitTask}
          error={actionError}
          saving={saving}
          form={form}
          onFormChange={setForm}
          projects={projects}
          onProjectSelect={handleProjectSelect}
          selectedProject={selectedProjectForForm}
          teamLeads={availableTeamLeads}
          projectTeamLeadIds={projectTeamLeadIds}
        />
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
