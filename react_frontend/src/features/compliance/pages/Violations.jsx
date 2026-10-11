import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { ResolveViolationModal } from "../components/ResolveViolationModal";
import { AlertTriangle, Filter, Loader2, ShieldCheck } from "lucide-react";

export default function ComplianceViolations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [selectedViolation, setSelectedViolation] = useState(null);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const [res, evidenceRes] = await Promise.all([
        apiClient("/compliance-violations").catch(() => []),
        apiClient("/evidence").catch(() => []),
      ]);

      const list = Array.isArray(res) ? res : res?.data || [];
      const evidenceList = Array.isArray(evidenceRes) ? evidenceRes : evidenceRes?.data || [];

      const formatted = list.map((v) => ({
        ...v,
        evidenceCount: evidenceList.filter((e) => e.violationId === v.id || e.taskId === v.entityId).length,
      }));

      setViolations(formatted);
    } catch (err) {
      console.error("Failed to load compliance violations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const filteredViolations = violations.filter((v) => {
    const matchesStatus = statusFilter === "All" || v.status === statusFilter;
    const matchesSeverity = severityFilter === "All" || v.severity === severityFilter || v.rule?.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const columns = [
    {
      header: "VIOLATING ENTITY",
      accessor: "entityName",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[13px] text-slate-800">
            {row.entityName || `${row.entityType || "General"} #${(row.entityId || "N/A").substring(0, 8)}`}
          </span>
          <span className="text-xs text-slate-500">{row.entityType || "Entity"}</span>
        </div>
      ),
    },
    {
      header: "POLICY VIOLATED",
      accessor: "policy",
      render: (row) => (
        <span className="font-medium text-[13px] text-slate-800">
          {row.rule?.name || `Rule #${row.ruleId}`}
        </span>
      ),
    },
    {
      header: "SEVERITY",
      accessor: "severity",
      render: (row) => {
        const sev = row.severity || row.rule?.severity || "Medium";
        return (
          <Badge
            status={
              sev === "Critical" || sev === "High"
                ? "danger"
                : sev === "Medium"
                ? "warning"
                : "info"
            }
          >
            {sev}
          </Badge>
        );
      },
    },
    {
      header: "STATUS",
      accessor: "status",
      render: (row) => (
        <Badge
          status={
            row.status === "Open"
              ? "danger"
              : row.status === "Under_Review"
              ? "warning"
              : row.status === "Resolved"
              ? "success"
              : "default"
          }
        >
          {row.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "EVIDENCE ATTACHED",
      accessor: "evidenceCount",
      render: (row) => (
        <Badge status={row.evidenceCount > 0 ? "info" : "default"}>
          {row.evidenceCount > 0 ? `${row.evidenceCount} file(s)` : "None"}
        </Badge>
      ),
    },
    {
      header: "DETECTED AT",
      accessor: "detectedAt",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.detectedAt || Date.now()).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "ACTION",
      accessor: "action",
      render: (row) => (
        <Button
          variant={row.status === "Resolved" ? "ghost" : "secondary"}
          size="sm"
          disabled={row.status === "Resolved"}
          onClick={() => setSelectedViolation(row)}
        >
          {row.status === "Resolved" ? "Resolved" : "Manual Override"}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen text-[#1a2332]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a2332] mb-1">Compliance Violations</h1>
          <p className="text-sm text-slate-500">
            Track, audit, and force-resolve compliance flags generated across all projects, tasks, and users.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filters:</span>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-none focus:border-blue-500 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under_Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Ignored">Ignored</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-slate-50 text-slate-700 outline-none focus:border-blue-500 font-medium"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing {filteredViolations.length} of {violations.length} total flags
        </span>
      </div>

      <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-[15px] font-bold text-[#1a2332]">All Audit Records</h2>
          </div>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={filteredViolations}
            loading={loading}
            emptyMessage="No violations match the selected filters."
          />
        </div>
      </div>

      <ResolveViolationModal
        isOpen={!!selectedViolation}
        onClose={() => setSelectedViolation(null)}
        violation={selectedViolation}
        onResolved={fetchViolations}
      />
    </div>
  );
}
