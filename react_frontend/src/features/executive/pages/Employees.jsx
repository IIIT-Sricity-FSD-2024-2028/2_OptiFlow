import { useEffect, useState, useMemo, useRef } from 'react';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Loader } from '../../../shared/components/Loader';
import { Pagination } from '../../../shared/components/Pagination';
import { Table } from '../../../shared/components/Table';
import { Modal } from '../../../shared/components/Modal';
import { apiClient } from '../../../services/api/client';
import * as tasksApi from '../../../services/api/tasks';
import {
  resolveFunctionalTitle,
  ROLE_LEVEL_LABELS,
  ROLE_BADGE_STYLES,
} from '../../hr/components/orgTreeUtils';
import {
  Search,
  Users,
  UserCheck,
  UserX,
  Briefcase,
  RefreshCw,
  Building2,
  X,
  Eye,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

const PAGE_SIZE = 10;

function Avatar({ name, size = 'sm' }) {
  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const sizeCls =
    size === 'lg'
      ? 'w-12 h-12 text-base'
      : size === 'md'
      ? 'w-9 h-9 text-xs'
      : 'w-8 h-8 text-[11px]';
  return (
    <div
      className={`${sizeCls} rounded-full bg-blue-100 border border-blue-200/80 flex items-center justify-center text-blue-700 font-bold shrink-0 select-none shadow-2xs`}
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

  const teamName =
    employee.teams?.[0]?.teamName ||
    employee.teamMembers?.[0]?.team?.name ||
    employee.primaryTeam?.teamName ||
    null;

  const branchName =
    employee.teams?.[0]?.branchName ||
    employee.teamMembers?.[0]?.team?.branch?.name ||
    employee.primaryTeam?.branchName ||
    employee.branchName ||
    null;

  const roleSlug = employee.roleAssignments?.[0]?.role?.name || employee.role || 'team_member';
  const resolvedTitle = resolveFunctionalTitle(employee, roleSlug, teamName);

  return (
    <Modal isOpen={!!employee} onClose={onClose} title="Employee Profile" className="max-w-lg">
      <div className="space-y-5">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <Avatar name={employee.fullName} size="lg" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{employee.fullName}</h2>
            <p className="text-sm text-slate-500 font-mono truncate">{employee.email}</p>
            <p className="text-xs font-semibold text-blue-700 mt-0.5">{resolvedTitle}</p>
          </div>
        </div>

        {/* Status & Roles */}
        <div className="flex flex-wrap gap-2">
          <Badge status={employee.isActive !== false ? 'success' : 'danger'}>
            {employee.isActive !== false ? 'Active' : 'Inactive'}
          </Badge>
          {roles.map((r) => (
            <Badge key={r} status="info">
              {r}
            </Badge>
          ))}
        </div>

        {/* Organization Scope */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Squad / Team</p>
            <p className="font-bold text-slate-800 text-sm mt-1 flex items-center gap-1.5">
              <Users size={14} className="text-blue-600" />
              {teamName || 'Unassigned'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Regional Branch</p>
            <p className="font-bold text-slate-800 text-sm mt-1 flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-600" />
              {branchName || 'Global HQ'}
            </p>
          </div>
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
                  <p className="text-xs text-slate-500 font-mono">{employee.manager.email}</p>
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
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const tableContainerRef = useRef(null);

  const handleSlideLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleSlideRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersData, rolesData, branchesData, tasksData] = await Promise.all([
        apiClient('/users'),
        apiClient('/roles').catch(() => []),
        apiClient('/branches').catch(() => []),
        tasksApi.list().catch(() => []),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : usersData?.data || []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : tasksData?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const branchById = useMemo(() => {
    return Object.fromEntries(branches.map((b) => [String(b.id), b.name]));
  }, [branches]);

  // Summary stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive !== false).length;
  const inactiveUsers = totalUsers - activeUsers;
  const distinctRoles = new Set(
    users.flatMap((u) => (u.roleAssignments || []).map((ra) => ra.role?.label)).filter(Boolean)
  ).size;

  // Filtered list
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const squad =
        u.teams?.[0]?.teamName ||
        u.teamMembers?.[0]?.team?.name ||
        u.primaryTeam?.teamName ||
        '';
      const branch =
        u.teams?.[0]?.branchName ||
        u.teamMembers?.[0]?.team?.branch?.name ||
        u.primaryTeam?.branchName ||
        (u.roleAssignments?.find((ra) => ra.scopeType === 'Branch')?.scopeId
          ? branchById[u.roleAssignments.find((ra) => ra.scopeType === 'Branch').scopeId]
          : '') ||
        '';

      const matchesSearch =
        !q ||
        [u.fullName, u.email, u.jobTitle, u.manager?.fullName, squad, branch].some((v) =>
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

      const matchesBranch =
        branchFilter === 'all' ||
        branch.toLowerCase() === branchFilter.toLowerCase() ||
        (u.roleAssignments || []).some(
          (ra) => ra.scopeType === 'Branch' && ra.scopeId === branchFilter
        );

      return matchesSearch && matchesStatus && matchesRole && matchesBranch;
    });
  }, [users, search, statusFilter, roleFilter, branchFilter, branchById]);

  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [filtered, currentPage]);

  // Shared Table Columns matching standard in HR Users
  const columns = useMemo(
    () => [
      {
        header: 'Employee',
        accessor: 'fullName',
        className: 'min-w-[240px]',
        render: (row) => (
          <div className="py-0.5 flex items-center gap-3">
            <Avatar name={row.fullName} />
            <div className="min-w-0">
              <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors block text-[13.5px] leading-snug truncate">
                {row.fullName}
              </span>
              <span className="text-[11.5px] text-slate-400 font-mono block mt-0.5 truncate">
                {row.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        header: 'Job Title',
        className: 'min-w-[190px]',
        render: (row) => {
          const roleSlug = row.roleAssignments?.[0]?.role?.name || row.role || 'team_member';
          const teamName =
            row.teams?.[0]?.teamName ||
            row.teamMembers?.[0]?.team?.name ||
            row.primaryTeam?.teamName ||
            null;
          const resolvedTitle = resolveFunctionalTitle(row, roleSlug, teamName);

          return (
            <span className="text-[13px] font-medium text-slate-700 whitespace-nowrap">
              {resolvedTitle}
            </span>
          );
        },
      },
      {
        header: 'Primary Role',
        className: 'min-w-[150px]',
        render: (row) => {
          const primaryRole = row.roleAssignments?.[0]?.role;
          const rawRole = primaryRole?.name || row.role || 'team_member';
          const roleSlug = rawRole.toLowerCase().replace(/[\s-]+/g, '_');
          const roleLabel = primaryRole?.label || ROLE_LEVEL_LABELS[roleSlug] || 'Team Member';
          const isElevated = [
            'company_owner',
            'system_admin',
            'superuser',
            'access_governance',
            'hr_manager',
            'branch_manager',
            'project_manager',
          ].includes(roleSlug);

          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                isElevated
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                  : 'bg-slate-100 text-slate-700 border border-slate-200/60'
              }`}
            >
              {roleLabel}
            </span>
          );
        },
      },
      {
        header: 'Squad',
        className: 'min-w-[160px]',
        render: (row) => {
          const squad =
            row.teams?.[0]?.teamName ||
            row.teamMembers?.[0]?.team?.name ||
            row.primaryTeam?.teamName;

          if (squad) {
            return (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800 whitespace-nowrap">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{squad}</span>
              </span>
            );
          }

          return (
            <span className="text-xs text-slate-400 italic whitespace-nowrap">Unassigned</span>
          );
        },
      },
      {
        header: 'Branch',
        className: 'min-w-[160px]',
        render: (row) => {
          const branchRa = row.roleAssignments?.find((ra) => ra.scopeType === 'Branch');
          const branch =
            row.teams?.[0]?.branchName ||
            row.teamMembers?.[0]?.team?.branch?.name ||
            row.primaryTeam?.branchName ||
            (branchRa ? branchById[branchRa.scopeId] : null);

          if (branch) {
            return (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-800 whitespace-nowrap">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{branch}</span>
              </span>
            );
          }

          return (
            <span className="text-xs text-slate-400 italic whitespace-nowrap">Global HQ</span>
          );
        },
      },
      {
        header: 'Reports To',
        className: 'min-w-[160px]',
        render: (row) => {
          if (!row.manager && !row.managerUserId) {
            return <span className="text-xs text-slate-400 italic whitespace-nowrap">Executive / Direct</span>;
          }
          return (
            <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
              {row.manager?.fullName || 'Designated Lead'}
            </span>
          );
        },
      },
      {
        header: 'Workload',
        className: 'min-w-[130px]',
        render: (row) => {
          const empTasks = tasks.filter(
            (t) => String(t.assignedToId || t.assignedTo?.id || '') === String(row.id)
          );
          if (empTasks.length === 0) {
            return <span className="text-xs text-slate-400">0 tasks</span>;
          }
          const done = empTasks.filter((t) => t.status === 'Completed').length;
          return (
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-slate-800">{empTasks.length} tasks</span>
              <span className="text-[10px] text-slate-400">{done} completed</span>
            </div>
          );
        },
      },
      {
        header: 'Status',
        className: 'min-w-[100px] text-center',
        align: 'center',
        render: (row) => (
          <Badge status={row.isActive !== false ? 'success' : 'danger'}>
            {row.isActive !== false ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        header: 'Action',
        className: 'min-w-[90px] text-right',
        align: 'right',
        render: (row) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEmployee(row);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Eye size={13} />
            Inspect
          </button>
        ),
      },
    ],
    [tasks, branchById]
  );

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users size={22} className="text-blue-600" />
            Personnel & Access Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise overview of all workforce personnel, operational squads, regional branches, and role governance.
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
          <button onClick={fetchData} className="text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Personnel',
            value: totalUsers,
            icon: <Users size={18} className="text-blue-500" />,
            cls: 'text-slate-900',
          },
          {
            label: 'Active Employees',
            value: activeUsers,
            icon: <UserCheck size={18} className="text-emerald-500" />,
            cls: 'text-emerald-700',
          },
          {
            label: 'Inactive / Suspended',
            value: inactiveUsers,
            icon: <UserX size={18} className="text-rose-400" />,
            cls: inactiveUsers > 0 ? 'text-rose-700' : 'text-slate-400',
          },
          {
            label: 'Distinct Roles',
            value: distinctRoles,
            icon: <Briefcase size={18} className="text-indigo-500" />,
            cls: 'text-indigo-700',
          },
        ].map(({ label, value, icon, cls }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </span>
              {icon}
            </div>
            <p className={`mt-2 text-3xl font-extrabold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex-1 relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by employee, email, job title, squad, branch..."
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          {roles.length > 0 && (
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <span className="text-xs text-slate-400 shrink-0">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Shared Table Component matching HR Users with Slider */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No employees found"
          description={
            search ? 'Try clearing your search query or filters.' : 'No personnel accounts exist yet.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Slider Controls Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-blue-600" />
              <span className="font-semibold text-slate-700">Personnel Roster</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (9 columns • scroll horizontally or slide to view all details)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 mr-1 hidden md:inline">Slide:</span>
              <button
                type="button"
                onClick={handleSlideLeft}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs font-medium text-[11px]"
                title="Slide table left"
                aria-label="Slide table left"
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Left</span>
              </button>
              <button
                type="button"
                onClick={handleSlideRight}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-2xs font-medium text-[11px]"
                title="Slide table right"
                aria-label="Slide table right"
              >
                <span className="hidden sm:inline">Right</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <Table
            containerRef={tableContainerRef}
            columns={columns}
            data={paginated}
            noSlider={false}
            tableClassName="min-w-[1300px]"
            borderless={true}
            onRowClick={(row) => setSelectedEmployee(row)}
            emptyMessage="No personnel records found"
          />

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

      {/* Employee detail profile modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        tasks={tasks}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
}
