import React, { useEffect, useState } from 'react';
// Owner: M4
// Endpoints: GET /api/tasks

import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';
import { useAuth } from '../../../../context/AuthContext';

import { Button } from '../../../../shared/components/Button';
import { Badge } from '../../../../shared/components/Badge';
import { Loader } from '../../../../shared/components/Loader';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { TaskTable } from '../../components/TaskTable';

import * as tasksApi from '../../../../services/api/tasks';
import * as usersApi from '../../../../services/api/users';

const toStr = (val, fallback = '—') => {
  if (val === null || val === undefined) return fallback;

  if (typeof val === 'object') {
    return (
      val.fullName ||
      val.name ||
      val.label ||
      val.title ||
      fallback
    );
  }

  return String(val) || fallback;
};

export default function TeamLeadTasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      setLoading(true);

      try {
        const [tasksResponse, membersResponse] =
          await Promise.all([
            tasksApi.list().catch(() => []),
            usersApi.list().catch(() => []),
          ]);

        if (!mounted) return;

        const normalizedTasks = Array.isArray(tasksResponse)
          ? tasksResponse
          : tasksResponse?.data || [];

        const normalizedMembers = Array.isArray(membersResponse)
          ? membersResponse
          : membersResponse?.data || [];

        // Filter to only include users managed by the current Team Lead
        const myTeamMembers = normalizedMembers.filter(member => member.managerUserId === user.id);

        setTasks(normalizedTasks);
        setTeamMembers(myTeamMembers);
      } catch (error) {
        console.error('Failed to load team tasks:', error);

        if (mounted) {
          setTasks([]);
          setTeamMembers([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      mounted = false;
    };
  }, []);

  const getStatusBadge = (status) => {
    if (!status) return 'default';

    const value = String(status).toLowerCase();

    if (value.includes('complet')) {
      return 'success';
    }

    if (value.includes('progress')) {
      return 'info';
    }

    if (
      value.includes('review') ||
      value.includes('pending')
    ) {
      return 'warning';
    }

    if (value.includes('block')) {
      return 'warning';
    }

    return 'default';
  };

  const getPriorityBadge = (priority) => {
    if (!priority) return 'default';

    const value = String(priority).toLowerCase();

    if (value === 'high') {
      return 'warning';
    }

    if (value === 'medium') {
      return 'info';
    }

    return 'default';
  };

  const formatStatus = (status) => {
    return String(status || 'Unknown').replace(/_/g, ' ');
  };

  const handleCreateTask = async () => {
    const title = window.prompt('Enter task title:');

    if (!title?.trim()) return;

    const newTask = {
      title: title.trim(),
      priority: 'Medium',
      status: 'In_Progress',
      deadline: new Date().toISOString().split('T')[0],
    };

    try {
      const response = await tasksApi.create(newTask);

      const createdTask =
        response?.data ||
        response || {
          id: Date.now(),
          ...newTask,
        };

      setTasks((previousTasks) => [
        ...previousTasks,
        createdTask,
      ]);
    } catch (error) {
      console.error('Create task failed:', error);
    }
  };

  const handleViewTask = (task) => {
    const path = PATHS.TEAM_LEAD.TASK_DETAIL.replace(':id', task.id);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className=" flex flex-col items-center gap-3">
          <Loader />

          <p className="text-sm text-gray-500">
            Loading team tasks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Team Tasks
          </h1>

          <p className="text-gray-500 mt-1">
            Manage workload, assignments and task progress
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleCreateTask}
        >
          + Create Task
        </Button>
      </div>

      {/* Main content */}
      <div className="w-full">

        {/* Tasks */}
        <section className="xl:col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                All Team Tasks
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                {tasks.length} task{tasks.length === 1 ? '' : 's'} across your team
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <TaskTable 
              tasks={tasks}
              onRowClick={handleViewTask}
              visibleColumns={['title', 'assignee', 'priority', 'status', 'dueDate']}
            />
          </div>
        </section>

        {/* Team sidebar */}
        
      </div>
    </div>
  );
}