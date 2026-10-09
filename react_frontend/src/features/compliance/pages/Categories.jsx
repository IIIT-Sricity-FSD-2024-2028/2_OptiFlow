import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import Table from "../../../shared/components/Table";
import { Button } from "../../../shared/components/Button";
import { Modal } from "../../../shared/components/Modal";
import { Plus, Loader2, Trash2, Edit2 } from "lucide-react";

export default function ComplianceCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiClient("/compliance-categories");
      setCategories(res.data);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await apiClient(`/compliance-categories/${id}`, { method: "DELETE" });
      fetchCategories();
    } catch (error) {
      alert("Failed to delete category: " + error.message);
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
      alert("Failed to save category: " + error.message);
    }
  };

  const columns = [
    {
      header: "NAME",
      accessor: "name",
      render: (row) => (
        <span className="font-semibold text-[13px] text-gray-800">
          {row.name}
        </span>
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
        <span className="text-sm font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
          {row._count?.rules || 0}
        </span>
      ),
    },
    {
      header: "ACTIONS",
      accessor: "actions",
      render: (row) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenEdit(row)}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            title="Edit Category"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleDelete(row.id)}
            className="text-gray-500 hover:text-red-600 transition-colors"
            title="Delete Category"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen text-[#1a2332]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a2332] mb-1">
            Compliance Categories
          </h1>
          <p className="text-sm text-gray-500">
            Organize your rules into logical groups like Data Privacy, Security, or HR.
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            Create Category
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm overflow-hidden mb-8">
        <div className="p-0">
          <Table
            columns={columns}
            data={categories}
            emptyMessage="No categories found. Create one to organize your rules."
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
    </div>
  );
}
