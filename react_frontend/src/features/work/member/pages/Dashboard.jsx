import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../shared/components/Toast';
import { StatCard } from '../../../../shared/components/StatCard';
import { Button } from '../../../../shared/components/Button';
import { Badge } from '../../../../shared/components/Badge';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { TaskTable } from '../../components/TaskTable';
import { ReportBlockerModal } from '../components/modals/ReportBlockerModal';
import { resolveTeamLead } from '../../utils/userUtils';
import * as tasksApi from '../../../../services/api/tasks';
import * as subtasksApi from '../../../../services/api/subtasks';
import * as escalationsApi from '../../../../services/api/escalations';
import * as evidenceApi from '../../../../services/api/evidence';
import * as usersApi from '../../../../services/api/users';
import * as projectsApi from '../../../../services/api/projects';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function MemberDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [manager, setManager] = useState(null);
  const [activeProject, setActiveProject] = useState(null);

  // Blocker Modal state
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);

  const loadDashboardData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, subtasksRes, escRes, evRes, usersRes, projRes] = await Promise.allSettled([
        tasksApi.list(),
        subtasksApi.list(),
        escalationsApi.list(),
        evidenceApi.list(),
        usersApi.list(),
        projectsApi.list(),
      ]);

      const allTasks = tasksRes.status === 'fulfilled' && tasksRes.value ? (Array.isArray(tasksRes.value) ? tasksRes.value : tasksRes.value.data || []) : [];
      const allSubtasks = subtasksRes.status === 'fulfilled' && subtasksRes.value ? (Array.isArray(subtasksRes.value) ? subtasksRes.value : subtasksRes.value.data || []) : [];
      const allEsc = escRes.status === 'fulfilled' && escRes.value ? (Array.isArray(escRes.value) ? escRes.value : escRes.value.data || []) : [];
      const allEv = evRes.status === 'fulfilled' && evRes.value ? (Array.isArray(evRes.value) ? evRes.value : evRes.value.data || []) : [];
      const allUsers = usersRes.status === 'fulfilled' && usersRes.value ? (Array.isArray(usersRes.value) ? usersRes.value : usersRes.value.data || []) : [];
      const allProjects = projRes.status === 'fulfilled' && projRes.value ? (Array.isArray(projRes.value) ? projRes.value : projRes.value.data || []) : [];

      const currentUserId = String(user?.id || user?.userId || '');

      // Resolve Team Leader using reusable helper
      const myLeader = resolveTeamLead(user, allUsers);
      setManager(myLeader);

      // Filter tasks assigned strictly to current user
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

      setTasks(myTasks);
      setSubtasks(mySubtasks);
      setEscalations(allEsc);
      setEvidenceList(allEv);

      if (myTasks.length > 0) {
        const firstTaskProjId = myTasks[0]?.projectId || (typeof myTasks[0]?.project === 'object' ? myTasks[0]?.project?.id : null);
        const foundProj = allProjects.find((p) => String(p.id || p.projectId) === String(firstTaskProjId)) || myTasks[0]?.project;
        setActiveProject(foundProj || allProjects[0] || null);
      } else if (allProjects.length > 0) {
        setActiveProject(allProjects[0]);
      }
    } catch (err) {
      console.error('Error loading member dashboard:', err);
      toast.error('Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const allDeliverables = React.useMemo(() => {
    return [
      ...tasks.map((t) => ({ ...t, isSubtask: false })),
      ...subtasks,
    ];
  }, [tasks, subtasks]);

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

  const managerName = manager?.fullName || manager?.name || 'Lucas Scott';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Workspace</h1>
          <p className="text-gray-500 text-sm mt-1">
            Execution · Deliverables assigned to you · Evidence & blocker management
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full text-xs text-gray-600 font-medium shadow-sm">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
              {managerName.charAt(0).toUpperCase()}
            </div>
            <span>
              Reporting to: <strong className="text-gray-900 font-semibold">{managerName}</strong>
            </span>
          </div>
          <Badge status="info">Team Member</Badge>
        </div>
      </div>

      {/* Action Bar */}
      <section className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => navigate(PATHS.MEMBER.TASKS)}
        >
          My Tasks
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(PATHS.MEMBER.EVIDENCE)}
        >
          Upload Evidence
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsBlockerModalOpen(true)}
          className="text-rose-700 border-rose-200 hover:bg-rose-50"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 mr-1.5" />
          Report Blocker
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(PATHS.MEMBER.ESCALATIONS)}
        >
          View Escalations
        </Button>
      </section>

      {/* Stat Cards Grid */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Assigned Tasks"
            value={totalAssigned}
            trend={`${tasks.length} deliverables · ${subtasks.length} subtasks`}
            icon={<CheckSquare className="w-5 h-5 text-blue-600" />}
          />
          <StatCard
            title="In Progress"
            value={inProgressTasks}
            trend="Active deliverables"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
          />
          <StatCard
            title="Completed"
            value={completedTasks}
            trend="Submitted & approved"
            trendDirection="up"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />
          <StatCard
            title="Overdue"
            value={overdueTasks}
            trend={overdueTasks > 0 ? 'Requires attention' : 'All on track'}
            trendDirection={overdueTasks > 0 ? 'down' : undefined}
            icon={<AlertCircle className={`w-5 h-5 ${overdueTasks > 0 ? 'text-rose-600' : 'text-gray-400'}`} />}
          />
        </div>
      </section>

      {/* Active Tasks Table Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Current Deliverables</h2>
            <p className="text-xs text-gray-500 mt-1">Tasks requiring your attention and execution</p>
          </div>
          <Link
            to={PATHS.MEMBER.TASKS}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Open task list ({allDeliverables.length}) →
          </Link>
        </div>

        <div className="p-5">
          {allDeliverables.length === 0 ? (
            <EmptyState
              title="No deliverables assigned"
              description="No tasks have been allocated to you yet."
            />
          ) : (
            <TaskTable
              tasks={allDeliverables.slice(0, 6)}
              visibleColumns={['title', 'project', 'priority', 'status', 'dueDate', 'actions']}
              onRowClick={(t) =>
                navigate(t.isSubtask ? `/member/tasks/${t.parentTaskId || t.taskId}` : `/member/tasks/${t.id || t.taskId}`)
              }
            />
          )}
        </div>
      </div>

      {/* Shared Blocker Modal */}
      <ReportBlockerModal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        tasks={allDeliverables}
        managerId={manager?.id || manager?.userId}
        onSuccess={() => {
          loadDashboardData();
        }}
      />
    </div>
  );
}
