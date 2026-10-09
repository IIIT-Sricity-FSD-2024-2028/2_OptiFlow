import React from "react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";

export function AuditLogDetailModal({ isOpen, onClose, log }) {
  if (!log) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Audit Log Details"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-6 text-sm">
        {/* Header Info */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Timestamp</span>
            <span className="text-slate-900">{new Date(log.performedAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Action</span>
            <Badge status={
              log.action === 'CREATE' ? 'success' : 
              log.action === 'DELETE' ? 'danger' : 
              log.action === 'STATUS_CHANGE' ? 'warning' : 'info'
            }>
              {log.action.replace('_', ' ')}
            </Badge>
          </div>
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Performed By</span>
            <span className="text-slate-900">{log.performedBy?.fullName || log.performedBy?.email || 'System'}</span>
          </div>
          <div>
            <span className="font-semibold block text-slate-500 mb-1">Entity Affected</span>
            <span className="font-mono text-xs bg-slate-200 px-2 py-1 rounded text-slate-700">
              {log.entityType} #{log.entityId.substring(0,8)}
            </span>
          </div>
        </div>

        {/* Human-Readable Diff */}
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-700 border-b border-slate-200 pb-2">Changes</h4>
          
          {(!log.oldValue && !log.newValue) ? (
            <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500">
              No specific fields recorded for this action.
            </div>
          ) : (
            <ul className="space-y-3">
              {Object.keys(log.newValue || {}).map((key) => {
                const oldVal = log.oldValue?.[key];
                const newVal = log.newValue?.[key];

                if (oldVal === newVal) return null;

                return (
                  <li key={key} className="flex items-start gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <span className="font-medium text-slate-700 w-1/4 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div className="flex-1 text-slate-600 flex flex-wrap items-center gap-2">
                      {oldVal !== undefined && (
                        <>
                          <span className="line-through text-red-500 bg-red-50 px-2 py-0.5 rounded">{String(oldVal)}</span>
                          <span className="text-slate-400">→</span>
                        </>
                      )}
                      <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">{String(newVal)}</span>
                    </div>
                  </li>
                );
              })}
              
              {/* Show deleted keys if any */}
              {Object.keys(log.oldValue || {}).filter(k => !log.newValue?.hasOwnProperty(k)).map((key) => (
                <li key={key} className="flex items-start gap-3 bg-white p-3 rounded border border-slate-200 shadow-sm">
                  <span className="font-medium text-slate-700 w-1/4 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <div className="flex-1 text-slate-600">
                    <span className="line-through text-red-500 bg-red-50 px-2 py-0.5 rounded">{String(log.oldValue[key])}</span>
                    <span className="text-slate-400 ml-2 italic">(Removed)</span>
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
