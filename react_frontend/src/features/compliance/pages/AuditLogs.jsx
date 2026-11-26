import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { PATHS } from "../../../app/paths";
import {
  fetchAuditLogs,
  selectAllAuditLogs,
  selectAuditLogsError,
  selectAuditLogsStatus,
} from "../../../store/auditLogs";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { Loader2, Eye, FileText, History } from "lucide-react";
import { formatAuditTimestamp } from "../../../shared/utils/formatDate";
import { AuditLogDetailModal } from "../components/AuditLogDetailModal";
import { GenerateReportModal } from "../components/GenerateReportModal";

const PAGE_SIZE = 10;

export default function ComplianceAuditLogs() {
  const dispatch = useDispatch();
  const logs = useSelector(selectAllAuditLogs);
  const status = useSelector(selectAuditLogsStatus);
  const error = useSelector(selectAuditLogsError);
  const loading = status === "loading" && logs.length === 0;

  const [selectedLog, setSelectedLog] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    dispatch(fetchAuditLogs());
  }, [dispatch]);

  const tableColumns = [
    { 
      header: "TIMESTAMP", 
      accessor: "performedAt",
      render: (row) => {
        const ts = formatAuditTimestamp(row.performedAt || row.createdAt);
        return (
          <div className="flex flex-col text-sm">
            <span className={`font-semibold ${ts.isSameDay ? 'text-blue-700' : 'text-slate-800'}`}>
              {ts.primary}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {ts.secondary}
            </span>
          </div>
        );
      }
    },
    { 
      header: "ACTION", 
      accessor: "action",
      render: (row) => (
        <Badge status={
          row.action === 'CREATE' ? 'success' : 
          row.action === 'DELETE' ? 'danger' : 
          row.action === 'STATUS_CHANGE' ? 'warning' : 'info'
        }>
          <span className="text-xs font-semibold">{row.action?.replace('_', ' ')}</span>
        </Badge>
      )
    },
    { 
      header: "PERFORMED BY", 
      accessor: "user",
      render: (row) => (
        <div className="flex flex-col text-sm">
          <span className="font-semibold text-slate-800">{row.performedBy?.fullName || 'System Automated'}</span>
          {row.performedBy?.email && <span className="text-xs text-slate-500">{row.performedBy.email}</span>}
        </div>
      )
    },
    { 
      header: "ENTITY", 
      accessor: "entity",
      render: (row) => {
        const formatEntityType = (type) => {
          if (!type) return 'General Entity';
          if (type === 'ComplianceRule') return 'Compliance Rule';
          if (type === 'ComplianceViolation') return 'Compliance Violation';
          if (type === 'ComplianceEvidence') return 'Compliance Evidence';
          return type.replace(/([A-Z])/g, ' $1').trim();
        };

        const typeLabel = formatEntityType(row.entityType);

        return (
          <div className="flex flex-col gap-1.5 py-1.5">
            <span className="font-semibold text-sm text-slate-800 leading-snug">
              {row.entityName || (row.entityId ? `${typeLabel} #${row.entityId.substring(0, 8)}` : typeLabel)}
            </span>
            {row.entityType && (
              <span className="text-xs font-medium text-slate-500">
                {typeLabel}
              </span>
            )}
          </div>
        );
      }
    },
    { 
      header: "ACTION", 
      accessor: "actions",
      render: (row) => (
        <button 
          type="button"
          onClick={() => setSelectedLog(row)}
          className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50/80 cursor-pointer"
          title="View Details"
          aria-label="View Details"
        >
          <Eye size={18} />
        </button>
      )
    }
  ];

  const paginatedLogs = logs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Header with Generate Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable regulatory audit log tracking system modifications, rule evaluations, and governance events.
          </p>
        </div>
        <Button
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <FileText size={16} />
          <span>Export Report</span>
        </Button>
      </div>

      {/* Reports & Audit Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to={PATHS.COMPLIANCE.REPORTS}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <FileText size={14} className="text-slate-400" />
          <span>Report Generator</span>
        </Link>
        <Link
          to={PATHS.COMPLIANCE.AUDIT_LOGS}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
        >
          <History size={14} />
          <span>System Audit Trail</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm" role="alert">
          {error.message || "Failed to load compliance audit trail."}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table 
          columns={tableColumns} 
          data={paginatedLogs} 
          emptyMessage="No audit logs found."
        />
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalItems={logs.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <AuditLogDetailModal 
        isOpen={!!selectedLog} 
        onClose={() => setSelectedLog(null)} 
        log={selectedLog} 
      />

      <GenerateReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
