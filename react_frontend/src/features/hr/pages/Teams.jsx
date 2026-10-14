import { useState, useEffect, useCallback, useMemo } from "react";
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
import { formatDate } from "../../../shared/utils/formatDate";

// WHY: HrTeams allows HR Administrators and Branch Managers to organize company squads,
// functional engineering pods, and project delivery groups across geographic branches.
// It enforces role-based action gating (Zero-Clutter) so only authorized leads can mutate structures.
export default function HrTeams() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Core state
  const [teams, setTeams] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

  // Create Team Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamBranchId, setTeamBranchId] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Team Modal State
  const [editingTeam, setEditingTeam] = useState(null);
  const [editName, setEditName] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editError, setEditError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Team State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WHY: Zero-Clutter Hard Action Suppression ensures users without administrative rights
  // never see buttons for operations that would fail with 403 Forbidden on the backend.
  const canManageTeams = [
    "company_owner",
    "system_admin",
    "superuser",
    "hr_manager",
    "branch_manager",
  ].includes(user?.role);

  // 1. DATA HYDRATION
  // WHY: Parallel fetching of teams and branches prevents network waterfalls
  // and ensures branch names are readily available for dropdown selectors.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [teamsData, branchesData] = await Promise.all([
        apiClient("/teams"),
        apiClient("/branches"),
      ]);

      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err) {
      console.error("[HrTeams] Failed to load teams or branches:", err);
      setError(err.message || "Failed to load team telemetry from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load without synchronous setState in effect body
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const [teamsData, branchesData] = await Promise.all([
          apiClient("/teams"),
          apiClient("/branches"),
        ]);
        if (isMounted) {
          setTeams(Array.isArray(teamsData) ? teamsData : []);
          setBranches(Array.isArray(branchesData) ? branchesData : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("[HrTeams] Failed to load teams or branches:", err);
          setError(err.message || "Failed to load team telemetry from server.");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered teams list based on search term and branch filter
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.branch?.name && team.branch.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBranch =
        selectedBranchFilter === "all" || team.branchId === selectedBranchFilter;

      return matchesSearch && matchesBranch;
    });
  }, [teams, searchQuery, selectedBranchFilter]);

  // Derived KPI statistics
  const metrics = useMemo(() => {
    const totalTeams = teams.length;
    const branchesWithTeams = new Set(teams.map((t) => t.branchId)).size;
    const teamsWithProjects = teams.filter((t) => t.projects && t.projects.length > 0).length;
    return { totalTeams, branchesWithTeams, teamsWithProjects };
  }, [teams]);

  // 2. CREATE TEAM HANDLER
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    const trimmedName = teamName.trim();
    if (!trimmedName) {
      setFormError("Team name is required.");
      return;
    }
    if (!teamBranchId) {
      setFormError("Please select a regional branch.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      await apiClient("/teams", {
        method: "POST",
        body: {
          name: trimmedName,
          branchId: teamBranchId,
        },
      });

      toast.success(`Team "${trimmedName}" created successfully!`);
      setIsCreateModalOpen(false);
      setTeamName("");
      setTeamBranchId("");
      await fetchData();
    } catch (err) {
      console.error("[HrTeams] Creation failed:", err);
      setFormError(err.message || "Failed to create team.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. EDIT TEAM HANDLER
  const handleOpenEdit = (team) => {
    setEditingTeam(team);
    setEditName(team.name);
    setEditBranchId(team.branchId || "");
    setEditError("");
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError("Team name is required.");
      return;
    }
    if (!editBranchId) {
      setEditError("Please select a branch.");
      return;
    }

    setIsUpdating(true);
    setEditError("");

    try {
      await apiClient(`/teams/${editingTeam.id}`, {
        method: "PATCH",
        body: {
          name: trimmedName,
          branchId: editBranchId,
        },
      });

      toast.success(`Team "${trimmedName}" updated successfully!`);
      setEditingTeam(null);
      await fetchData();
    } catch (err) {
      console.error("[HrTeams] Update failed:", err);
      setEditError(err.message || "Failed to update team.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 4. DELETE TEAM HANDLER
  const handleDeleteTeam = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await apiClient(`/teams/${deleteTarget.id}`, {
        method: "DELETE",
      });

      toast.success(`Team "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      console.error("[HrTeams] Deletion failed:", err);
      toast.error(err.message || "Failed to delete team.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 5. TABLE COLUMNS CONFIGURATION
  const columns = [
    {
      header: "Team / Squad Name",
      accessor: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100/70 border border-emerald-200/50 flex items-center justify-center text-emerald-700 font-semibold text-sm">
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-medium text-slate-900 block">{row.name}</span>
            <span className="text-xs text-slate-400">ID: {row.id.substring(0, 8)}...</span>
          </div>
        </div>
      ),
    },
    {
      header: "Regional Branch",
      accessor: "branch",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
          <span className="text-slate-700 text-sm font-medium">
            {row.branch?.name || "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      header: "Active Projects",
      accessor: "projects",
      render: (row) => {
        const count = row.projects?.length || 0;
        return (
          <Badge
            variant={count > 0 ? "active" : "neutral"}
            value={`${count} Project${count === 1 ? "" : "s"}`}
          />
        );
      },
    },
    {
      header: "Established Date",
      accessor: "createdAt",
      render: (row) => (
        <span className="text-slate-500 text-sm">{formatDate(row.createdAt)}</span>
      ),
    },
    ...(canManageTeams
      ? [
          {
            header: "Actions",
            key: "actions",
            render: (row) => (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(row)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTarget(row)}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (loading) {
    return <Loader fullScreen={false} message="Loading organizational squads and teams..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Functional Teams</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize business squads, align regional delivery pods, and balance work allocations
          </p>
        </div>

        {/* Zero-Clutter Gating: Completely suppressed from React DOM if ungranted */}
        {canManageTeams && (
          <Button
            variant="primary"
            onClick={() => {
              setTeamName("");
              setTeamBranchId(branches[0]?.id || "");
              setFormError("");
              setIsCreateModalOpen(true);
            }}
          >
            + Create New Team
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          label="Total Squads"
          value={metrics.totalTeams}
          hint="Active operational teams"
        />
        <StatCard
          label="Branches Represented"
          value={metrics.branchesWithTeams}
          hint="Office locations covered"
        />
        <StatCard
          label="Delivery Pods"
          value={metrics.teamsWithProjects}
          hint="Teams assigned to active projects"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search teams by name or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Branch:
          </label>
          <select
            className="px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 cursor-pointer"
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
          >
            <option value="all">All Branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table / Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredTeams.length === 0 ? (
          <EmptyState
            preset="inbox"
            message={searchQuery ? "No matching teams found" : "No Teams Configured"}
            description={
              searchQuery
                ? "Try adjusting your search criteria or clearing filters."
                : "Create your first organizational squad to begin delegating team projects."
            }
            action={
              canManageTeams && !searchQuery ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    setTeamName("");
                    setTeamBranchId(branches[0]?.id || "");
                    setFormError("");
                    setIsCreateModalOpen(true);
                  }}
                >
                  Create Team
                </Button>
              ) : null
            }
          />
        ) : (
          <Table columns={columns} data={filteredTeams} />
        )}
      </div>

      {/* CREATE TEAM MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isSubmitting && setIsCreateModalOpen(false)}
        title="Create Functional Team"
      >
        <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {formError}
            </div>
          )}

          <FormField label="Team / Squad Name" required error={formError && !teamName ? "Required" : ""}>
            <Input
              placeholder="e.g. Core Engineering, Compliance Pod 1"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </FormField>

          <FormField label="Assigned Branch" required>
            <Select
              value={teamBranchId}
              onChange={(e) => setTeamBranchId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="" disabled>Select a branch location</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TEAM MODAL */}
      <Modal
        isOpen={Boolean(editingTeam)}
        onClose={() => !isUpdating && setEditingTeam(null)}
        title="Edit Functional Team"
      >
        <form onSubmit={handleUpdateTeam} className="p-6 space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {editError}
            </div>
          )}

          <FormField label="Team / Squad Name" required>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isUpdating}
              autoFocus
            />
          </FormField>

          <FormField label="Assigned Branch" required>
            <Select
              value={editBranchId}
              onChange={(e) => setEditBranchId(e.target.value)}
              disabled={isUpdating}
            >
              <option value="" disabled>Select a branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingTeam(null)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE TEAM CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Confirm Team Deletion"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? If there are active projects assigned to this team, deletion will be blocked by system governance.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete Team"}
        confirmVariant="danger"
        onConfirm={handleDeleteTeam}
        onCancel={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
}