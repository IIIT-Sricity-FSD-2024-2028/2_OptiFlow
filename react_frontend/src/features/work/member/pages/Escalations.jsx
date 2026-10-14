import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../shared/components/Toast';
import { StatCard } from '../../../../shared/components/StatCard';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { Modal } from '../../../../shared/components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { ReportBlockerModal } from '../components/modals/ReportBlockerModal';
import { resolveTeamLead } from '../../utils/userUtils';
import * as escalationsApi from '../../../../services/api/escalations';
import * as tasksApi from '../../../../services/api/tasks';
import * as subtasksApi from '../../../../services/api/subtasks';
import * as usersApi from '../../../../services/api/users';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

export default function MemberEscalations() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [escalations, setEscalations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [manager, setManager] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);

  const loadEscalationsData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [escRes, tasksRes, subtasksRes, usersRes] = await Promise.allSettled([
        escalationsApi.list(),
        tasksApi.list(),
        subtasksApi.list(),
        usersApi.list(),
      ]);

      const allEsc = escRes.status === 'fulfilled' && escRes.value ? (Array.isArray(escRes.value) ? escRes.value : escRes.value.data || []) : [];
      const allTasks = tasksRes.status === 'fulfilled' && tasksRes.value ? (Array.isArray(tasksRes.value) ? tasksRes.value : tasksRes.value.data || []) : [];
      const allSubtasks = subtasksRes.status === 'fulfilled' && subtasksRes.value ? (Array.isArray(subtasksRes.value) ? subtasksRes.value : subtasksRes.value.data || []) : [];
      const allUsers = usersRes.status === 'fulfilled' && usersRes.value ? (Array.isArray(usersRes.value) ? usersRes.value : usersRes.value.data || []) : [];

      setUsers(allUsers);
      const myLeader = resolveTeamLead(user, allUsers);
      setManager(myLeader);

      const currentUserId = String(user?.id || user?.userId || '');

      const myTasks = allTasks.filter((t) => {
        const assigneeId = String(t.assignedToId || (typeof t.assignedTo === 'object' ? t.assignedTo?.id : t.assignedTo) || '');
        return Boolean(currentUserId && assigneeId === currentUserId);
      });

      const mySubtasks = allSubtasks
        .filter((st) => String(st.assignedTo || st.assignedToId || '') === currentUserId)
        .map((st) => {
          const parent = allTasks.find((pt) => String(pt.id || pt.taskId) === String(st.taskId));
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

      const myDeliverables = [...myTasks.map((t) => ({ ...t, isSubtask: false })), ...mySubtasks];
      setTasks(myDeliverables);

      const myTaskIds = new Set(
        myDeliverables.map((t) => String(t.isSubtask ? (t.parentTaskId || t.taskId) : (t.id || t.taskId)))
      );

      const myEsc = allEsc.filter((e) => {
        const reporterId = String(e.reportedBy || e.reportedById || (typeof e.reporter === 'object' ? e.reporter?.id : e.reporter) || '');
        const escTaskId = String(e.taskId || e.task_id || (typeof e.task === 'object' ? e.task?.id : e.task) || '');
        return Boolean(currentUserId && (reporterId === currentUserId || (escTaskId && myTaskIds.has(escTaskId))));
      });

      setEscalations(myEsc);
    } catch (err) {
      console.error('Error fetching escalations:', err);
      toast.error('Could not load escalations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEscalationsData();
  }, [loadEscalationsData]);

  const metrics = useMemo(() => {
    const total = escalations.length;
    const resolved = escalations.filter((e) => {
      const s = String(e.status || '').toLowerCase();
      return s.includes('resolve') || s.includes('close');
    }).length;
    const pending = total - resolved;
    return { total, resolved, pending };
  }, [escalations]);

  const filteredEscalations = useMemo(() => {
    return escalations.filter((item) => {
      const s = String(item.status || '').toLowerCase();

      let matchesStatus = true;
      if (statusFilter === 'resolved') {
        matchesStatus = s.includes('resolve') || s.includes('close');
      } else if (statusFilter === 'pending') {
        matchesStatus = !s.includes('resolve') && !s.includes('close');
      }

      const matchesPriority = priorityFilter ? String(item.priority || '').toLowerCase() === priorityFilter.toLowerCase() : true;
      const matchesQuery = searchQuery.trim()
        ? (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.blockerType?.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      return matchesStatus && matchesPriority && matchesQuery;
    });
  }, [escalations, statusFilter, priorityFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader />
        <p className="text-sm font-medium text-slate-500">Loading escalations & blockers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <Link to={PATHS.MEMBER.DASHBOARD} className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <span className="text-slate-800 font-semibold">Blockers & Escalations</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Blockers & Escalations</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Report impediments, track resolution progress, and request management intervention.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Blocker</span>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Reported"
          value={metrics.total}
          subtitle="All blockers on your tasks"
          icon={<AlertTriangle className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Pending Resolution"
          value={metrics.pending}
          subtitle="Awaiting lead or manager action"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Resolved"
          value={metrics.resolved}
          subtitle="Unblocked and cleared"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search blocker title or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Active / Pending' },
              { key: 'resolved', label: 'Resolved' },
            ].map((pill) => (
              <button
                key={pill.key}
                type="button"
                onClick={() => setStatusFilter(pill.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  statusFilter === pill.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Escalations Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {filteredEscalations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<CheckCircle2 className="w-10 h-10 text-emerald-500" />}
              title="No blockers found"
              description={searchQuery || priorityFilter || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'You have no active blockers logged.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Blocker Summary</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Priority</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Reported On</th>
                  <th className="py-3.5 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEscalations.map((esc) => {
                  const taskObj = tasks.find((t) => String(t.id || t.taskId) === String(esc.taskId || esc.task_id));
                  return (
                    <tr
                      key={esc.id}
                      onClick={() => setViewingItem(esc)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 max-w-xs">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {esc.title || 'Blocker Incident'}
                        </div>
                        {taskObj && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            Task: {taskObj.title}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                        <span className="font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          {esc.blockerType || 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <PriorityBadge priority={esc.priority} />
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={esc.status || 'Active'} />
                      </td>
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        {esc.createdAt ? new Date(esc.createdAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setViewingItem(esc); }} className="text-xs">
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shared Blocker Creation Modal */}
      <ReportBlockerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tasks={tasks}
        managerId={manager?.id || manager?.userId}
        onSuccess={() => {
          loadEscalationsData();
        }}
      />

      {/* Blocker Details Modal */}
      {viewingItem && (
        <Modal isOpen={Boolean(viewingItem)} onClose={() => setViewingItem(null)} title={viewingItem.title || 'Blocker Details'}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <StatusBadge status={viewingItem.status || 'Active'} />
              <PriorityBadge priority={viewingItem.priority} />
            </div>
            <div>
              <span className="font-bold text-slate-700 block mb-1">Category</span>
              <p className="text-slate-600">{viewingItem.blockerType || 'General'}</p>
            </div>
            <div>
              <span className="font-bold text-slate-700 block mb-1">Description</span>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
                {viewingItem.description || 'No description provided.'}
              </p>
            </div>
            {viewingItem.resolutionNotes && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-100">
                <span className="font-bold block mb-0.5">Resolution Notes:</span>
                {viewingItem.resolutionNotes}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewingItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
