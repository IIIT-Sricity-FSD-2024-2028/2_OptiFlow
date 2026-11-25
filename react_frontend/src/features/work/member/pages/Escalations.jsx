import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { StatCard } from '../../../../shared/components/StatCard';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { Modal } from '../../../../shared/components/Modal';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { ReportBlockerModal } from '../components/modals/ReportBlockerModal';
import EscalationTable from '../components/EscalationTable';
import { resolveTeamLead } from '../../utils/userUtils';
import { useSelector } from 'react-redux';
import { memberReads, useMemberReads } from '../useMemberReads';
import { selectMemberDeliverables } from '../memberSelectors';
import { selectAllEscalations } from '../../../../store/escalations';
import { selectAllUsers } from '../../../../store/users';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
} from 'lucide-react';

const reads = [memberReads.tasks, memberReads.subtasks, memberReads.users, memberReads.escalations];

export default function MemberEscalations() {
  const { user } = useAuth();

  const { loading, error } = useMemberReads(reads);
  const tasks = useSelector(state => selectMemberDeliverables(state, user?.id || user?.userId));
  const users = useSelector(selectAllUsers);
  const manager = resolveTeamLead(user, users);
  const allEscalations = useSelector(selectAllEscalations);
  const currentUserId = String(user?.id || user?.userId || '');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);

  const escalations = useMemo(() => {
    const myTaskIds = new Set(
      tasks.map((t) => String(t.isSubtask ? (t.parentTaskId || t.taskId) : (t.id || t.taskId)))
    );

    return allEscalations.filter((e) => {
      const reporterId = String(e.reportedBy || e.reportedById || (typeof e.reporter === 'object' ? e.reporter?.id : e.reporter) || '');
      const escTaskId = String(e.taskId || e.task_id || (typeof e.task === 'object' ? e.task?.id : e.task) || '');
      return Boolean(currentUserId && (reporterId === currentUserId || (escTaskId && myTaskIds.has(escTaskId))));
    });
  }, [tasks, allEscalations, currentUserId]);
  const viewingItem = escalations.find(item => item.id === viewingId);

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
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
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

      {/* Decomposed Escalations Table */}
      <EscalationTable
        escalations={filteredEscalations}
        tasks={tasks}
        searchQuery={searchQuery}
        priorityFilter={priorityFilter}
        statusFilter={statusFilter}
        onViewItem={(item) => setViewingId(item.id)}
      />

      {/* Shared Blocker Creation Modal */}
      <ReportBlockerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tasks={tasks}
        managerId={manager?.id || manager?.userId}
      />

      {/* Blocker Details Modal */}
      {viewingItem && (
        <Modal isOpen={Boolean(viewingItem)} onClose={() => setViewingId(null)} title={viewingItem.title || 'Blocker Details'}>
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
              <Button variant="outline" size="sm" onClick={() => setViewingId(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
