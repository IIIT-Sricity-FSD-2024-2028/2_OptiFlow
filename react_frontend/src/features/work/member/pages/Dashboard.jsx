import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { StatCard } from '../../../../shared/components/StatCard';
import { Button } from '../../../../shared/components/Button';
import { Loader } from '../../../../shared/components/Loader';
import { TaskTable } from '../../components/TaskTable';
import { ReportBlockerModal } from '../components/modals/ReportBlockerModal';
import { resolveTeamLead } from '../../utils/userUtils';
import { useSelector } from 'react-redux';
import { memberReads, useMemberReads } from '../useMemberReads';
import { selectMemberDeliverables } from '../memberSelectors';
import { selectAllUsers } from '../../../../store/users';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const reads = [memberReads.tasks, memberReads.subtasks, memberReads.users];

export default function MemberDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { loading, error } = useMemberReads(reads);
  const allDeliverables = useSelector(state => selectMemberDeliverables(state, user?.id || user?.userId));
  const users = useSelector(selectAllUsers);
  const manager = resolveTeamLead(user, users);
  const subtaskCount = allDeliverables.filter(row => row.isSubtask).length;

  // Blocker Modal state
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);

  const totalAssigned = allDeliverables.length;
  const completedTasks = allDeliverables.filter((t) => String(t.status || '').toLowerCase().includes('complete')).length;
  const inProgressTasks = allDeliverables.filter((t) => {
    const s = String(t.status || '').toLowerCase();
    return s.includes('progress') || s.includes('review') || s.includes('active');
  }).length;
  const overdueTasks = allDeliverables.filter((t) => {
    const isDone = String(t.status || '').toLowerCase().includes('complete');
    if (isDone || (!t.dueDate && !t.deadline)) return false;
    return new Date(t.dueDate || t.deadline) < new Date();
  }).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader />
        <p className="text-sm font-medium text-slate-500">Loading your workspace...</p>
      </div>
    );
  }

  const managerName = manager?.fullName || manager?.name || 'Team Lead';

  return (
    <div className="space-y-6 max-w-[1240px] mx-auto pb-8">
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Work</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Execution · Tasks assigned to you · Submit work, evidence, and blockers
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 pl-1.5 pr-3.5 py-1 rounded-full text-xs text-slate-600 font-medium self-start sm:self-auto shadow-2xs">
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[11px]">
            {managerName.charAt(0).toUpperCase()}
          </div>
          <span>
            Reporting to: <strong className="text-slate-900 font-semibold">{managerName}</strong>
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(PATHS.MEMBER.TASKS)}
          className="text-xs font-semibold px-4"
        >
          My tasks
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(PATHS.MEMBER.EVIDENCE)}
          className="text-xs font-semibold px-4"
        >
          Upload evidence
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsBlockerModalOpen(true)}
          className="text-xs font-semibold px-4 text-rose-700 border-rose-200 hover:bg-rose-50"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mr-1.5" />
          Report blocker
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(PATHS.MEMBER.ESCALATIONS)}
          className="text-xs font-semibold px-4"
        >
          View escalations
        </Button>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Tasks"
          value={totalAssigned}
          subtitle={`${allDeliverables.length - subtaskCount} deliverables, ${subtaskCount} subtasks`}
          icon={<CheckSquare className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="In Progress"
          value={inProgressTasks}
          subtitle="Currently active deliverables"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          subtitle="Submitted & approved"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Overdue"
          value={overdueTasks}
          subtitle={overdueTasks > 0 ? 'Requires immediate action' : 'All on track'}
          icon={<AlertCircle className={`w-5 h-5 ${overdueTasks > 0 ? 'text-rose-600' : 'text-slate-400'}`} />}
        />
      </div>

      {/* Active Tasks Table Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Current Deliverables</h2>
            <p className="text-xs text-slate-500">Tasks requiring your attention</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(PATHS.MEMBER.TASKS)}
            className="text-xs font-semibold"
          >
            View all ({allDeliverables.length})
          </Button>
        </div>

        <TaskTable
          tasks={allDeliverables.slice(0, 6)}
          visibleColumns={['title', 'project', 'priority', 'status', 'dueDate', 'actions']}
          onRowClick={(t) => navigate(t.isSubtask ? `/member/tasks/${t.parentTaskId || t.taskId}` : `/member/tasks/${t.id || t.taskId}`)}
        />
      </div>

      {/* Shared Blocker Modal */}
      <ReportBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        tasks={allDeliverables}
        managerId={manager?.id || manager?.userId}
      />
    </div>
  );
}
