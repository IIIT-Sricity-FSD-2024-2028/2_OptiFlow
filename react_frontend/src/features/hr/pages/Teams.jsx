import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { OrgTree } from "../components/OrgTree";
import { ThreadedOrgTree } from "../components/ThreadedOrgTree";
import {
  Users,
  User,
  Briefcase,
  Building,
  Network,
  Plus,
  Pencil,
  Edit3,
  Trash2,
  ShieldCheck,
  Link2,
  GitFork,
  LayoutList,
  RotateCw,
  MessageSquareCode,
} from "lucide-react";

const PAGE_SIZE = 10;

// WHY: HrTeams allows HR Administrators and Branch Managers to organize company squads,
// view the Reddit-style threaded reporting hierarchy, visual org graph, and balance work allocations.
export default function HrTeams() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // View mode: "threaded" (Reddit Thread Hierarchy), "graph" (Visual Org Graph), or "table" (Squads Directory)
  const viewParam = searchParams.get("view") || searchParams.get("tab");
  const initialView =
    viewParam === "table" || viewParam === "squads"
      ? "table"
      : viewParam === "graph" || viewParam === "org-chart"
      ? "graph"
      : "threaded";
  const [viewMode, setViewMode] = useState(initialView);

  useEffect(() => {
    const currentView = searchParams.get("view") || searchParams.get("tab");
    if (currentView === "table" || currentView === "squads") {
      setViewMode("table");
    } else if (currentView === "graph" || currentView === "org-chart") {
      setViewMode("graph");
    } else if (currentView === "threaded") {
      setViewMode("threaded");
    }
  }, [searchParams]);

  // Core state
  const [teams, setTeams] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const branchParam = searchParams.get("branch");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(branchParam || "all");

  useEffect(() => {
    if (branchParam) {
      setSelectedBranchFilter(branchParam);
    }
  }, [branchParam]);

  const [currentPage, setCurrentPage] = useState(1);

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

  // Squad Roster Management State
  const [rosterTeam, setRosterTeam] = useState(null);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");
  const [rosterSubmitting, setRosterSubmitting] = useState(false);
  const [rosterError, setRosterError] = useState("");

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
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [teamsData, branchesData, usersData] = await Promise.all([
        apiClient("/teams"),
        apiClient("/branches"),
        apiClient("/users").catch(() => []),
      ]);

      setTeams(Array.isArray(teamsData) ? teamsData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error("[HrTeams] Failed to load teams, branches, or users:", err);
      setError(err.message || "Failed to load team telemetry from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Derived Paginated Teams
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTeams.slice(start, start + PAGE_SIZE);
  }, [filteredTeams, currentPage]);

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

  // 5. SQUAD ROSTER HANDLERS
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!rosterTeam || !newMemberUserId) {
      setRosterError("Please select an employee to assign.");
      return;
    }

    setRosterSubmitting(true);
    setRosterError("");

    try {
      await apiClient(`/teams/${rosterTeam.id}/members`, {
        method: "POST",
        body: {
          userId: newMemberUserId,
          role: newMemberRole,
        },
      });

      toast.success("Team member assigned to squad successfully.");
      setNewMemberUserId("");
      // Refresh teams data and update the active rosterTeam modal
      const updatedTeams = await apiClient("/teams");
      const teamList = Array.isArray(updatedTeams) ? updatedTeams : [];
      setTeams(teamList);
      const refreshedTeam = teamList.find((t) => t.id === rosterTeam.id);
      if (refreshedTeam) {
        setRosterTeam(refreshedTeam);
      }
    } catch (err) {
      console.error("[HrTeams] Failed to add squad member:", err);
      setRosterError(err.message || "Failed to add member to team.");
    } finally {
      setRosterSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!rosterTeam) return;

    setRosterSubmitting(true);
    setRosterError("");

    try {
      await apiClient(`/teams/${rosterTeam.id}/members/${userId}`, {
        method: "DELETE",
      });

      toast.success("Team member removed from squad.");
      const updatedTeams = await apiClient("/teams");
      const teamList = Array.isArray(updatedTeams) ? updatedTeams : [];
      setTeams(teamList);
      const refreshedTeam = teamList.find((t) => t.id === rosterTeam.id);
      if (refreshedTeam) {
        setRosterTeam(refreshedTeam);
      }
    } catch (err) {
      console.error("[HrTeams] Failed to remove squad member:", err);
      setRosterError(err.message || "Failed to remove member.");
    } finally {
      setRosterSubmitting(false);
    }
  };

  // 6. TABLE COLUMNS CONFIGURATION (High-Impact Enterprise Directory)
  const columns = [
    {
      header: "Squad",
      accessor: "name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
            {row.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-slate-900 block text-sm leading-snug">{row.name}</span>
            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Building className="w-3 h-3 text-slate-400 shrink-0" />
              {row.branch?.name || "Unassigned Branch"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Squad Leader",
      render: (row) => {
        const members = row.teamMembers || [];
        const lead = members.find(
          (tm) =>
            (tm.role || "").toLowerCase().includes("lead") ||
            (tm.user?.jobTitle || "").toLowerCase().includes("lead")
        );
        if (!lead) {
          return <span className="text-slate-400 text-xs italic">Unassigned</span>;
        }
        const leadUser = lead.user || users.find((u) => u.id === (lead.userId || lead.user?.id));
        return (
          <Link
            to={`/hr/users/${leadUser?.id || lead.userId}`}
            className="inline-flex items-center gap-2 group hover:opacity-90 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 shrink-0">
              <User className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 block leading-tight">
                {leadUser?.fullName || "Squad Lead"}
              </span>
              <span className="text-[11px] text-slate-500 block">{lead.role || "Lead"}</span>
            </div>
          </Link>
        );
      },
    },
    {
      header: "Members",
      accessor: "teamMembers",
      render: (row) => {
        const members = row.teamMembers || [];
        if (members.length === 0) {
          return (
            <button
              type="button"
              onClick={() => {
                setRosterTeam(row);
                setNewMemberUserId("");
                setNewMemberRole("Member");
                setRosterError("");
              }}
              className="text-slate-400 text-xs italic hover:text-blue-600 transition-colors"
            >
              0 members +
            </button>
          );
        }
        return (
          <button
            type="button"
            onClick={() => {
              setRosterTeam(row);
              setNewMemberUserId("");
              setNewMemberRole("Member");
              setRosterError("");
            }}
            title="Click to view & manage squad roster"
            className="flex items-center gap-2.5 group cursor-pointer text-left"
          >
            <div className="flex -space-x-1.5 overflow-hidden">
              {members.slice(0, 3).map((tm) => (
                <div
                  key={tm.id || tm.userId}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 border-2 border-white"
                >
                  <User className="w-3 h-3 text-slate-500" />
                </div>
              ))}
              {members.length > 3 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 border-2 border-white">
                  +{members.length - 3}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </button>
        );
      },
    },
    {
      header: "Active Projects",
      accessor: "projects",
      render: (row) => {
        const projects = row.projects || [];
        if (projects.length === 0) {
          return <span className="text-slate-400 text-xs italic">0 Projects</span>;
        }
        return (
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80 cursor-default"
            title={projects.map((p) => p.name).join(", ")}
          >
            <Briefcase className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{projects.length} {projects.length === 1 ? "Project" : "Projects"}</span>
          </div>
        );
      },
    },
    ...(canManageTeams
      ? [
          {
            header: "Actions",
            key: "actions",
            render: (row) => (
              <div className="flex items-center gap-1.5 justify-start" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(row)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-600 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(row)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Delete</span>
                </button>
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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization & Teams</h1>
          <p className="text-xs text-slate-500 mt-1">
            Organizational reporting structure, team topology, and functional squads directory
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RotateCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Refresh
          </Button>

          {canManageTeams && viewMode === "table" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTeamName("");
                setTeamBranchId(branches[0]?.id || "");
                setFormError("");
                setIsCreateModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create Squad
            </Button>
          )}
        </div>
      </div>

      {/* Sleek Short Tab Switcher */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setViewMode("threaded");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("view");
                return next;
              });
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === "threaded"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquareCode className="w-3.5 h-3.5 text-slate-500" />
            Threaded
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("graph");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("view", "graph");
                return next;
              });
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === "graph"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitFork className="w-3.5 h-3.5 text-slate-500" />
            Org Chart
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("table");
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("view", "table");
                return next;
              });
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5 text-slate-500" />
            Squads ({teams.length})
          </button>
        </div>

        {viewMode === "table" && (
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredTeams.length} of {teams.length} squads
          </span>
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

      {/* CONDITIONAL VIEW: THREADED HIERARCHY vs VISUAL GRAPH vs SQUADS DIRECTORY */}
      {viewMode === "threaded" ? (
        <ThreadedOrgTree users={users} branches={branches} teams={teams} />
      ) : viewMode === "graph" ? (
        <OrgTree users={users} branches={branches} teams={teams} />
      ) : (
        <>
          {/* KPI Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              label="Total Squads"
              value={metrics.totalTeams}
              hint="Active operational teams"
              icon={Network}
            />
            <StatCard
              label="Branches Represented"
              value={metrics.branchesWithTeams}
              hint="Office locations covered"
              icon={Building}
            />
            <StatCard
              label="Delivery Pods"
              value={metrics.teamsWithProjects}
              hint="Teams assigned to active projects"
              icon={Briefcase}
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
              <>
                <Table columns={columns} data={paginatedTeams} />
                {filteredTeams.length > PAGE_SIZE && (
                  <div className="border-t border-slate-200/80 px-4 py-3 bg-slate-50/50">
                    <Pagination
                      currentPage={currentPage}
                      totalItems={filteredTeams.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

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

      {/* SQUAD ROSTER MANAGEMENT MODAL */}
      <Modal
        isOpen={Boolean(rosterTeam)}
        onClose={() => {
          if (!rosterSubmitting) {
            setRosterTeam(null);
            setRosterError("");
            setNewMemberUserId("");
          }
        }}
        title={`Squad Roster: ${rosterTeam?.name || ""}`}
      >
        <div className="p-6 space-y-6">
          {rosterError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {rosterError}
            </div>
          )}

          {/* Add member form */}
          {canManageTeams && (
            <form onSubmit={handleAddMember} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block">
                Assign Team Member
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <Select
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    disabled={rosterSubmitting}
                  >
                    <option value="">Select Employee...</option>
                    {users
                      .filter((u) => !rosterTeam?.teamMembers?.some((tm) => (tm.userId || tm.user?.id) === u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} {u.jobTitle ? `(${u.jobTitle})` : ""}
                        </option>
                      ))}
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    disabled={rosterSubmitting}
                  >
                    <option value="Member">Member</option>
                    <option value="Lead">Squad Lead</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full h-full text-xs font-medium"
                    disabled={rosterSubmitting || !newMemberUserId}
                  >
                    {rosterSubmitting ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Current Roster List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Assigned Members ({rosterTeam?.teamMembers?.length || 0})
              </h4>
              <span className="text-xs text-slate-400">Branch: {rosterTeam?.branch?.name || "Unassigned"}</span>
            </div>

            {(!rosterTeam?.teamMembers || rosterTeam.teamMembers.length === 0) ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No members assigned to this squad yet. Use the dropdown above to assign personnel.
              </div>
            ) : (
              <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {rosterTeam.teamMembers.map((tm) => {
                  const memberUser = tm.user || users.find((u) => u.id === (tm.userId || tm.user?.id)) || {};
                  const isLead = (tm.role || "").toLowerCase().includes("lead");
                  return (
                    <div
                      key={tm.id || tm.userId}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                          {(memberUser.fullName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800">
                              {memberUser.fullName || "Unknown Member"}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isLead
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {tm.role || "Member"}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {memberUser.jobTitle || memberUser.email || "Employee"}
                          </span>
                        </div>
                      </div>

                      {canManageTeams && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs px-2.5 py-1"
                          disabled={rosterSubmitting}
                          onClick={() => handleRemoveMember(tm.userId || tm.user?.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setRosterTeam(null);
                setRosterError("");
              }}
            >
              Close
            </Button>
          </div>
        </div>
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