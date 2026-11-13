import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { ResolveViolationModal } from "../components/ResolveViolationModal";
import {
  AlertTriangle,
  Filter,
  Loader2,
  ShieldCheck,
  FolderGit2,
  Clock,
  ShieldAlert,
  UserCheck,
  Lock,
} from "lucide-react";

const PAGE_SIZE = 10;

export default function ComplianceViolations() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "All";
  const initialQueue = searchParams.get("queue") || "Active";

  const [violations, setViolations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const [queueFilter, setQueueFilter] = useState(initialQueue);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const userRole = (user?.role || "").toLowerCase();
  const isGlobalAdmin = [
    "company_owner",
    "system_admin",
    "platform_admin",
    "superuser",
  ].includes(userRole);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, evidenceRes, projectsRes, tasksRes] = await Promise.all([
        apiClient("/compliance-violations").catch((err) => {
          console.error("Failed to load violations:", err);
          return [];
        }),
        apiClient("/evidence").catch(() => []),
        apiClient("/projects").catch(() => []),
        apiClient("/tasks").catch(() => []),
      ]);

      const list = Array.isArray(res) ? res : res?.data || [];
      const evidenceList = Array.isArray(evidenceRes)
        ? evidenceRes
        : evidenceRes?.data || [];
      const projList = Array.isArray(projectsRes)
        ? projectsRes
        : projectsRes?.data || [];
      const taskList = Array.isArray(tasksRes)
        ? tasksRes
        : tasksRes?.data || [];

      setProjects(projList);

      // Maps for project resolution
      const projMap = new Map();
      projList.forEach((p) => {
        if (p?.id) projMap.set(String(p.id), p.name);
      });

      const taskProjMap = new Map();
      taskList.forEach((t) => {
        if (t?.id && t.projectId) {
          taskProjMap.set(String(t.id), String(t.projectId));
        }
      });

      const resolveProject = (entityType, entityId) => {
        if (!entityId) return { id: null, name: "Company / Global" };
        const entityIdStr = String(entityId);
        if (entityType === "Project") {
          return {
            id: entityIdStr,
            name:
              projMap.get(entityIdStr) ||
              `Project #${entityIdStr.substring(0, 8)}`,
          };
        }
        if (entityType === "Task") {
          const pId = taskProjMap.get(entityIdStr);
          if (pId) {
            const pIdStr = String(pId);
            return {
              id: pIdStr,
              name: projMap.get(pIdStr) || `Project #${pIdStr.substring(0, 8)}`,
            };
          }
        }
        return { id: null, name: "Company / Global" };
      };

      const formatted = list.map((v) => {
        const parentProj = resolveProject(v?.entityType, v?.entityId);
        return {
          ...v,
          projectId: parentProj.id,
          projectName: parentProj.name,
          evidenceCount: evidenceList.filter(
            (e) =>
              e &&
              (e.violationId === v?.id ||
                (v?.entityId && e.taskId === v.entityId)),
          ).length,
        };
      });

      setViolations(formatted);
    } catch (err) {
      console.error("Failed to load compliance violations:", err);
      setError(err?.message || "Failed to load compliance violations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const filteredViolations = violations.filter((v) => {
    const matchesStatus =
      statusFilter === "All" || v.status === statusFilter;
    const matchesSeverity =
      severityFilter === "All" ||
      v.severity === severityFilter ||
      v.rule?.severity === severityFilter;
    const matchesProject =
      projectFilter === "All" ||
      (projectFilter === "global"
        ? v.projectId === null
        : String(v.projectId) === String(projectFilter));

    let matchesQueue = true;
    if (queueFilter === "Active") {
      matchesQueue = ["Open", "Under_Review"].includes(v.status);
    } else if (queueFilter === "Breached") {
      matchesQueue = Boolean(
        v.breachedAt ||
          (v.status === "Open" &&
            v.dueDate &&
            new Date(v.dueDate) < new Date()),
      );
    } else if (queueFilter === "Resolved") {
      matchesQueue = ["Resolved", "Ignored"].includes(v.status);
    } else if (queueFilter === "All") {
      matchesQueue = true;
    }

    return matchesStatus && matchesSeverity && matchesProject && matchesQueue;
  });

  const paginatedViolations = filteredViolations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
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
            {row.entityName ||
              `${row.entityType || "General"} #${String(row.entityId || "N/A").substring(0, 8)}`}
          </span>
          <span className="text-xs text-slate-500">
            {row.entityType || "Entity"}
          </span>
        </div>
      ),
    },
    {
      header: "POLICY VIOLATED",
      accessor: "policy",
      render: (row) => (
        <span className="font-medium text-[13px] text-slate-800">
          {row.rule?.name || `Rule #${row.ruleId || "N/A"}`}
        </span>
      ),
    },
    {
      header: "ASSIGNED OFFICER",
      accessor: "officer",
      render: (row) => {
        const officer =
          row.assignedOfficer ||
          row.rule?.assignedOfficer ||
          row.rule?.category?.owner;
        const isMe = officer?.id && officer.id === user?.id;
        return (
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
              {officer?.fullName ? officer.fullName.charAt(0) : "—"}
            </span>
            <span
              className="text-xs font-medium text-slate-700 truncate max-w-[110px]"
              title={officer?.fullName || "Unassigned"}
            >
              {officer?.fullName || "Unassigned"}
            </span>
            {isMe && (
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
        );
      },
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
          {String(row.status || "Open").replace("_", " ")}
        </Badge>
      ),
    },
    {
      header: "REMEDIATION SLA",
      accessor: "dueDate",
      render: (row) => {
        if (row.status === "Resolved") {
          return (
            <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
              <ShieldCheck size={13} />
              Resolved
            </span>
          );
        }

        const isBreached = Boolean(
          row.breachedAt ||
            (row.status === "Open" &&
              row.dueDate &&
              new Date(row.dueDate) < new Date()),
        );

        if (isBreached) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
              <ShieldAlert size={12} className="text-rose-600" />
              SLA BREACHED
            </span>
          );
        }

        if (row.dueDate) {
          const due = new Date(row.dueDate);
          if (!isNaN(due.getTime())) {
            const hoursRemaining = Math.max(
              0,
              Math.round((due.getTime() - Date.now()) / (1000 * 3600)),
            );
            return (
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <Clock
                    size={12}
                    className={
                      hoursRemaining <= 24
                        ? "text-amber-600"
                        : "text-slate-400"
                    }
                  />
                  {hoursRemaining}h left
                </span>
                <span className="text-[10px] text-slate-400">
                  {due.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          }
        }

        return <span className="text-xs text-slate-400">Standard (72h)</span>;
      },
    },
    {
      header: "EVIDENCE",
      accessor: "evidenceCount",
      render: (row) => (
        <Badge status={row.evidenceCount > 0 ? "info" : "default"}>
          {row.evidenceCount > 0 ? `${row.evidenceCount} file(s)` : "None"}
        </Badge>
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
          {row.status === "Resolved" ? "Resolved" : "Fast-Track Waiver"}
        </Button>
      ),
    },
  ];

  const activeQueueCount = useMemo(() => {
    return violations.filter((v) =>
      ["Open", "Under_Review"].includes(v.status),
    ).length;
  }, [violations]);

  const breachedCount = useMemo(() => {
    return violations.filter((v) =>
      Boolean(
        v.breachedAt ||
          (v.status === "Open" &&
            v.dueDate &&
            new Date(v.dueDate) < new Date()),
      ),
    ).length;
  }, [violations]);

  const resolvedCount = useMemo(() => {
    return violations.filter((v) =>
      ["Resolved", "Ignored"].includes(v.status),
    ).length;
  }, [violations]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Compliance Violations
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <Lock size={12} />
              {isGlobalAdmin ? "Organization View" : "Domain Isolation Active"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isGlobalAdmin
              ? "Track, audit, and force-resolve compliance flags across all organizational departments."
              : `Review and resolve compliance violations specifically assigned to your regulatory domain (${user?.fullName || user?.email || "Officer"}).`}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Quick Filters - Scoped strictly to domain */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setQueueFilter("Active");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
            queueFilter === "Active"
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <UserCheck size={14} />
          <span>Active Domain Queue ({activeQueueCount})</span>
        </button>

        <button
          onClick={() => {
            setQueueFilter("Breached");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
            queueFilter === "Breached"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-rose-600 hover:bg-rose-50"
          }`}
        >
          <ShieldAlert size={14} />
          <span>SLA Breached ({breachedCount})</span>
        </button>

        <button
          onClick={() => {
            setQueueFilter("Resolved");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
            queueFilter === "Resolved"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ShieldCheck size={14} />
          <span>Resolved & Waived ({resolvedCount})</span>
        </button>

        <button
          onClick={() => {
            setQueueFilter("All");
            setCurrentPage(1);
          }}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            queueFilter === "All"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {isGlobalAdmin
            ? `All Organization Violations (${violations.length})`
            : `All Domain Flags (${violations.length})`}
        </button>
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
              const nextParams = new URLSearchParams(searchParams);
              if (val === "All") {
                nextParams.delete("projectId");
              } else {
                nextParams.set("projectId", val);
              }
              setSearchParams(nextParams, { replace: true });
            }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-medium cursor-pointer"
          >
            <option value="All">All Projects & Global Scopes</option>
            <option value="global">Company / Global Only</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
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
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {filteredViolations.length}
          </span>{" "}
          of {violations.length} total domain flags
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              {queueFilter === "Active"
                ? "Active Domain Violations (Action Required)"
                : queueFilter === "Breached"
                  ? "SLA-Breached Violations in Your Domain"
                  : queueFilter === "Resolved"
                    ? "Remediated & Waived History"
                    : "All Domain Flags"}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {filteredViolations.length} Active
          </span>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={paginatedViolations}
            loading={loading}
            emptyMessage={
              queueFilter === "Active"
                ? "No open or under-review violations in your regulatory domain."
                : queueFilter === "Breached"
                  ? "No SLA-breached violations active in your domain."
                  : queueFilter === "Resolved"
                    ? "No resolved violations recorded yet."
                    : "No violations match the selected filters."
            }
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
