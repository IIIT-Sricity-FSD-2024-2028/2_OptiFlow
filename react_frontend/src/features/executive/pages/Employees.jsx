import { useEffect, useState, useMemo } from 'react';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Loader } from '../../../shared/components/Loader';
import { Pagination } from '../../../shared/components/Pagination';
import { Modal } from '../../../shared/components/Modal';
import { apiClient } from '../../../services/api/client';
import * as tasksApi from '../../../services/api/tasks';
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Briefcase,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

const PAGE_SIZE = 20;

function Avatar({ name, size = 'sm' }) {
  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const sizeCls =
    size === 'lg'
      ? 'w-14 h-14 text-lg'
      : size === 'md'
      ? 'w-10 h-10 text-sm'
      : 'w-9 h-9 text-xs';
  return (
    <div
      className={`${sizeCls} rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60 flex items-center justify-center text-blue-700 font-bold shrink-0 select-none`}
    >
      {initials}
    </div>
  );
}

function EmployeeDetailModal({ employee, tasks = [], onClose }) {
  if (!employee) return null;

  const assignedTasks = tasks.filter(
    (t) =>
      String(t.assignedToId || t.assignedTo?.id || '') === String(employee.id)
  );
  const completedTasks = assignedTasks.filter((t) => t.status === 'Completed').length;
  const activeTasks = assignedTasks.filter((t) =>
    ['Active', 'In_Review', 'Draft'].includes(t.status)
  ).length;

  const roles = (employee.roleAssignments || []).map(
    (ra) => ra.role?.label || ra.role?.name || 'Role'
  );

  return (
    <Modal isOpen={!!employee} onClose={onClose} title="Employee Profile" className="max-w-lg">
      <div className="space-y-5">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <Avatar name={employee.fullName} size="lg" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">{employee.fullName}</h2>
            <p className="text-sm text-slate-500">{employee.email}</p>
            {employee.jobTitle && (
              <p className="text-xs font-medium text-slate-600 mt-0.5">{employee.jobTitle}</p>
            )}
          </div>
        </div>

        {/* Status & Roles */}
        <div className="flex flex-wrap gap-2">
          <Badge status={employee.isActive !== false ? 'success' : 'danger'}>
            {employee.isActive !== false ? 'Active' : 'Inactive'}
          </Badge>
          {roles.map((r) => (
            <Badge key={r} status="info">{r}</Badge>
          ))}
        </div>

        {/* Task stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Assigned Tasks', value: assignedTasks.length, cls: 'text-slate-900' },
            { label: 'Active', value: activeTasks, cls: 'text-blue-700' },
            { label: 'Completed', value: completedTasks, cls: 'text-emerald-700' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <p className={`text-xl font-extrabold ${cls}`}>{value}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Manager */}
        {employee.manager && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Reporting Manager</p>
            <div className="flex items-center gap-2">
              <Avatar name={employee.manager.fullName} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{employee.manager.fullName}</p>
                {employee.manager.email && (
                  <p className="text-xs text-slate-500">{employee.manager.email}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active tasks preview */}
        {assignedTasks.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Recent Tasks</p>
            <div className="space-y-2">
              {assignedTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-700 truncate">{t.title}</span>
                  <Badge
                    status={
                      t.status === 'Completed'
                        ? 'success'
                        : t.status?.includes('Review')
                        ? 'warning'
                        : 'info'
                    }
                  >
                    <span className="text-[10px]">{String(t.status || '').replace(/_/g, ' ')}</span>
                  </Badge>
                </div>
              ))}
              {assignedTasks.length > 4 && (
                <p className="text-[11px] text-slate-400">+{assignedTasks.length - 4} more tasks</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ExecutiveEmployees() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sortField, setSortField] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, rolesData, tasksData] = await Promise.all([
        apiClient('/users'),
        apiClient('/roles').catch(() => []),
        tasksApi.list().catch(() => []),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : usersData?.data || []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Summary stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive !== false).length;
  const inactiveUsers = totalUsers - activeUsers;
  const distinctRoles = new Set(
    users.flatMap((u) => (u.roleAssignments || []).map((ra) => ra.role?.label)).filter(Boolean)
  ).size;

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [u.fullName, u.email, u.jobTitle, u.manager?.fullName].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive !== false) ||
        (statusFilter === 'inactive' && u.isActive === false);
      const matchesRole =
        roleFilter === 'all' ||
        (u.roleAssignments || []).some(
          (ra) => ra.role?.id === roleFilter || ra.role?.label === roleFilter
        );
      return matchesSearch && matchesStatus && matchesRole;
    });

    list = [...list].sort((a, b) => {
      let aVal = String(a[sortField] || '').toLowerCase();
      let bVal = String(b[sortField] || '').toLowerCase();
      if (sortField === 'isActive') {
        aVal = a.isActive !== false ? '0' : '1';
        bVal = b.isActive !== false ? '0' : '1';
      }
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return list;
  }, [users, search, statusFilter, roleFilter, sortField, sortDir]);

  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }) =>
    sortField === field ? (
      sortDir === 'asc' ? (
        <ChevronUp size={12} className="inline ml-0.5 text-blue-600" />
      ) : (
        <ChevronDown size={12} className="inline ml-0.5 text-blue-600" />
      )
    ) : (
      <ChevronDown size={12} className="inline ml-0.5 text-slate-300" />
    );

  if (loading)
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <Loader />
      </div>
    );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users size={22} className="text-blue-600" />
            Employee Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View all employees in your company — their roles, managers, and task workloads.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Personnel', value: totalUsers, icon: <Users size={18} className="text-blue-500" />, cls: 'text-slate-900' },
          { label: 'Active Employees', value: activeUsers, icon: <UserCheck size={18} className="text-emerald-500" />, cls: 'text-emerald-700' },
          { label: 'Inactive / Suspended', value: inactiveUsers, icon: <UserX size={18} className="text-rose-400" />, cls: inactiveUsers > 0 ? 'text-rose-700' : 'text-slate-400' },
          { label: 'Distinct Roles', value: distinctRoles, icon: <Briefcase size={18} className="text-indigo-500" />, cls: 'text-indigo-700' },
        ].map(({ label, value, icon, cls }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
              {icon}
            </div>
            <p className={`mt-2 text-3xl font-extrabold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, email, job title, or manager..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          {roles.length > 0 && (
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Employee table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No employees found"
          description={search ? 'Try clearing search or filters.' : 'No employee accounts exist yet.'}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('fullName')}
                  >
                    Employee <SortIcon field="fullName" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('jobTitle')}
                  >
                    Job Title <SortIcon field="jobTitle" />
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Roles
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Reporting To
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tasks
                  </th>
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('isActive')}
                  >
                    Status <SortIcon field="isActive" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((emp) => {
                  const initials = (emp.fullName || '?')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                  const empRoles = (emp.roleAssignments || []).map(
                    (ra) => ra.role?.label || ra.role?.name
                  ).filter(Boolean);
                  const empTasks = tasks.filter(
                    (t) => String(t.assignedToId || t.assignedTo?.id || '') === String(emp.id)
                  );
                  const empActiveTasks = empTasks.filter((t) =>
                    ['Active', 'In_Review', 'Draft'].includes(t.status)
                  ).length;
                  const empDoneTasks = empTasks.filter((t) => t.status === 'Completed').length;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {emp.fullName}
                            </p>
                            <p className="text-xs text-slate-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Job Title */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{emp.jobTitle || <span className="text-slate-400">—</span>}</span>
                      </td>

                      {/* Roles */}
                      <td className="px-4 py-3">
                        {empRoles.length === 0 ? (
                          <span className="text-xs text-slate-400">No role</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {empRoles.slice(0, 2).map((r) => (
                              <Badge key={r} status="info">
                                <span className="text-[10px]">{r}</span>
                              </Badge>
                            ))}
                            {empRoles.length > 2 && (
                              <span className="text-[11px] text-slate-400">+{empRoles.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Manager */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {emp.manager?.fullName || <span className="text-slate-400">—</span>}
                        </span>
                      </td>

                      {/* Tasks */}
                      <td className="px-4 py-3">
                        {empTasks.length === 0 ? (
                          <span className="text-xs text-slate-400">None</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-slate-700">
                              {empTasks.length} total
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {empActiveTasks} active · {empDoneTasks} done
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge status={emp.isActive !== false ? 'success' : 'danger'}>
                          {emp.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Employee detail modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        tasks={tasks}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
}
