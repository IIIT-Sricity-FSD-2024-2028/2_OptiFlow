import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import { StatCard } from "../../../shared/components/StatCard";
import { Button } from "../../../shared/components/Button";
import { Badge } from "../../../shared/components/Badge";
import { Loader } from "../../../shared/components/Loader";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Table } from "../../../shared/components/Table";
import { Modal } from "../../../shared/components/Modal";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { FormField, Input } from "../../../shared/components/FormField";
import { formatDate } from "../../../shared/utils/formatDate";

// WHY: HrBranches provides the organizational foundation for multi-branch companies.
// It allows HR Administrators to manage physical branches, territorial office hubs,
// and track team allocation across regions, while respecting role authorization boundaries.
export default function HrBranches() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Raw branch records loaded from backend API
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal and form states for creating a branch
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WHY: Zero-Clutter Hard Action Suppression dictates that unauthorized users
  // never see mutation triggers (create/delete buttons) that would yield 403 Forbidden errors.
  const canManageBranches = [
    "company_owner",
    "system_admin",
    "superuser",
    "hr_manager",
  ].includes(user?.role);

  // 1. DATA HYDRATION
  // WHY: Centralized fetch callback ensures immediate refresh post-creation or deletion
  // without triggering an entire SPA page reload.
  const fetchBranches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient("/branches");
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[HrBranches] Failed to load branches:", err);
      setError(err.message || "Failed to load company branches from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load without synchronous setState in effect body
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const data = await apiClient("/branches");
        if (isMounted) {
          setBranches(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[HrBranches] Failed to load branches:", err);
          setError(err.message || "Failed to load company branches from server.");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. CREATE BRANCH HANDLER
  // WHY: Sends JSON payload to POST /branches. Validates required name field client-side
  // first to provide instant tactile feedback before dispatching over the network.
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    const trimmedName = branchName.trim();
    if (!trimmedName) {
      setFormError("Branch name is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await apiClient("/branches", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          ...(branchCode.trim() ? { code: branchCode.trim() } : {}),
        }),
      });

      toast.success(`Branch "${trimmedName}" created successfully!`);
      setIsCreateModalOpen(false);
      setBranchName("");
      setBranchCode("");
      await fetchBranches();
    } catch (err) {
      console.error("[HrBranches] Creation failed:", err);
      setFormError(err.message || "Failed to create branch. Please check inputs.");
      toast.error(err.message || "Failed to create branch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. DELETE BRANCH HANDLER
  // WHY: Safe deletion protocol with server-side validation. Express backend protects
  // branches with assigned teams from accidental cascade deletion.
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await apiClient(`/branches/${deleteTarget.id}`, {
        method: "DELETE",
      });

      toast.success(`Branch "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await fetchBranches();
    } catch (err) {
      console.error("[HrBranches] Deletion failed:", err);
      toast.error(err.message || "Failed to delete branch.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 4. DERIVED METRICS & FILTERING
  const totalTeamsCount = branches.reduce((acc, b) => {
    return acc + (Array.isArray(b.teams) ? b.teams.length : 0);
  }, 0);

  const avgTeamsPerBranch =
    branches.length > 0 ? (totalTeamsCount / branches.length).toFixed(1) : "0.0";

  const filteredBranches = branches.filter((b) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = (b.name || "").toLowerCase().includes(query);
    const codeMatch = (b.code || "").toLowerCase().includes(query);
    return nameMatch || codeMatch;
  });

  // 5. TABLE COLUMNS CONFIGURATION
  const columns = [
    {
      header: "Branch Name",
      render: (row) => (
        <div className="py-1">
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500">ID: {row.id.slice(0, 8)}...</div>
        </div>
      ),
    },
    {
      header: "Branch Code",
      render: (row) => (
        <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
          {row.code || row.name.slice(0, 3).toUpperCase()}
        </span>
      ),
    },
    {
      header: "Configured Teams",
      render: (row) => {
        const count = Array.isArray(row.teams) ? row.teams.length : 0;
        return (
          <Badge type="status" value={count > 0 ? "active" : "neutral"}>
            {count} {count === 1 ? "Team" : "Teams"}
          </Badge>
        );
      },
    },
    {
      header: "Created Date",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.createdAt ? formatDate(row.createdAt) : "—"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row) => {
        if (!canManageBranches) return null;
        return (
          <Button
            variant="ghost"
            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs px-2.5 py-1"
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-12">
        <Loader className="mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading branch directory...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Regional Branches Management
            </h1>
            <Badge type="status" value="operational" dot>
              Topology Live
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Define organizational branches, regional office hubs, and operational boundaries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => fetchBranches()}>
            Refresh
          </Button>

          {/* Hard Action Suppression: Only authorized roles see creation button */}
          {canManageBranches && (
            <Button
              variant="primary"
              onClick={() => {
                setBranchName("");
                setBranchCode("");
                setFormError("");
                setIsCreateModalOpen(true);
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Branch
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Error Fallback Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => fetchBranches()}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Branches"
          value={branches.length}
          hint="Regional hubs established"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <StatCard
          label="Operational Squads"
          value={totalTeamsCount}
          hint="Teams allocated across hubs"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          label="Squad Density"
          value={`${avgTeamsPerBranch} / Branch`}
          hint="Average teams per regional hub"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Main Table Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search branch name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
            />
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing {filteredBranches.length} of {branches.length} branches
          </div>
        </div>

        {/* Table Content */}
        <div className="p-6">
          {branches.length === 0 ? (
            <EmptyState
              preset="inbox"
              message="No Regional Branches Configured"
              description="Establish your organization's first physical or territorial office hub."
              action={
                canManageBranches && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setBranchName("");
                      setBranchCode("");
                      setFormError("");
                      setIsCreateModalOpen(true);
                    }}
                  >
                    Create First Branch
                  </Button>
                )
              }
            />
          ) : filteredBranches.length === 0 ? (
            <EmptyState
              preset="search"
              message="No Matching Branches Found"
              description={`No branches found matching "${searchQuery}".`}
            />
          ) : (
            <Table
              columns={columns}
              data={filteredBranches}
              emptyMessage="No branches match the current search."
            />
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Regional Branch"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="create-branch-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Branch"}
            </Button>
          </div>
        }
      >
        <form id="create-branch-form" onSubmit={handleCreateBranch} className="space-y-4">
          <FormField
            label="Branch Name"
            required
            hint="e.g. Bangalore Headquarters, Mumbai Regional Hub"
            error={formError}
          >
            <Input
              type="text"
              placeholder="Enter branch name"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                if (formError) setFormError("");
              }}
              required
              autoFocus
            />
          </FormField>

          <FormField
            label="Branch Code (Optional)"
            hint="Unique identifier slug, e.g. BLR-01, MUM-02"
          >
            <Input
              type="text"
              placeholder="e.g. BLR-01"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
            />
          </FormField>
        </form>
      </Modal>

      {/* Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Regional Branch"
        message={`Are you sure you want to delete branch "${deleteTarget?.name}"? This action cannot be undone. Note: Branches with assigned teams cannot be deleted.`}
        confirmText="Delete Branch"
        cancelText="Keep Branch"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
