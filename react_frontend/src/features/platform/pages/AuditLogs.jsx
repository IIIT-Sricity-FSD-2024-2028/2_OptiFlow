import { useState } from 'react';
import { History, AlertTriangle } from 'lucide-react';
import { Pagination } from '../../../shared/components/Pagination';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditFilterBar } from '../components/audit/AuditFilterBar';
import { AuditTable } from '../components/audit/AuditTable';
import { AuditDetailDrawer } from '../components/audit/AuditDetailDrawer';

export default function PlatformAuditLogs() {
  const {
    logs, total, page, setPage, pageSize,
    q, setQ, action, setAction,
    entityType, setEntityType,
    datePreset, setDatePreset,
    startDate, setStartDate,
    endDate, setEndDate,
    loading, error, refetch, resetFilters,
  } = useAuditLogs(20);

  const [selectedLog, setSelectedLog] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-slate-700" />
            Platform Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Read-only evidence trail of all administrative actions and security mutations across tenants.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => refetch()} className="text-xs font-bold underline hover:no-underline">Retry</button>
        </div>
      )}

      <AuditFilterBar
        q={q}
        onQChange={setQ}
        action={action}
        onActionChange={setAction}
        entityType={entityType}
        onEntityTypeChange={setEntityType}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onReset={resetFilters}
      />

      <AuditTable
        logs={logs}
        loading={loading}
        onSelectLog={setSelectedLog}
      />

      <Pagination
        currentPage={page}
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      <AuditDetailDrawer
        log={selectedLog}
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
