import { useEffect, useState, useMemo, useCallback } from 'react';
import { Badge } from '../../../shared/components/Badge';
import { Loader } from '../../../shared/components/Loader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Pagination } from '../../../shared/components/Pagination';
import { Modal } from '../../../shared/components/Modal';
import { apiClient } from '../../../services/api/client';
import { formatAuditTimestamp } from '../../../shared/utils/formatDate';
import {
  Search,
  Eye,
  Clock,
  User,
  Tag,
  FileText,
  Filter,
  RefreshCw,
  ArrowRight,
  Layers,
} from 'lucide-react';

const PAGE_SIZE = 15;

const actionVariant = (action) => {
  if (!action) return 'default';
  const a = action.toUpperCase();
  if (a === 'CREATE') return 'success';
  if (a === 'DELETE') return 'danger';
  if (a === 'UPDATE' || a === 'EDIT') return 'info';
  if (a === 'STATUS_CHANGE') return 'warning';
  return 'default';
};

const formatEntityType = (type) => {
  if (!type) return 'Workflow Entity';
  if (type === 'Task') return 'Workflow Task';
  if (type === 'Project') return 'Project Workspace';
  if (type === 'ProcessTemplate') return 'Process Template Blueprint';
  if (type === 'Process') return 'Execution Instance';
  return type.replace(/([A-Z])/g, ' $1').trim();
};

