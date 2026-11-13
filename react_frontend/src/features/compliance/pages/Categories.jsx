import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../../app/paths";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import Table from "../../../shared/components/Table";
import { Button } from "../../../shared/components/Button";
import { Modal } from "../../../shared/components/Modal";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { Pagination } from "../../../shared/components/Pagination";
import { useToast } from "../../../shared/components/Toast";
import { 
  Plus, 
  Loader2, 
  Trash2, 
  Edit2, 
  ExternalLink, 
  BookOpen, 
  Tags, 
  Link2, 
  Lock,
  UserCheck,
  Layers,
  Shield
} from "lucide-react";

const PAGE_SIZE = 10;

export default function ComplianceCategories() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", ownerId: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Scope filter: "MyDomains" vs "All"
  const [scopeFilter, setScopeFilter] = useState("MyDomains");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [res, userRes] = await Promise.all([
        apiClient("/compliance-categories"),
        apiClient("/users").catch(() => []),
      ]);
      const list = Array.isArray(res) ? res : res?.data || [];
      setCategories(list);
      const uList = Array.isArray(userRes) ? userRes : userRes?.data || [];
      setUsers(uList);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", ownerId: user?.id || "" });
    setIsOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
      ownerId: category.ownerId || category.owner?.id || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (category) => {
    const rulesCount = category._count?.rules || 0;
    if (rulesCount > 0) {
      toast.error(
        `Cannot delete category "${category.name}": it has ${rulesCount} associated rule(s). Reassign or delete those rules first.`
      );
      return;
    }
    setCategoryToDelete(category);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setIsDeleting(true);
      await apiClient(`/compliance-categories/${categoryToDelete.id}`, { method: "DELETE" });
      toast.success(`Category "${categoryToDelete.name}" deleted.`);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      toast.error("Failed to delete category: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient(`/compliance-categories/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await apiClient("/compliance-categories", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setIsOpen(false);
      fetchCategories();
    } catch (error) {
      toast.error("Failed to save category: " + error.message);
    }
  };

  const filteredCategories = useMemo(() => {
    if (scopeFilter === "MyDomains") {
      return categories.filter((c) => {
        const ownerId = c.ownerId || c.owner?.id;
        return ownerId === user?.id;
      });
    }
    return categories;
  }, [categories, scopeFilter, user?.id]);

  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const columns = [
    {
      header: "NAME",
      accessor: "name",
      render: (row) => (
        <button
          onClick={() => navigate(`/compliance/rules?categoryId=${row.id}&categoryName=${encodeURIComponent(row.name)}`)}
          className="font-semibold text-[13px] text-blue-600 hover:text-blue-800 text-left hover:underline"
          title={`View rules in ${row.name}`}
        >
          {row.name}
        </button>
      ),
    },
    { header: "DESCRIPTION", accessor: "description" },
    {
      header: "DOMAIN LEAD / OFFICER",
      accessor: "owner",
      render: (row) => {
        const isMe = (row.ownerId || row.owner?.id) === user?.id;
        return row.owner ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-800">
                {row.owner.fullName || row.owner.email}
              </span>
              {isMe && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-bold">
                  You
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">{row.owner.email}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Unassigned (Fallback to Org)</span>
        );
      },
    },
    {
      header: "ASSOCIATED RULES",
      accessor: "rulesCount",
      render: (row) => {
        const count = row._count?.rules ?? row.rules?.length ?? 0;
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
            <BookOpen size={12} className="text-slate-400" />
            {count} {count === 1 ? "Rule" : "Rules"}
          </span>
        );
      },
    },
    {
      header: "ACTIONS",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row)}
            title="Edit Category"
            className="text-slate-500 hover:text-slate-800"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            title="Delete Category"
            className="text-slate-400 hover:text-rose-600"
          >
            <Trash2 size={14} />
          </Button>
        </div>
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

  const myDomainsCount = categories.filter((c) => (c.ownerId || c.owner?.id) === user?.id).length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Regulatory Domains & Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Group policies into functional regulatory frameworks and assign dedicated compliance officer ownership.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate} className="flex items-center gap-1.5 self-start">
          <Plus size={16} />
          <span>New Regulatory Domain</span>
        </Button>
      </div>

      {/* Scope Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScopeFilter("MyDomains");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              scopeFilter === "MyDomains"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserCheck size={14} />
            <span>My Assigned Domains ({myDomainsCount})</span>
          </button>

          <button
            onClick={() => {
              setScopeFilter("All");
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              scopeFilter === "All"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Layers size={14} />
            <span>All Domains ({categories.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={PATHS.COMPLIANCE.RULES}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BookOpen size={14} className="text-slate-400" />
            <span>View Rules</span>
          </Link>
          <Link
            to={PATHS.COMPLIANCE.BINDINGS}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Link2 size={14} className="text-slate-400" />
            <span>Scope Bindings</span>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {scopeFilter === "MyDomains" ? "Your Regulatory Domains" : "All Regulatory Frameworks"} ({filteredCategories.length})
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {filteredCategories.length} Active
          </span>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={paginatedCategories}
            emptyMessage={
              scopeFilter === "MyDomains"
                ? "You have no assigned regulatory domains. Switch to All Domains to view or assign yourself to one."
                : "No compliance categories found. Click New Regulatory Domain to define one."
            }
          />
        </div>
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCategories.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingId ? "Edit Regulatory Domain" : "Create New Regulatory Domain"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingId ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Domain / Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. IT Security & Access Controls"
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Domain Compliance Lead (Officer)
            </label>
            <select
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
            >
              <option value="">-- Unassigned (Company Default) --</option>
              {users.map((u) => {
                const isOfficer = u.roleAssignments?.some((r) => {
                  const roleName = String(r.role?.name || "").toLowerCase();
                  return roleName.includes("compliance") || roleName.includes("owner") || roleName.includes("admin");
                });
                return (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email} {u.id === user?.id ? "(You)" : isOfficer ? "🛡️ (Compliance Officer)" : ""}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-500">
              All violations under this category will automatically be routed to this officer's queue.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe the scope and regulatory mandate of this domain..."
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button type="submit" className="hidden">
            Submit
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(categoryToDelete)}
        title="Delete Domain"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? Associated policies should be reassigned first.`}
        confirmText="Delete Domain"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
