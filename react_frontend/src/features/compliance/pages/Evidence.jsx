import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Pagination } from "../../../shared/components/Pagination";
import { Loader2, ShieldAlert } from "lucide-react";
import { ReviewEvidenceModal } from "../components/ReviewEvidenceModal";

const PAGE_SIZE = 10;

export default function ComplianceEvidence() {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data from the API
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

  // Run once when the component mounts
  useEffect(() => {
    fetchEvidence();
  }, []);

  const paginatedEvidence = evidenceList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Define how the table should map our data
  const tableColumns = [
    { 
      header: "EVIDENCE TITLE", 
      accessor: "title" 
    },
    { 
      header: "SUBMITTED BY", 
      accessor: "user", 
      render: (row) => (
        <span className="font-medium text-slate-700">
          {row.user?.fullName || row.user?.email || "Unknown"}
        </span>
      )
    },
    { 
      header: "VIOLATION", 
      accessor: "violation", 
      render: (row) => row.violation?.rule?.name || `Violation #${(row.violationId || "").substring(0,6)}`
    },
    { 
      header: "STATUS", 
      accessor: "status",
      render: (row) => (
        <Badge status={
          row.status === 'Approved' ? 'success' : 
          row.status === 'Rejected' ? 'danger' : 
          row.status === 'Under_Review' ? 'warning' : 'default'
        }>
          {row.status.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      header: "ACTIONS", 
      accessor: "actions",
      render: (row) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setSelectedEvidence(row)}
        >
          Review
        </Button>
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Evidence Review Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and adjudicate compliance attestations, technical artifacts, and evidence submissions.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Pending & Adjudicated Submissions</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Total Submissions: {evidenceList.length}
          </span>
        </div>
        <Table 
          columns={tableColumns} 
          data={paginatedEvidence} 
          emptyMessage="No evidence submissions found in the queue."
        />
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <Pagination
            currentPage={currentPage}
            totalItems={evidenceList.length}
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
