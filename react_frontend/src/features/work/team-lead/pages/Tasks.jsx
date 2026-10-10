import { useEffect, useState } from 'react';
// Owner: M4
// Endpoints: GET /api/tasks

import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';

import { Loader } from '../../../../shared/components/Loader';
import { TaskTable } from '../../components/TaskTable';

import * as tasksApi from '../../../../services/api/tasks';

export default function TeamLeadTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      setLoading(true);

      try {
        const tasksResponse = await tasksApi.list();

        if (!mounted) return;

        const normalizedTasks = Array.isArray(tasksResponse)
          ? tasksResponse
          : tasksResponse?.data || [];

        setTasks(normalizedTasks);
      } catch (error) {
        console.error('Failed to load team tasks:', error);

        if (mounted) {
          setTasks([]);
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