import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Loader2, ShieldCheck, Eye } from "lucide-react";
import { AuditLogDetailModal } from "../components/AuditLogDetailModal";

export default function ComplianceAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await apiClient("/audit-logs");
        setLogs(data);
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
      render: (row) => new Date(row.performedAt).toLocaleString()
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
          {row.action.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      header: "PERFORMED BY", 
      accessor: "user",
      render: (row) => <span className="font-medium text-slate-700">{row.performedBy?.fullName || row.performedBy?.email || 'System'}</span>
    },
    { 
      header: "ENTITY", 
      accessor: "entity",
      render: (row) => (
        <span className="font-medium text-slate-700">
          {row.entityName || `${row.entityType} #${row.entityId.substring(0,8)}`}
        </span>
      )
    },
    { 
      header: "ACTIONS", 
      accessor: "actions",
      render: (row) => (
        <button 
          onClick={() => setSelectedLog(row)}
          className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50"
          title="View Details"
        >
          <Eye className="w-5 h-5" />
        </button>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen text-[#1a2332]">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="text-blue-600 w-8 h-8" />
        <div>
          <h1 className="text-2xl font-semibold">Compliance Audit Trail</h1>
          <p className="text-gray-500 text-sm mt-1">Immutable ledger of all compliance-related system changes.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <Table 
          columns={tableColumns} 
          data={logs} 
          emptyMessage="No audit logs found."
        />
      </div>

      <AuditLogDetailModal 
        isOpen={!!selectedLog} 
        onClose={() => setSelectedLog(null)} 
        log={selectedLog} 
      />
    </div>
  );
}
