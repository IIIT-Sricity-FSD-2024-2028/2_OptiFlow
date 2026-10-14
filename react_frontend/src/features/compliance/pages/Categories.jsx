import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PATHS } from "../../../app/paths";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Button } from "../../../shared/components/Button";
import { Modal } from "../../../shared/components/Modal";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { Pagination } from "../../../shared/components/Pagination";
import { useToast } from "../../../shared/components/Toast";
import { Plus, Loader2, Trash2, Edit2, ExternalLink, BookOpen, Tags, Link2, Lock } from "lucide-react";

const PAGE_SIZE = 10;

export default function ComplianceCategories() {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiClient("/compliance-categories");
      const list = Array.isArray(res) ? res : res?.data || [];
      setCategories(list);
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
    setFormData({ name: "", description: "" });
    setIsOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingId(category.id);
    setFormData({ name: category.name, description: category.description || "" });
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
      header: "OWNER",
      accessor: "owner",
      render: (row) => (
        <span className="text-sm text-gray-600">
          {row.owner ? row.owner.fullName || row.owner.email : "System"}
        </span>
      ),
    },
    {
      header: "RULES",
      accessor: "_count",
      render: (row) => (
        <button
          onClick={() => navigate(`/compliance/rules?categoryId=${row.id}&categoryName=${encodeURIComponent(row.name)}`)}
          className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          title={`Filter to ${row._count?.rules || 0} rule(s)`}
        >
          {row._count?.rules || 0} rule{row._count?.rules === 1 ? "" : "s"}
        </button>
      ),
    },
    {
      header: "ACTIONS",
      accessor: "actions",
      render: (row) => {
        const rulesCount = row._count?.rules || 0;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/compliance/rules?categoryId=${row.id}&categoryName=${encodeURIComponent(row.name)}`)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              title="View Rules"
            >
              <ExternalLink size={13} />
              <span>Rules</span>
            </button>
            <button 
              onClick={() => handleOpenEdit(row)}
              className="text-gray-500 hover:text-blue-600 p-1 transition-colors"
              title="Edit Category"
            >
              <Edit2 size={16} />
            </button>
            {rulesCount > 0 ? (
              <span 
                className="text-slate-300 p-1 cursor-not-allowed inline-flex items-center"
                title="Cannot delete: has active rules"
              >
                <Lock size={15} />
              </span>
            ) : (
              <button 
                onClick={() => handleDelete(row)}
                className="text-gray-500 hover:text-red-600 p-1 transition-colors cursor-pointer"
                title="Delete Empty Category"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const paginatedCategories = categories.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rules & Policy Governance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize rules into high-level compliance domains (e.g. InfoSec, GDPR, SOC 2, HR Policies).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="inline-flex items-center gap-1.5 shadow-xs"
            onClick={handleOpenCreate}
          >
            <Plus size={15} />
            <span>Create Category</span>
          </Button>
        </div>
      </header>

      {/* Policy Domain Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to={PATHS.COMPLIANCE.RULES}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <BookOpen size={14} className="text-slate-400" />
          <span>Rules</span>
        </Link>
        <Link
          to={PATHS.COMPLIANCE.CATEGORIES}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
        >
          <Tags size={14} />
          <span>Regulatory Categories ({categories.length})</span>
        </Link>
        <Link
          to={PATHS.COMPLIANCE.BINDINGS}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Link2 size={14} className="text-slate-400" />
          <span>Scope Bindings</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Active Regulatory Domains ({categories.length})</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {categories.length} Categories Configured
          </span>
        </div>
        <div className="p-0">
          <Table
            columns={columns}
            data={paginatedCategories}
            emptyMessage="No compliance categories found. Click Create Category to define one."
          />
        </div>
        <div className="border-t border-slate-100 px-4">
          <Pagination
            currentPage={currentPage}
            totalItems={categories.length}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingId ? "Edit Category" : "Create New Category"}
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
              Category Name *
            </label>
            <input
              type="text"
              required
              className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
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
        title="Delete Category"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Category"
        variant="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
