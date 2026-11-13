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
  ShieldCheck,
  Globe,
  Laptop,
} from 'lucide-react';

const PAGE_SIZE = 15;

const actionVariant = (action) => {
  if (!action) return 'default';
  const a = action.toUpperCase();
  if (a === 'CREATE') return 'success';
  if (a === 'DELETE') return 'danger';
  if (a === 'UPDATE' || a === 'EDIT') return 'info';
  if (a === 'LOGIN') return 'info';
  if (a === 'PERMISSION_CHANGE' || a === 'STATUS_CHANGE') return 'warning';
  return 'default';
};

const formatEntityType = (type) => {
  if (!type) return 'System Resource';
  if (type === 'User') return 'User Account';
  if (type === 'Role') return 'Role & Permission';
  if (type === 'Branch') return 'Regional Branch';
  if (type === 'Team') return 'Org Team';
  if (type === 'System') return 'System Infrastructure';
  return type.replace(/([A-Z])/g, ' $1').trim();
};

function LogDetailModal({ log, onClose }) {
  if (!log) return null;
  const ts = formatAuditTimestamp(log.performedAt || log.createdAt);

  return (
    <Modal isOpen={!!log} onClose={onClose} title="System Audit Record Inspection" className="max-w-2xl">
      <div className="space-y-4">
        {/* Timestamp */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span>{ts.full}</span>
        </div>

        {/* Action */}
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-slate-400 shrink-0" />
          <Badge status={actionVariant(log.action)}>
            {String(log.action || 'Unknown').replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Performed By & Target Entity Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <User size={12} className="text-slate-400" />
              Actor (Performed By)
            </p>
            <p className="font-semibold text-sm text-slate-900">{log.performedBy?.fullName || 'System Automated'}</p>
            {log.performedBy?.email && <p className="text-xs text-slate-500 mt-0.5 font-mono">{log.performedBy.email}</p>}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <FileText size={12} className="text-slate-400" />
              Target Entity
            </p>
            <p className="font-semibold text-sm text-slate-900">
              {log.entityName || `${formatEntityType(log.entityType)} #${String(log.entityId || '').substring(0, 8)}`}
            </p>
            {log.entityType && <p className="text-xs text-slate-500 mt-0.5">{formatEntityType(log.entityType)}</p>}
            {log.entityId && <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {log.entityId}</p>}
          </div>
        </div>

        {/* Client Telemetry */}
        {(log.ipAddress || log.userAgent) && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Globe size={12} className="text-slate-400" />
              Security Telemetry & Network Context
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
              {log.ipAddress && (
                <div>
                  <span className="text-slate-400 mr-1.5 font-medium">IP Address:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{log.ipAddress}</span>
                </div>
              )}
              {log.userAgent && (
                <div className="w-full">
                  <span className="text-slate-400 mr-1.5 font-medium flex items-center gap-1 mt-1">
                    <Laptop size={12} /> User Agent:
                  </span>
                  <p className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1 break-all">
                    {log.userAgent}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State Modifications & Payload */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            State Modifications & Payload
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
              No property modifications or payload recorded for this event.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function HrAuditLogs() {
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
      const data = await apiClient('/audit-logs/system');
      setLogs(Array.isArray(data) ? data : data?.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('[HrAuditLogs] Error loading logs:', err);
      setError(err.message || 'Failed to load system audit logs.');
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
          log.ipAddress,
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
  const loginCount = useMemo(() => logs.filter((l) => l.action === 'LOGIN').length, [logs]);
  const securityCount = useMemo(
    () => logs.filter((l) => l.action === 'PERMISSION_CHANGE' || l.entityType === 'Role').length,
    [logs]
  );
  const orgCount = useMemo(
    () => logs.filter((l) => l.entityType === 'Branch' || l.entityType === 'Team').length,
    [logs]
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck size={22} className="text-indigo-600" />
            System & Security Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable audit trail of authentication events, user provisioning, role assignments, and organizational branch security.
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
          { label: 'Total System Events', value: logs.length, cls: 'text-slate-900' },
          { label: 'Logins & Access', value: loginCount, cls: 'text-indigo-700' },
          { label: 'Roles & Privileges', value: securityCount, cls: 'text-purple-700' },
          { label: 'Org & Branches', value: orgCount, cls: 'text-emerald-700' },
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
            placeholder="Search by action, entity, user, or IP address..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={15} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Actions</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>{String(a).replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <EmptyState title="No system audit logs found" description="Try adjusting your search or filters." />
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
                    <User size={12} className="inline mr-1" />Performed By
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <FileText size={12} className="inline mr-1" />Target Entity
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Globe size={12} className="inline mr-1" />Client / IP
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((log, i) => {
                  const ts = formatAuditTimestamp(log.performedAt || log.createdAt);
                  return (
                    <tr
                      key={log.id || i}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`font-semibold text-xs ${ts.isSameDay ? 'text-indigo-700' : 'text-slate-800'}`}>
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
                            {log.performedBy?.fullName || 'System Automated'}
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
                        {log.ipAddress ? (
                          <span className="inline-flex items-center font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {log.ipAddress}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Internal</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-indigo-50/80 cursor-pointer"
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
