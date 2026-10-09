import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Loader2, ShieldAlert } from "lucide-react";
import { ReviewEvidenceModal } from "../components/ReviewEvidenceModal";

export default function ComplianceEvidence() {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  // Fetch data from the API
  const fetchEvidence = async () => {
    try {
      setLoading(true);
      const data = await apiClient("/evidence");
      setEvidenceList(data);
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
    <div className="p-8 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen text-[#1a2332]">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="text-blue-600 w-8 h-8" />
        <div>
          <h1 className="text-2xl font-semibold">Evidence Review Queue</h1>
          <p className="text-gray-500 text-sm mt-1">Review submitted documents for compliance violations.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <Table 
          columns={tableColumns} 
          data={evidenceList} 
          emptyMessage="No evidence submissions found in the queue."
        />
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
