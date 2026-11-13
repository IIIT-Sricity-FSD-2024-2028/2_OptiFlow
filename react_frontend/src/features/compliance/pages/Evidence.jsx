import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { 
  Loader2, 
  ShieldAlert, 
  UserCheck, 
  Clock, 
  FolderGit2, 
  CheckCircle2, 
  XCircle, 
  Search,
  Filter,
  Layers,
  Lock,
  FileCheck
} from "lucide-react";
import { ReviewEvidenceModal } from "../components/ReviewEvidenceModal";

const PAGE_SIZE = 10;

export default function ComplianceEvidence() {
  const { user } = useAuth();
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const userRole = (user?.role || "").toLowerCase();
  const isGlobalAdmin = [
    "company_owner",
    "system_admin",
    "platform_admin",
    "superuser",
  ].includes(userRole);

  // Filters
  const [queueFilter, setQueueFilter] = useState("Pending"); // "Pending" | "Approved" | "Rejected" | "All"
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const data = await apiClient("/evidence");
      setEvidenceList(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Failed to fetch evidence", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  // Filter evidence based on queue tab, status dropdown, and search query
  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((item) => {
      // 1. Queue Quick Tab
      if (queueFilter === "Pending") {
        if (!["Under_Review", "Pending"].includes(item.status)) return false;
      } else if (queueFilter === "Approved") {
        if (item.status !== "Approved") return false;
      } else if (queueFilter === "Rejected") {
        if (item.status !== "Rejected") return false;
      }

      // 2. Status Dropdown Filter
      if (statusFilter !== "All" && item.status !== statusFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const submitterMatch = (item.user?.fullName || item.user?.email || "").toLowerCase().includes(query);
        const ruleMatch = (item.violation?.rule?.name || "").toLowerCase().includes(query);
        if (!titleMatch && !submitterMatch && !ruleMatch) return false;
      }

      return true;
    });
  }, [evidenceList, queueFilter, statusFilter, searchQuery]);

  const paginatedEvidence = filteredEvidence.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pendingCount = useMemo(() => {
    return evidenceList.filter((e) => ["Under_Review", "Pending"].includes(e.status)).length;
  }, [evidenceList]);

  const approvedCount = useMemo(() => {
    return evidenceList.filter((e) => e.status === "Approved").length;
  }, [evidenceList]);

  const rejectedCount = useMemo(() => {
    return evidenceList.filter((e) => e.status === "Rejected").length;
  }, [evidenceList]);

  const tableColumns = [
    {
      header: "DELIVERABLE / TITLE",
      accessor: "title",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[13px] text-slate-900 leading-snug">
            {row.title}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Type: {row.evidenceType || "Document"}
          </span>
        </div>
      ),
    },
    {
      header: "POLICY & SCOPE",
      accessor: "policy",
      render: (row) => {
        const policyName = row.violation?.rule?.name || "General Governance";
        const catName = row.violation?.rule?.category?.name;
        const taskTitle = row.task?.title;
        return (
          <div className="flex flex-col max-w-[240px]">
            <span className="text-xs font-medium text-slate-800 truncate" title={policyName}>
              {policyName}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
              {catName && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">{catName}</span>}
              {taskTitle && <span className="truncate" title={taskTitle}>• {taskTitle}</span>}
            </div>
          </div>
        );
      },
    },
    {
      header: "SUBMITTED BY",
      accessor: "user",
      render: (row) => {
        const subDate = row.submittedAt ? new Date(row.submittedAt) : null;
        const validDate = subDate && !isNaN(subDate.getTime());
        return (
          <div className="flex flex-col">
            <span className="font-medium text-xs text-slate-800">
              {row.user?.fullName || row.user?.email || "Team Submitter"}
            </span>
            <span className="text-[11px] text-slate-400">
              {validDate
                ? subDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "Recently"}
            </span>
          </div>
        );
      },
    },
    {
      header: "STATUS",
      accessor: "status",
      render: (row) => {
        const statusMap = {
          Approved: "success",
          Rejected: "danger",
          Under_Review: "warning",
          Pending: "default",
        };
        return (
          <Badge status={statusMap[row.status] || "default"}>
            {String(row.status || "Pending").replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      header: "ACTIONS",
      accessor: "actions",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedEvidence(row)}
          className="text-xs font-semibold hover:bg-slate-50 cursor-pointer"
        >
          {row.status === "Approved" ? "View Signoff" : "Review"}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Evidence Review Queue</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <Lock size={12} />
              {isGlobalAdmin ? "Organization View" : "Domain Isolation Active"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isGlobalAdmin
              ? "Review technical deliverables, compliance artifacts, and audit attestations across all company departments."
              : `Review technical deliverables, compliance artifacts, and audit attestations assigned to your regulatory domain (${user?.fullName || user?.email || "Officer"}).`}
          </p>
        </div>
      </div>

      {/* Queue Selection Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setQueueFilter("Pending");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              queueFilter === "Pending"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Clock size={14} />
            <span>Pending Review ({pendingCount})</span>
          </button>

          <button
            onClick={() => {
              setQueueFilter("Approved");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              queueFilter === "Approved"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Approved ({approvedCount})</span>
          </button>

          <button
            onClick={() => {
              setQueueFilter("Rejected");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              queueFilter === "Rejected"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <XCircle size={14} />
            <span>Rejected ({rejectedCount})</span>
          </button>

          <button
            onClick={() => {
              setQueueFilter("All");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              queueFilter === "All"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Layers size={14} />
            <span>
              {isGlobalAdmin
                ? `All Submissions (${evidenceList.length})`
                : `All Domain Submissions (${evidenceList.length})`}
            </span>
          </button>
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Under_Review">Under Review</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {queueFilter === "Pending"
                ? "Submissions Awaiting Your Review"
                : queueFilter === "Approved"
                  ? "Approved Domain Deliverables"
                  : queueFilter === "Rejected"
                    ? "Rejected Deliverables (Revision Pending)"
                    : "All Domain Submissions"}
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Showing {filteredEvidence.length} submission{filteredEvidence.length !== 1 ? "s" : ""}
          </span>
        </div>

        <Table
          columns={tableColumns}
          data={paginatedEvidence}
          emptyMessage={
            queueFilter === "Pending"
              ? "No pending evidence submissions waiting for your review."
              : queueFilter === "Approved"
                ? "No approved evidence records in your domain yet."
                : queueFilter === "Rejected"
                  ? "No rejected evidence submissions in your domain."
                  : "No evidence submissions found matching your filters."
          }
        />

        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredEvidence.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <ReviewEvidenceModal
        isOpen={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        evidence={selectedEvidence}
        onReviewed={fetchEvidence}
      />
    </div>
  );
}