function LogDetailModal({ log, onClose }) {
  if (!log) return null;
  const ts = formatAuditTimestamp(log.performedAt || log.createdAt);

  const oldStatus = log.oldValue?.status;
  const newStatus = log.newValue?.status;
  const hasStatusTransition = oldStatus && newStatus && oldStatus !== newStatus;

  return (
    <Modal isOpen={!!log} onClose={onClose} title="Process Audit Record Inspection" className="max-w-2xl">
      <div className="space-y-4">
        {/* Timestamp */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span>{ts.full}</span>
        </div>

        {/* Action & Status Transition */}
        <div className="flex flex-wrap items-center gap-2">
          <Tag size={14} className="text-slate-400 shrink-0" />
          <Badge status={actionVariant(log.action)}>
            {String(log.action || 'Unknown').replace(/_/g, ' ')}
          </Badge>

          {hasStatusTransition && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium ml-2">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {oldStatus}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {newStatus}
              </span>
            </div>
          )}
        </div>

        {/* Executed By & Workflow Target Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <User size={12} className="text-slate-400" />
              Executed By (Actor)
            </p>
            <p className="font-semibold text-sm text-slate-900">{log.performedBy?.fullName || 'Workflow Daemon'}</p>
            {log.performedBy?.email && <p className="text-xs text-slate-500 mt-0.5 font-mono">{log.performedBy.email}</p>}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <FileText size={12} className="text-slate-400" />
              Workflow Target
            </p>
            <p className="font-semibold text-sm text-slate-900">
              {log.entityName || `${formatEntityType(log.entityType)} #${String(log.entityId || '').substring(0, 8)}`}
            </p>
            {log.entityType && <p className="text-xs text-slate-500 mt-0.5">{formatEntityType(log.entityType)}</p>}
            {log.entityId && <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {log.entityId}</p>}
          </div>
        </div>

        {/* State Modifications & Payload */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers size={12} className="text-slate-400" />
            Workflow State Modifications & Payload
          </p>

          {log.oldValue || log.newValue ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold text-rose-700 block mb-1.5">
                  Prior State (Old Value)
                </span>
                <pre className="text-xs font-mono text-slate-700 bg-white p-2.5 rounded border border-slate-200 overflow-x-auto max-h-48 leading-relaxed">
                  {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : '(none)'}
                </pre>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="text-xs font-semibold text-emerald-700 block mb-1.5">
                  Mutated State (New Value)
                </span>
                <pre className="text-xs font-mono text-slate-700 bg-white p-2.5 rounded border border-slate-200 overflow-x-auto max-h-48 leading-relaxed">
                  {log.newValue ? JSON.stringify(log.newValue, null, 2) : '(none)'}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
              No state modifications or attributes recorded for this event.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function ProcessAdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient('/audit-logs/process');
      setLogs(Array.isArray(data) ? data : data?.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('[ProcessAdminAuditLogs] Error loading logs:', err);
      setError(err.message || 'Failed to load process audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Derived filter dropdown options
  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.entityType).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [
          log.action,
          log.entityType,
          log.entityName,
          log.performedBy?.fullName,
          log.performedBy?.email,
        ].some((v) => String(v || '').toLowerCase().includes(query));

      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesEntity = !entityFilter || log.entityType === entityFilter;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [logs, search, actionFilter, entityFilter]);

  const paginated = useMemo(() => {
    return filteredLogs.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  }, [filteredLogs, currentPage]);

  // Summary counts
  const taskCount = useMemo(() => logs.filter((l) => l.entityType === 'Task').length, [logs]);
  const projectCount = useMemo(() => logs.filter((l) => l.entityType === 'Project').length, [logs]);
  const templateCount = useMemo(
    () => logs.filter((l) => l.entityType === 'ProcessTemplate').length,
    [logs]
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText size={22} className="text-emerald-600" />
            Process & Workflow Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable operational audit trail of workflow templates, execution instances, task state transitions, and project milestones.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflow Events', value: logs.length, cls: 'text-slate-900' },
          { label: 'Task Transitions', value: taskCount, cls: 'text-emerald-700' },
          { label: 'Project Milestones', value: projectCount, cls: 'text-blue-700' },
          { label: 'Template Blueprints', value: templateCount, cls: 'text-purple-700' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <p className={`text-3xl font-extrabold ${cls}`}>{value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by action, workflow entity, or user..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={15} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Actions</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>{String(a).replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Entities</option>
            {entityOptions.map((e) => (
              <option key={e} value={e}>{formatEntityType(e)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader />
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState title="No process audit logs found" description="Try adjusting your search or filters." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    <Clock size={12} className="inline mr-1" />Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Tag size={12} className="inline mr-1" />Action
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <User size={12} className="inline mr-1" />Executed By
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <FileText size={12} className="inline mr-1" />Workflow Entity
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Layers size={12} className="inline mr-1" />Transition / Payload
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((log, i) => {
                  const ts = formatAuditTimestamp(log.performedAt || log.createdAt);
                  const oldStatus = log.oldValue?.status;
                  const newStatus = log.newValue?.status;
                  const hasStatusTransition = oldStatus && newStatus && oldStatus !== newStatus;

                  return (
                    <tr
                      key={log.id || i}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`font-semibold text-xs ${ts.isSameDay ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {ts.primary}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">{ts.secondary}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={actionVariant(log.action)}>
                          <span className="text-xs font-semibold">
                            {String(log.action || '—').replace(/_/g, ' ')}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs">
                            {log.performedBy?.fullName || 'Workflow Daemon'}
                          </span>
                          {log.performedBy?.email && (
                            <span className="text-[11px] text-slate-500 font-mono">{log.performedBy.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-800 text-xs">
                            {log.entityName || (log.entityId ? `${formatEntityType(log.entityType)} #${String(log.entityId).substring(0, 8)}` : formatEntityType(log.entityType))}
                          </span>
                          {log.entityType && (
                            <span className="text-[11px] text-slate-500">{formatEntityType(log.entityType)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasStatusTransition ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {oldStatus}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                              {newStatus}
                            </span>
                          </div>
                        ) : log.action === 'CREATE' ? (
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                            Resource Initialized
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">
                            {Object.keys(log.newValue || log.oldValue || {}).length} attribute(s) modified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50/80 cursor-pointer"
                          title="View Details"
                          aria-label="View audit log detail"
                        >
                          <Eye size={16} />
                        </button>
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
              totalItems={filteredLogs.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
