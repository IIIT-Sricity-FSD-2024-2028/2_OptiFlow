import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { Pagination } from "../../../shared/components/Pagination";
import { formatDate } from "../../../shared/utils/formatDate";
import {
  Building2,
  Users,
  Network,
  BarChart3,
  Plus,
  Trash2,
  RotateCw,
  Search,
} from "lucide-react";

const PAGE_SIZE = 10;

// WHY: HrBranches provides the organizational foundation for multi-branch companies.
// It allows HR Administrators to manage physical branches, territorial office hubs,
// and track team allocation across regions, while respecting role authorization boundaries.
export default function HrBranches() {
  const { user } = useAuth();
  const toast = useToast();

  // Raw branch records loaded from backend API
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // 2. CREATE BRANCH HANDLER
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
        body: {
          name: trimmedName,
          ...(branchCode.trim() ? { code: branchCode.trim() } : {}),
        },
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
  const totalTeamsCount = useMemo(() => {
    return branches.reduce((acc, b) => {
      return acc + (Array.isArray(b.teams) ? b.teams.length : 0);
    }, 0);
  }, [branches]);

  const avgTeamsPerBranch = useMemo(() => {
    return branches.length > 0 ? (totalTeamsCount / branches.length).toFixed(1) : "0.0";
  }, [branches.length, totalTeamsCount]);

  const filteredBranches = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return branches;
    return branches.filter((b) => {
      const nameMatch = (b.name || "").toLowerCase().includes(query);
      const codeMatch = (b.code || "").toLowerCase().includes(query);
      return nameMatch || codeMatch;
    });
  }, [branches, searchQuery]);

  const paginatedBranches = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredBranches.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredBranches, currentPage]);

  // 5. TABLE COLUMNS CONFIGURATION
  const columns = [
    {
      header: "Branch Name",
      render: (row) => (
        <div className="py-1 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900">{row.name}</div>
            <div className="text-xs text-slate-400 font-normal">Regional Office Hub</div>
          </div>
        </div>
      ),
    },
    {
      header: "Branch Code",
      render: (row) => {
        let code = row.code;
        if (!code) {
          const lower = (row.name || "").toLowerCase();
          if (lower.includes("new york") || lower.includes("nyc")) code = "NYC-HQ";
          else if (lower.includes("san francisco") || lower.includes("sf")) code = "SFO-WEST";
          else if (lower.includes("london") || lower.includes("uk")) code = "LDN-HUB";
          else {
            const words = (row.name || "").split(/[\s-]+/).filter((w) => !w.toLowerCase().includes("acme"));
            code = words.length >= 2 ? words.map((w) => w[0]).join("").toUpperCase() : row.name.slice(0, 3).toUpperCase();
          }
        }
        return (
          <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
            {code}
          </span>
        );
      },
    },
    {
      header: "Active Teams",
      render: (row) => {
        const count = Array.isArray(row.teams) ? row.teams.length : 0;
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                count > 0
                  ? "bg-slate-100 text-slate-700 border-slate-200/80"
                  : "bg-slate-50 text-slate-400 border-slate-200/80"
              }`}
            >
              <Users className="w-3 h-3 text-slate-400 shrink-0" />
              {count} {count === 1 ? "Team" : "Teams"}
            </span>
            {count > 0 && (
              <Link
                to={`/hr/teams?view=table&branch=${row.id}`}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5"
              >
                View Teams &rarr;
              </Link>
            )}
          </div>
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
          <div className="flex items-center gap-1.5 justify-start" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Delete</span>
            </button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <Loader fullScreen={false} message="Loading branch directory..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Regional Branches
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Regional office locations, territorial hubs, and team placement
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => fetchBranches()}>
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          {/* Hard Action Suppression: Only authorized roles see creation button */}
          {canManageBranches && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setBranchName("");
                setBranchCode("");
                setFormError("");
                setIsCreateModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Branch
            </Button>
          )}
        </div>
      </div>

      {/* Error Fallback Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => fetchBranches()}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Branches"
          value={branches.length}
          hint="Regional office locations"
          icon={Building2}
        />
        <StatCard
          label="Active Teams"
          value={totalTeamsCount}
          hint="Teams allocated across hubs"
          icon={Network}
        />
        <StatCard
          label="Primary Office Hub"
          value={branches[0]?.name ? (branches[0].code || branches[0].name.split(" ")[0]) : "Headquarters"}
          hint={branches[0]?.name || "Main corporate office"}
          icon={Building2}
        />
      </div>

      {/* Main Table Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search branch name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing {filteredBranches.length} of {branches.length} branches
          </div>
        </div>

        {/* Table Content */}
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
          <>
            <Table
              columns={columns}
              data={paginatedBranches}
              emptyMessage="No branches match the current search."
            />
            {filteredBranches.length > PAGE_SIZE && (
              <div className="border-t border-slate-200/80 px-4 py-3 bg-slate-50/50">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredBranches.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
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
