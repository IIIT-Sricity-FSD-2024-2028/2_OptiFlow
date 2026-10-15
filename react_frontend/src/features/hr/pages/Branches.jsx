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
import { FormField, Input, Select } from "../../../shared/components/FormField";
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
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  Check,
  ArrowRight,
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal and form states for creating a branch
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [managerUserId, setManagerUserId] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion confirmation and migration modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reassignBranchId, setReassignBranchId] = useState("");
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
      const [branchesData, usersData] = await Promise.all([
        apiClient("/branches"),
        apiClient("/users").catch(() => []),
      ]);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setUsers(Array.isArray(usersData) ? usersData : usersData?.data || []);
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
          ...(managerUserId ? { managerUserId } : {}),
        },
      });

      toast.success(`Branch "${trimmedName}" created successfully!`);
      setIsCreateModalOpen(false);
      setBranchName("");
      setBranchCode("");
      setManagerUserId("");
      await fetchBranches();
    } catch (err) {
      console.error("[HrBranches] Creation failed:", err);
      setFormError(err.message || "Failed to create branch. Please check inputs.");
      toast.error(err.message || "Failed to create branch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived target branch properties for migration
  const targetTeamsCount = useMemo(() => {
    return Array.isArray(deleteTarget?.teams) ? deleteTarget.teams.length : 0;
  }, [deleteTarget]);

  const eligibleTargetBranches = useMemo(() => {
    if (!deleteTarget) return [];
    return branches.filter((b) => b.id !== deleteTarget.id);
  }, [branches, deleteTarget]);

  // 3. DELETE / DECOMMISSION BRANCH HANDLER
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (targetTeamsCount > 0 && !reassignBranchId) {
      toast.error("Please select an operational destination branch to migrate active teams.");
      return;
    }

    setIsDeleting(true);
    try {
      const payload = targetTeamsCount > 0 ? { reassignBranchId } : undefined;
      const res = await apiClient(`/branches/${deleteTarget.id}`, {
        method: "DELETE",
        body: payload,
      });

      toast.success(res?.message || `Branch "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      setReassignBranchId("");
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
      header: "Branch Manager",
      render: (row) => {
        const manager = row.manager;
        if (!manager) {
          return (
            <span className="text-xs text-slate-400 italic whitespace-nowrap">
              Unassigned
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>{manager.fullName}</span>
          </span>
        );
      },
    },
    {
      header: "Active Teams",
      render: (row) => {
        const count = Array.isArray(row.teams) ? row.teams.length : 0;
        if (count > 0) {
          return (
            <Link
              to={`/hr/teams?view=table&branch=${row.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/80 hover:border-indigo-200 shadow-2xs hover:shadow-xs transition-all duration-200 ease-out group cursor-pointer"
              title="Click to view teams in this branch"
            >
              <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors duration-200" />
              <span>{count} {count === 1 ? "Team" : "Teams"}</span>
            </Link>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200/60">
            <Users className="w-3.5 h-3.5 text-slate-300" />
            <span>0 Teams</span>
          </span>
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
              onClick={() => {
                setDeleteTarget(row);
                const others = branches.filter((b) => b.id !== row.id);
                setReassignBranchId(others[0]?.id || "");
              }}
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

          <FormField
            label="Branch Manager (Optional)"
            hint="Designate an employee to lead and oversee this regional branch"
          >
            <Select
              value={managerUserId}
              onChange={(e) => setManagerUserId(e.target.value)}
            >
              <option value="">No manager assigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.jobTitle || u.role || "Member"})
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>

      {/* Decommission & Migrate Dialog for Branches with Active Teams */}
      {deleteTarget && targetTeamsCount > 0 && (
        <Modal
          isOpen={Boolean(deleteTarget)}
          onClose={isDeleting ? undefined : () => setDeleteTarget(null)}
          title="Decommission Branch & Migrate Teams"
          className="max-w-[560px]"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || eligibleTargetBranches.length === 0 || !reassignBranchId}
                className="bg-amber-600 hover:bg-amber-700 text-white border-transparent px-4 py-2 font-medium shadow-xs"
              >
                {isDeleting
                  ? "Migrating & Decommissioning..."
                  : `Migrate ${targetTeamsCount} Team(s) & Decommission`}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Context Alert Header */}
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-amber-950">
                  Active Teams Detected ({targetTeamsCount} {targetTeamsCount === 1 ? "Team" : "Teams"})
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Branch <span className="font-semibold text-amber-950">"{deleteTarget.name}"</span> currently houses active organizational units. To prevent data loss and preserve project histories, all teams must be migrated to another operational branch before this branch can be decommissioned.
                </p>
              </div>
            </div>

            {/* Visual Migration Flow Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 px-1">
                <span>Source Branch (Removing)</span>
                <span>Destination Branch (Receiving)</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Source Box */}
                <div className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 min-w-0 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {deleteTarget.name}
                    </div>
                    <div className="text-[11px] text-rose-600 font-medium">
                      {targetTeamsCount} {targetTeamsCount === 1 ? "Team" : "Teams"} to move
                    </div>
                  </div>
                </div>

                {/* Flow Arrow */}
                <div className="w-7 h-7 rounded-full bg-slate-200/70 border border-slate-300/60 flex items-center justify-center shrink-0 text-slate-600">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

                {/* Destination Box */}
                <div className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 min-w-0 shadow-2xs">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {eligibleTargetBranches.find((b) => b.id === reassignBranchId)?.name || "Select Branch..."}
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium">
                      Target Hub
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Destination Selection Form Field */}
            {eligibleTargetBranches.length > 0 ? (
              <FormField
                label="Destination Regional Branch"
                required
                hint="Choose the operational branch that will take full ownership of the migrated teams"
              >
                <Select
                  value={reassignBranchId}
                  onChange={(e) => setReassignBranchId(e.target.value)}
                  disabled={isDeleting}
                >
                  {eligibleTargetBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed">
                <span className="font-semibold block mb-0.5">No Alternate Branches Available</span>
                This branch cannot be decommissioned because it is the only configured branch in your organization. Please create an alternate regional branch first, or reassign the teams manually under the Teams directory.
              </div>
            )}

            {/* Guarantees and Safeguards Card */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Zero Data Loss Guarantees
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Projects & tasks preserved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Team member roles retained</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Compliance logs maintained</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Branch manager unassigned</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Deletion Confirmation Dialog for Empty Branches */}
      {deleteTarget && targetTeamsCount === 0 && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Regional Branch"
          message={`Are you sure you want to delete branch "${deleteTarget?.name}"? This branch currently has no active teams and can be safely deleted.`}
          confirmText="Delete Branch"
          cancelText="Keep Branch"
          variant="danger"
          loading={isDeleting}
        />
      )}
    </div>
  );
}
