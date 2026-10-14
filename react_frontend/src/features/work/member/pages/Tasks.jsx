import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../shared/components/Toast';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { TaskTable } from '../../components/TaskTable';
import { ReportBlockerModal } from '../components/modals/ReportBlockerModal';
import * as tasksApi from '../../../../services/api/tasks';
import * as subtasksApi from '../../../../services/api/subtasks';
import * as projectsApi from '../../../../services/api/projects';
import * as usersApi from '../../../../services/api/users';
import {
  Search,
  CheckSquare,
  ListFilter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  X,
} from 'lucide-react';

export default function MemberTasks() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadTasksData() {
      setLoading(true);
      try {
        const [tasksRes, subtasksRes, projRes, usersRes] = await Promise.allSettled([
          tasksApi.list(),
          subtasksApi.list(),
          projectsApi.list(),
          usersApi.list(),
        ]);

        if (!isMounted) return;

        const rawTasks = tasksRes.status === 'fulfilled' && tasksRes.value ? (Array.isArray(tasksRes.value) ? tasksRes.value : tasksRes.value.data || []) : [];
        const rawSubtasks = subtasksRes.status === 'fulfilled' && subtasksRes.value ? (Array.isArray(subtasksRes.value) ? subtasksRes.value : subtasksRes.value.data || []) : [];
        const rawProjects = projRes.status === 'fulfilled' && projRes.value ? (Array.isArray(projRes.value) ? projRes.value : projRes.value.data || []) : [];
        const rawUsers = usersRes.status === 'fulfilled' && usersRes.value ? (Array.isArray(usersRes.value) ? usersRes.value : usersRes.value.data || []) : [];

        setProjects(rawProjects);
        setUsers(rawUsers);

        const currentUserId = String(user?.id || user?.userId || '');

        const memberTasks = rawTasks
          .filter((t) => {
            const assigneeId = String(t.assignedToId || (typeof t.assignedTo === 'object' ? t.assignedTo?.id : t.assignedTo) || '');
            return Boolean(currentUserId && assigneeId === currentUserId);
          })
          .map((t) => ({ ...t, isSubtask: false }));

        const memberSubtasks = rawSubtasks
          .filter((st) => String(st.assignedTo || st.assignedToId || '') === currentUserId)
          .map((st) => {
            const parent = rawTasks.find((pt) => String(pt.id || pt.taskId) === String(st.taskId));
            return {
              ...st,
              id: st.id || st.subtaskId,
              title: st.title || 'Subtask',
              projectId: parent?.projectId || parent?.project?.id,
              project: parent?.project,
              isSubtask: true,
              parentTaskId: st.taskId,
              dueDate: st.dueDate || st.due_date || parent?.dueDate,
              priority: st.priority || parent?.priority || 'Medium',
            };
          });

        setAllTasks([...memberTasks, ...memberSubtasks]);
      } catch (err) {
        console.error('Error fetching member tasks:', err);
        if (isMounted) toast.error('Could not load task list');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTasksData();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const statusCounts = useMemo(() => {
    return {
      all: allTasks.length,
      in_progress: allTasks.filter((t) => {
        const s = String(t.status || '').toLowerCase();
        return s.includes('progress') || s.includes('review') || s.includes('active');
      }).length,
      pending: allTasks.filter((t) => {
        const s = String(t.status || '').toLowerCase();
        return s.includes('pending') || s.includes('not_started') || s.includes('draft');
      }).length,
      completed: allTasks.filter((t) => String(t.status || '').toLowerCase().includes('complete')).length,
      blocked: allTasks.filter((t) => String(t.status || '').toLowerCase().includes('blocked')).length,
    };
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const s = String(t.status || '').toLowerCase();

      let matchesStatus = true;
      if (statusFilter === 'in_progress') {
        matchesStatus = s.includes('progress') || s.includes('review') || s.includes('active');
      } else if (statusFilter === 'pending') {
        matchesStatus = s.includes('pending') || s.includes('not_started') || s.includes('draft');
      } else if (statusFilter === 'completed') {
        matchesStatus = s.includes('complete');
      } else if (statusFilter === 'blocked') {
        matchesStatus = s.includes('blocked');
      }

      const matchesPriority = priorityFilter ? String(t.priority || '').toLowerCase() === priorityFilter.toLowerCase() : true;
      const matchesProject = projectFilter ? String(t.projectId || t.project?.id || '') === String(projectFilter) : true;
      const matchesQuery = searchQuery.trim()
        ? (t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      return matchesStatus && matchesPriority && matchesProject && matchesQuery;
    });
  }, [allTasks, statusFilter, priorityFilter, projectFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader />
        <p className="text-sm font-medium text-slate-500">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Deliverables</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track, execute, and submit deliverables assigned to you across all processes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(PATHS.MEMBER.EVIDENCE)}
            className="text-xs font-semibold"
          >
            Evidence Submissions
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsBlockerModalOpen(true)}
            className="text-xs font-semibold"
          >
            Report Blocker
          </Button>
        </div>
      </div>

      {/* Triage Tabs with Enterprise SVGs & Clean Badges */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { key: 'all', label: 'All Tasks', icon: ListFilter, count: statusCounts.all, countBadge: 'bg-slate-100 text-slate-700' },
          { key: 'in_progress', label: 'In Progress', icon: Clock, count: statusCounts.in_progress, countBadge: 'bg-blue-50 text-blue-700', iconColor: 'text-blue-600' },
          { key: 'pending', label: 'Pending', icon: AlertCircle, count: statusCounts.pending, countBadge: 'bg-slate-100 text-slate-600', iconColor: 'text-gray-500' },
          { key: 'completed', label: 'Completed', icon: CheckCircle2, count: statusCounts.completed, countBadge: 'bg-emerald-50 text-emerald-700', iconColor: 'text-emerald-600' },
          { key: 'blocked', label: 'Blocked', icon: AlertTriangle, count: statusCounts.blocked, countBadge: statusCounts.blocked > 0 ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-slate-100 text-slate-600', iconColor: 'text-rose-600' },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
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

      {/* Control Bar: Project Selector + Priority Selector + Instant Search */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Project:</span>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-800 font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Projects ({projects.length})</option>
              {projects.map((proj) => (
                <option key={proj.id || proj.projectId} value={proj.id || proj.projectId}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-800 font-medium outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search deliverables…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg pl-8 pr-7 py-1.5 bg-gray-50 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
          <span>Showing {filteredTasks.length} of {allTasks.length} tasks</span>
          {(statusFilter !== 'all' || priorityFilter || projectFilter || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('');
                setProjectFilter('');
              }}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold ml-1 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Standard Reusable Task Table */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 shadow-sm">
          <EmptyState
            icon={<CheckSquare className="w-10 h-10 text-gray-400" />}
            title="No deliverables found"
            description="Try clearing or modifying your filter criteria."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('');
                  setProjectFilter('');
                }}
              >
                Reset Filters
              </Button>
            }
          />
        </div>
      ) : (
        <TaskTable
          tasks={filteredTasks}
          visibleColumns={['title', 'project', 'priority', 'status', 'dueDate', 'actions']}
          onRowClick={(t) => {
            const targetId = t.isSubtask ? t.parentTaskId : t.id || t.taskId;
            navigate(`/member/tasks/${targetId}`);
          }}
        />
      )}

      {/* Report Blocker Modal */}
      <ReportBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        tasks={allTasks}
        managerId={user?.managerId || user?.managerUserId}
        onSuccess={() => {
          toast.success('Blocker report submitted successfully.');
        }}
      />
    </div>
  );
}
