import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { ResolveViolationModal } from "../components/ResolveViolationModal";
import { AlertTriangle, Filter, Loader2, ShieldCheck, FolderGit2 } from "lucide-react";

const PAGE_SIZE = 10;

export default function ComplianceViolations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "All";

  const [violations, setViolations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const [res, evidenceRes, projectsRes, tasksRes] = await Promise.all([
        apiClient("/compliance-violations").catch(() => []),
        apiClient("/evidence").catch(() => []),
        apiClient("/projects").catch(() => []),
        apiClient("/tasks").catch(() => []),
      ]);

      const list = Array.isArray(res) ? res : res?.data || [];
      const evidenceList = Array.isArray(evidenceRes) ? evidenceRes : evidenceRes?.data || [];
      const projList = Array.isArray(projectsRes) ? projectsRes : projectsRes?.data || [];
      const taskList = Array.isArray(tasksRes) ? tasksRes : tasksRes?.data || [];

      setProjects(projList);

      // Maps for project resolution
      const projMap = new Map();
      projList.forEach((p) => projMap.set(String(p.id), p.name));

      const taskProjMap = new Map();
      taskList.forEach((t) => {
        if (t.id && t.projectId) taskProjMap.set(String(t.id), String(t.projectId));
      });

      const resolveProject = (entityType, entityId) => {
        if (!entityId) return { id: null, name: "Company / Global" };
        if (entityType === "Project") {
          return { id: String(entityId), name: projMap.get(String(entityId)) || `Project #${String(entityId).substring(0, 8)}` };
        }
        if (entityType === "Task") {
          const pId = taskProjMap.get(String(entityId));
          if (pId) {
            return { id: pId, name: projMap.get(pId) || `Project #${pId.substring(0, 8)}` };
          }
        }
        return { id: null, name: "Company / Global" };
      };

      const formatted = list.map((v) => {
        const parentProj = resolveProject(v.entityType, v.entityId);
        return {
          ...v,
          projectId: parentProj.id,
          projectName: parentProj.name,
          evidenceCount: evidenceList.filter((e) => e.violationId === v.id || e.taskId === v.entityId).length,
        };
      });

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
    const matchesProject = projectFilter === "All" || 
      (projectFilter === "global" ? v.projectId === null : String(v.projectId) === String(projectFilter));
    return matchesStatus && matchesSeverity && matchesProject;
  });

  const paginatedViolations = filteredViolations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const columns = [
    {
      header: "PROJECT / SCOPE",
      accessor: "projectName",
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-xs text-slate-700">
          <FolderGit2 size={13} className="text-slate-400 shrink-0" />
          <span className="truncate max-w-[170px]" title={row.projectName}>
            {row.projectName || "Company / Global"}
          </span>
        </div>
      ),
    },
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance Violations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track, audit, and force-resolve compliance flags generated across all projects, tasks, and users.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filters:</span>
          
          {/* Project Scope Filter */}
          <select
            value={projectFilter}
            onChange={(e) => {
              const val = e.target.value;
              setProjectFilter(val);
              setCurrentPage(1);
              if (val === "All") {
                searchParams.delete("projectId");
              } else {
                searchParams.set("projectId", val);
              }
              setSearchParams(searchParams, { replace: true });
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium cursor-pointer"
          >
            <option value="All">All Projects & Global Scopes</option>
            <option value="global">Company / Global Only</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under_Review">Under Review</option>
            <option value="Resolved">Resolved</option>
            <option value="Ignored">Ignored</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium cursor-pointer"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <span className="text-sm font-medium text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filteredViolations.length}</span> of {violations.length} total flags
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">Active Remediation Queue</h2>
          </div>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={paginatedViolations}
            loading={loading}
            emptyMessage="No violations match the selected filters."
          />
        </div>
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredViolations.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
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
