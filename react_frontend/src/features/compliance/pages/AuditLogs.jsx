import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { Loader2, Eye, FileText } from "lucide-react";
import { AuditLogDetailModal } from "../components/AuditLogDetailModal";
import { GenerateReportModal } from "../components/GenerateReportModal";

const PAGE_SIZE = 10;

export default function ComplianceAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await apiClient("/audit-logs");
        setLogs(Array.isArray(data) ? data : data?.data || []);
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const tableColumns = [
    { 
      header: "TIMESTAMP", 
      accessor: "performedAt",
      render: (row) => {
        const d = new Date(row.performedAt);
        return (
          <div className="flex flex-col text-sm">
            <span className="font-semibold text-slate-800">
              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-xs text-slate-500">
              {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
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
          <span>Generate Report</span>
        </Button>
      </div>

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
