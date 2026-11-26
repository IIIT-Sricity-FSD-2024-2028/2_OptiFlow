import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { TaskTable } from '../../components/TaskTable';
import { ReportBlockerModal } from '../components/modals';
import { useSelector } from 'react-redux';
import { memberReads, useMemberReads } from '../useMemberReads';
import { selectMemberDeliverables } from '../memberSelectors';
import { selectAllProjects } from '../../../../store/projects';
import { Search, CheckSquare } from 'lucide-react';

const reads = [memberReads.tasks, memberReads.subtasks, memberReads.projects];

export default function MemberTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { loading, error } = useMemberReads(reads);
  const allTasks = useSelector(state => selectMemberDeliverables(state, user?.id || user?.userId));
  const projects = useSelector(selectAllProjects);

  // Filters & modals
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);

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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <Link to={PATHS.MEMBER.DASHBOARD} className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <span className="text-slate-800 font-semibold">My Tasks</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Tasks</h1>
            <p className="text-sm text-slate-500 mt-0.5">
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
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks or processes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {[
                { key: 'all', label: 'All', count: statusCounts.all },
                { key: 'in_progress', label: 'In Progress', count: statusCounts.in_progress },
                { key: 'pending', label: 'Pending', count: statusCounts.pending },
                { key: 'completed', label: 'Completed', count: statusCounts.completed },
                { key: 'blocked', label: 'Blocked', count: statusCounts.blocked },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all shrink-0 cursor-pointer ${
                    statusFilter === pill.key
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[180px] truncate"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id || p.projectId} value={p.id || p.projectId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Standard Reusable Task Table */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 shadow-xs">
          <EmptyState
            icon={<CheckSquare className="w-10 h-10 text-slate-400" />}
            title="No tasks found"
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

      <ReportBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        tasks={allTasks}
      />
    </div>
  );
}
