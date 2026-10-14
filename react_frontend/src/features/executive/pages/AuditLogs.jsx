import { useEffect, useState, useMemo } from 'react';
import { Badge } from '../../../shared/components/Badge';
import { Loader } from '../../../shared/components/Loader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Pagination } from '../../../shared/components/Pagination';
import { Modal } from '../../../shared/components/Modal';
import { apiClient } from '../../../services/api/client';
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
} from 'lucide-react';

const PAGE_SIZE = 15;

const actionVariant = (action) => {
  if (!action) return 'default';
  if (action === 'CREATE') return 'success';
  if (action === 'DELETE') return 'danger';
  if (action === 'UPDATE' || action === 'EDIT') return 'info';
  if (action === 'STATUS_CHANGE') return 'warning';
  return 'default';
};

const formatEntityType = (type) => {
  if (!type) return 'System';
  if (type === 'ComplianceRule') return 'Compliance Rule';
  if (type === 'ComplianceViolation') return 'Violation';
  if (type === 'ComplianceEvidence') return 'Evidence';
  return type.replace(/([A-Z])/g, ' $1').trim();
};

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
  };
};

function LogDetailModal({ log, onClose }) {
  if (!log) return null;
  const ts = formatTimestamp(log.performedAt || log.createdAt);

  return (
    <Modal isOpen={!!log} onClose={onClose} title="Audit Log Detail" className="max-w-lg">
      <div className="space-y-4">
        {/* Timestamp */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span>{ts.date} at {ts.time}</span>
        </div>

        {/* Action */}
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-slate-400 shrink-0" />
          <Badge status={actionVariant(log.action)}>
            {String(log.action || 'Unknown').replace(/_/g, ' ')}
          </Badge>
        </div>

        {/* Performed By */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Performed By</p>
          <p className="font-semibold text-sm text-slate-900">{log.performedBy?.fullName || 'System Automated'}</p>
          {log.performedBy?.email && <p className="text-xs text-slate-500 mt-0.5">{log.performedBy.email}</p>}
          {log.performedBy?.role && <p className="text-xs text-slate-400 mt-0.5">{log.performedBy.role}</p>}
        </div>

        {/* Entity */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Affected Entity</p>
          <p className="font-semibold text-sm text-slate-900">
            {log.entityName || `${formatEntityType(log.entityType)} #${String(log.entityId || '').substring(0, 8)}`}
          </p>
          {log.entityType && <p className="text-xs text-slate-500 mt-0.5">{formatEntityType(log.entityType)}</p>}
          {log.entityId && <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {log.entityId}</p>}
        </div>

        {/* Notes / Description */}
        {(log.description || log.notes || log.details) && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Notes</p>
            <p className="text-sm text-slate-700 leading-relaxed">{log.description || log.notes || log.details}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ExecutiveAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient('/audit-logs');
      setLogs(Array.isArray(data) ? data : data?.data || []);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  // Derived filter options
  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const entityOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.entityType).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

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

  const paginated = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Summary counts
  const createCount = logs.filter((l) => l.action === 'CREATE').length;
  const updateCount = logs.filter((l) => ['UPDATE', 'EDIT'].includes(l.action)).length;
  const deleteCount = logs.filter((l) => l.action === 'DELETE').length;
  const statusChangeCount = logs.filter((l) => l.action === 'STATUS_CHANGE').length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck size={22} className="text-blue-600" />
            Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable audit trail of all system actions, governance events, and user activity.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: logs.length, cls: 'text-slate-900' },
          { label: 'Created', value: createCount, cls: 'text-emerald-700' },
          { label: 'Updated', value: updateCount, cls: 'text-blue-700' },
          { label: 'Deleted', value: deleteCount, cls: deleteCount > 0 ? 'text-rose-700' : 'text-slate-900' },
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
            placeholder="Search by action, entity, or user..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={15} className="text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Actions</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>{String(a).replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setCurrentPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <EmptyState title="No audit logs found" description="Try adjusting your search or filters." />
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
                    <FileText size={12} className="inline mr-1" />Entity
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((log, i) => {
                  const ts = formatTimestamp(log.performedAt || log.createdAt);
                  return (
                    <tr
                      key={log.id || i}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 text-xs">{ts.date}</span>
                          <span className="text-[11px] text-slate-500">{ts.time}</span>
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
                            <span className="text-[11px] text-slate-500">{log.performedBy.email}</span>
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
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50/80"
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
