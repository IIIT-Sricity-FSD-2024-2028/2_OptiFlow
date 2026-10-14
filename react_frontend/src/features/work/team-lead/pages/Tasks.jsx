import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { TaskTable } from '../../components/TaskTable';
import { Pagination } from '../../../../shared/components/Pagination';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ListFilter, 
  Search, 
  X, 
  RotateCcw,
  Layers
} from 'lucide-react';
import * as tasksApi from '../../../../services/api/tasks';
import * as projectsApi from '../../../../services/api/projects';
import * as complianceApi from '../../../../services/api/compliance';

const normalize = (res) => Array.isArray(res) ? res : res?.data || [];
const PAGE_SIZE = 10;

export default function TeamLeadTasks() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get('filter') || 'all';
  const selectedProjectParam = searchParams.get('projectId') || 'all';

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [complianceBlockedIds, setComplianceBlockedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(selectedProjectParam);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);

      try {
        const [tasksResponse, projectsResponse, violationsResponse] = await Promise.all([
          tasksApi.list(),
          projectsApi.list().catch(() => []),
          complianceApi.getViolations().catch(() => []),
        ]);

        if (!mounted) return;

        const normalizedTasks = normalize(tasksResponse);
        const normalizedProjects = normalize(projectsResponse);
        const normalizedViolations = normalize(violationsResponse);

        const blockedIds = new Set(
          normalizedViolations
            .filter((v) => ['Open', 'Under_Review'].includes(v.status) && v.entityType === 'Task')
            .map((v) => String(v.entityId))
        );

        setTasks(normalizedTasks);
        setProjects(normalizedProjects);
        setComplianceBlockedIds(blockedIds);
      } catch (error) {
        console.error('Failed to load team tasks data:', error);
        if (mounted) setTasks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedProjectId(selectedProjectParam);
  }, [selectedProjectParam]);

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

  // Tag every task with metadata
  const taskRows = useMemo(() => {
    const now = new Date();
    return tasks.map((task) => {
      const isBlocked = complianceBlockedIds.has(String(task.id));
      const isOverdue = task.dueDate && new Date(task.dueDate) < now && !['Completed', 'Cancelled'].includes(task.status);
      const isSubtask = !!(task.isSubtask || task.parentId || task.taskId);

      return {
        ...task,
        complianceBlocked: isBlocked,
        isOverdue: !!isOverdue,
        isSubtask,
        assigneeName: task.assigneeName || (typeof task.assignedTo === 'object'
          ? task.assignedTo?.fullName || task.assignedTo?.email
          : task.assignedTo) || task.assignee || 'Unassigned',
      };
    });
  }, [tasks, complianceBlockedIds]);

  // Counts for triage tabs
  const counts = useMemo(() => {
    return {
      all: taskRows.length,
      compliance_blocked: taskRows.filter((t) => t.complianceBlocked).length,
      review: taskRows.filter((t) => ['In_Review', 'Pending_TL_Review'].includes(t.status)).length,
      overdue: taskRows.filter((t) => t.isOverdue).length,
      active: taskRows.filter((t) => ['Active', 'In_Progress'].includes(t.status)).length,
      completed: taskRows.filter((t) => t.status === 'Completed').length,
    };
  }, [taskRows]);

  // Filtered dataset
  const filteredTasks = useMemo(() => {
    return taskRows.filter((task) => {
      // 1. Triage Tab filter
      if (activeFilter === 'compliance_blocked' && !task.complianceBlocked) return false;
      if (activeFilter === 'review' && !['In_Review', 'Pending_TL_Review'].includes(task.status)) return false;
      if (activeFilter === 'overdue' && !task.isOverdue) return false;
      if (activeFilter === 'active' && !['Active', 'In_Progress'].includes(task.status)) return false;
      if (activeFilter === 'completed' && task.status !== 'Completed') return false;

      // 2. Project filter
      if (selectedProjectId !== 'all' && String(task.projectId) !== String(selectedProjectId)) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = String(task.title || '').toLowerCase().includes(query);
        const matchesAssignee = String(task.assigneeName || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesAssignee) return false;
      }

      return true;
    });
  }, [taskRows, activeFilter, selectedProjectId, searchQuery]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, currentPage]);

  const handleViewTask = (task) => {
    const path = PATHS.TEAM_LEAD.TASK_DETAIL.replace(':id', task.id);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader />
          <p className="text-sm text-gray-500">Loading team tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Task Command</h1>
          <p className="text-gray-500 text-sm mt-1">
            Supervise team workload, approve review queues, and address compliance blockers.
          </p>
        </div>
      </div>

      {/* Triage Tabs with Enterprise SVGs & Clean Badges */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { key: 'all', label: 'All Tasks', icon: ListFilter, count: counts.all, countBadge: 'bg-slate-100 text-slate-700' },
          { key: 'review', label: 'Review Queue', icon: Clock, count: counts.review, countBadge: counts.review > 0 ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-slate-100 text-slate-600', iconColor: 'text-purple-600' },
          { key: 'compliance_blocked', label: 'Compliance Blocked', icon: ShieldAlert, count: counts.compliance_blocked, countBadge: counts.compliance_blocked > 0 ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-slate-100 text-slate-600', iconColor: 'text-amber-600' },
          { key: 'overdue', label: 'Overdue', icon: AlertTriangle, count: counts.overdue, countBadge: counts.overdue > 0 ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-slate-100 text-slate-600', iconColor: 'text-rose-600' },
          { key: 'active', label: 'Active', icon: Clock, count: counts.active, countBadge: 'bg-blue-50 text-blue-700', iconColor: 'text-blue-600' },
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

      {/* Control Bar: Project Selector + Instant Search */}
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

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks or assignees…"
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

        {/* Filter Summary & Reset */}
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
                Tasks blocked from completion until required evidence is verified or approved in the Evidence Vault.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Task List */}
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {filteredTasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No tasks match the active filters"
              description="Try adjusting your triage tab, clearing the project selection, or clearing your search."
            />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <TaskTable 
                tasks={paginatedTasks}
                onRowClick={handleViewTask}
                visibleColumns={['title', 'assignee', 'priority', 'status', 'dueDate']}
              />
            </div>

            <div className="border-t border-gray-100 px-4">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredTasks.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}