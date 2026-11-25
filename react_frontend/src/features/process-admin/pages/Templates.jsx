import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProcessTemplates,
  selectAllProcessTemplates,
  selectProcessTemplatesStatus,
  selectProcessTemplatesError,
  deleteProcessTemplate,
  createProcessTemplate,
  selectCreatingProcessTemplate,
  selectProcessTemplateMutation,
} from '../../../store/processTemplates';
import { PATHS } from '../../../app/paths';
import { Table } from '../../../shared/components/Table';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { FormField, Input } from '../../../shared/components/FormField';
import { formatDate } from '../../../shared/utils/formatDate';

export default function ProcessAdminTemplates() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const templates = useSelector(selectAllProcessTemplates);
  const status = useSelector(selectProcessTemplatesStatus);
  const loading = status === 'idle' || status === 'loading';
  const loadError = useSelector(selectProcessTemplatesError);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const error = deleteError || loadError?.message;

  // Create Template Modal Form State (Controlled Form)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    version: 1,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const submitting = useSelector(selectCreatingProcessTemplate);

  // Delete Confirmation State
  const [selectedId, setSelectedId] = useState(null);
  const templateToDelete = templates.find(row => row.id === selectedId);
  const deleting = useSelector(state => selectProcessTemplateMutation(state, 'delete:' + templateToDelete?.id)?.status === 'loading');

  useEffect(() => {
    dispatch(fetchProcessTemplates());
  }, [dispatch]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Template name is required';
    if (!formData.version || Number(formData.version) < 1) {
      errs.version = 'Version must be at least 1';
    }
    return errs;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    try {
      const res = await dispatch(createProcessTemplate({
        name: formData.name.trim(),
        version: Number(formData.version),
        isActive: formData.isActive,
      })).unwrap();

      setIsCreateModalOpen(false);
      setFormData({ name: '', version: 1, isActive: true });

      const templateId = res?.id || res?.data?.id;
      if (templateId) {
        navigate(PATHS.PROCESS_ADMIN.TEMPLATE_DETAIL.replace(':id', templateId));
      } else {
        dispatch(fetchProcessTemplates({ force: true }));
      }
    } catch (err) {
      setFormErrors({ submit: err.message || 'Failed to create template' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    try {
      setDeleteError(null);
      await dispatch(deleteProcessTemplate(templateToDelete.id)).unwrap();
      setSelectedId(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete template');
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const columns = [
    {
      key: 'name',
      header: 'Template Name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500">v{row.version || 1} • {row.instances?.length ?? row._count?.instances ?? 0} instance(s) run</div>
        </div>
      ),
    },
    {
      key: 'steps',
      header: 'Workflow Steps',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {row.steps?.length || 0} step(s)
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          value={row.isActive ? 'Active' : 'Inactive'}
          type="status"
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created On',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            className="text-xs py-1 px-2.5"
            onClick={() => navigate(PATHS.PROCESS_ADMIN.TEMPLATE_DETAIL.replace(':id', row.id))}
          >
            Step Builder
          </Button>
          <Button
            variant="danger"
            className="text-xs py-1 px-2.5"
            disabled={(row.instances?.length ?? row._count?.instances ?? 0) > 0}
            title={(row.instances?.length ?? row._count?.instances ?? 0) > 0 ? 'Cannot delete a template with run instances' : 'Delete template'}
            onClick={() => setSelectedId(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Process Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build and manage workflow blueprints with custom approval sequences and loopback rules.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setFormData({ name: '', version: 1, isActive: true });
            setFormErrors({});
            setIsCreateModalOpen(true);
          }}
        >
          + Create Template
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full max-w-sm">
          <Input
            type="search"
            placeholder="Search templates by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredTemplates.length} of {templates.length} template(s)
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table
          columns={columns}
          data={filteredTemplates}
          loading={loading}
          emptyMessage="No process templates found. Click '+ Create Template' to get started."
          onRowClick={(row) => navigate(`/process-admin/templates/${row.id}`)}
        />
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Process Template"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateSubmit}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create & Open Builder'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formErrors.submit && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md">
              {formErrors.submit}
            </div>
          )}

          <FormField
            label="Template Name"
            required
            error={formErrors.name}
            hint="E.g., High Value Purchase Order Approval"
          >
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter descriptive template name"
              error={Boolean(formErrors.name)}
            />
          </FormField>

          <FormField
            label="Version"
            required
            error={formErrors.version}
          >
            <Input
              type="number"
              name="version"
              min="1"
              value={formData.version}
              onChange={handleInputChange}
              error={Boolean(formErrors.version)}
            />
          </FormField>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active (Available for launching instances immediately)
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(templateToDelete)}
        title="Delete Process Template"
        message={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Template"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSelectedId(null)}
      />
    </div>
  );
}
