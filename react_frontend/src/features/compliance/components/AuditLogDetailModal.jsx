import React from "react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { formatAuditTimestamp } from "../../../shared/utils/formatDate";

// Internal foreign key IDs that should not clutter the human-readable changes diff
const IGNORED_DIFF_KEYS = new Set([
  'resolvedById',
  'reportedById',
  'companyId',
  'teamId',
  'createdById',
  'updatedById',
  'assignedToId',
  'userId',
  'ruleId',
  'templateId',
  'projectId',
  'taskId',
  'violationId',
  'id'
]);

const isUuid = (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

const shouldSkipKey = (key, val) => {
  if (IGNORED_DIFF_KEYS.has(key)) return true;
  if (key.endsWith('Id') || key.endsWith('_id')) {
    if (isUuid(val)) return true;
  }
  return false;
};

const formatAuditValue = (key, val) => {
  if (val === null || val === undefined) return '—';

  // Check if date
  const isDateKey = /date|at$|_at$/i.test(key);
  const isIsoDate = typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val);

  if (isDateKey || isIsoDate) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    }
  }

  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No';
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  if (typeof val === 'string' && (key.toLowerCase().includes('status') || val === 'Under_Review')) {
    return val.replace(/_/g, ' ');
  }

  return String(val);
};

const formatKeyLabel = (key) => {
  if (key === 'oldStatus') return 'Previous Status';
  if (key === 'newStatus') return 'New Status';
  if (key === 'resolvedAt') return 'Resolved At';
  if (key === 'resolutionRemarks') return 'Resolution Remarks';
  if (key === 'overrideReason') return 'Override Reason';
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
};

export function AuditLogDetailModal({ isOpen, onClose, log }) {
  if (!log) return null;

  // Filter out internal foreign key ID fields
  const filteredNewKeys = Object.keys(log.newValue || {}).filter(
    (key) => !shouldSkipKey(key, log.newValue?.[key])
  );

  const filteredOldKeys = Object.keys(log.oldValue || {}).filter(
    (key) => !shouldSkipKey(key, log.oldValue?.[key])
  );

  const hasAnyChanges = filteredNewKeys.length > 0 || filteredOldKeys.length > 0;

  const ts = formatAuditTimestamp(log.performedAt || log.createdAt);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Audit Log Details"
      className="max-w-2xl"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="secondary" onClick={onClose} className="px-5 py-2 text-sm font-semibold">
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-sm">
        {/* Header Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 p-5 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Timestamp</span>
            <span className="text-sm font-semibold text-slate-900">{ts.full}</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Action</span>
            <Badge status={
              log.action === 'CREATE' ? 'success' : 
              log.action === 'DELETE' ? 'danger' : 
              log.action === 'STATUS_CHANGE' ? 'warning' : 'info'
            }>
              <span className="text-xs font-semibold">{log.action?.replace('_', ' ')}</span>
            </Badge>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Performed By</span>
            <span className="text-sm font-semibold text-slate-900">{log.performedBy?.fullName || log.performedBy?.email || 'System Automated'}</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Entity Affected</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                {log.entityName || (log.entityType ? log.entityType.replace(/([A-Z])/g, ' $1').trim() : 'General Entity')}
              </span>
              {log.entityId && (
                <span className="font-mono text-xs text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md border border-slate-300/60">
                  #{log.entityId.substring(0, 8)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Human-Readable Changes Diff */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h4 className="text-base font-bold text-slate-800">Event Details & State Changes</h4>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Record</span>
          </div>
          
          {!hasAnyChanges ? (
            <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
              No state modifications recorded for this event.
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredNewKeys.map((key) => {
                const oldVal = log.oldValue?.[key];
                const newVal = log.newValue?.[key];

                if (oldVal === newVal && oldVal !== undefined) return null;

                const formattedOld = formatAuditValue(key, oldVal);
                const formattedNew = formatAuditValue(key, newVal);

                return (
                  <li key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                    <span className="text-sm font-semibold text-slate-800 capitalize sm:w-1/3">
                      {formatKeyLabel(key)}
                    </span>
                    <div className="flex-1 flex flex-wrap items-center gap-2.5 text-sm">
                      {oldVal !== undefined && (
                        <>
                          <span className="line-through text-rose-600 bg-rose-50 px-3 py-1 rounded-md text-sm border border-rose-200/60 font-medium">
                            {formattedOld}
                          </span>
                          <span className="text-slate-400 font-bold">→</span>
                        </>
                      )}
                      <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md text-sm border border-emerald-200/60 font-medium">
                        {formattedNew}
                      </span>
                    </div>
                  </li>
                );
              })}
              
              {/* Show deleted keys if any */}
              {filteredOldKeys.filter(k => !log.newValue?.hasOwnProperty(k)).map((key) => (
                <li key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                  <span className="text-sm font-semibold text-slate-800 capitalize sm:w-1/3">
                    {formatKeyLabel(key)}
                  </span>
                  <div className="flex-1 flex items-center gap-2 text-sm">
                    <span className="line-through text-rose-600 bg-rose-50 px-3 py-1 rounded-md text-sm border border-rose-200/60 font-medium">
                      {formatAuditValue(key, log.oldValue[key])}
                    </span>
                    <span className="text-slate-400 text-xs italic font-medium">(Removed)</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
