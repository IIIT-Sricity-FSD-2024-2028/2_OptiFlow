import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProcessInstances,
  selectAllProcessInstances,
  selectProcessInstancesStatus,
  selectProcessInstancesError,
} from '../../../store/processInstances';
import {
  fetchProcessTemplates,
  createProcessTemplate,
  selectAllProcessTemplates,
  selectProcessTemplatesStatus,
  selectProcessTemplatesError,
  selectCreatingProcessTemplate,
} from '../../../store/processTemplates';
import { PATHS } from '../../../app/paths';
import { StatCard } from '../../../shared/components/StatCard';
import { Table } from '../../../shared/components/Table';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { Modal } from '../../../shared/components/Modal';
import { FormField, Input } from '../../../shared/components/FormField';
import { formatDate } from '../../../shared/utils/formatDate';

export default function ProcessAdminDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const templates = useSelector(selectAllProcessTemplates);
  const instances = useSelector(selectAllProcessInstances);
  const templateStatus = useSelector(selectProcessTemplatesStatus);
  const instanceStatus = useSelector(selectProcessInstancesStatus);
  const loading = [templateStatus, instanceStatus].some(status => status === 'idle' || status === 'loading');
  const templateError = useSelector(selectProcessTemplatesError);
  const instanceError = useSelector(selectProcessInstancesError);
  const error = (templateError || instanceError)?.message;

  // Create Template Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    version: 1,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const submitting = useSelector(selectCreatingProcessTemplate);

  useEffect(() => {
    dispatch(fetchProcessTemplates());
    dispatch(fetchProcessInstances());
  }, [dispatch]);

  const activeInstances = instances.filter((i) => i.status === 'Active');
  const completedInstances = instances.filter((i) => i.status === 'Completed');
  const rejectedInstances = instances.filter((i) => i.status === 'Rejected');

  // Count pending steps across active instances
  const pendingStepsCount = instances.reduce((acc, inst) => {
    const pendingInThis = (inst.steps || []).filter((s) => s.status === 'Pending').length;
    return acc + pendingInThis;
  }, 0);

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

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Template name is required';
    if (!formData.version || Number(formData.version) < 1) {
      errs.version = 'Version must be at least 1';
    }
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

  const instanceColumns = [
    {
      key: 'template',
      header: 'Process Instance',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">
            {row.title || row.template?.name || 'Standard Workflow'}
          </div>
          {(row.project?.name || (row.title && row.template?.name)) && (
            <div className="text-xs text-slate-500">
              {[row.template?.name, row.project?.name].filter(Boolean).join(' • ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge value={row.status} type="status" />,
    },
    {
      key: 'progress',
      header: 'Completed Steps',
      render: (row) => {
        const total = row.steps?.length || 0;
        const done = (row.steps || []).filter(
          (s) => s.status === 'Approved' || s.status === 'Completed' || s.status === 'Skipped'
        ).length;
        return (
          <span className="text-xs font-medium text-slate-600">
            {done} of {total} steps
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Initiated On',
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Process Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor workflow execution pipelines, templates, and active approvals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(PATHS.PROCESS_ADMIN.TEMPLATES)}
          >
            Manage Templates
          </Button>
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
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Instances"
          value={activeInstances.length}
          hint={`${pendingStepsCount} action(s) pending`}
          variant="primary"
        />
        <StatCard
          label="Total Templates"
          value={templates.length}
          hint={`${templates.filter((t) => t.isActive).length} active blueprints`}
          variant="info"
        />
        <StatCard
          label="Completed Instances"
          value={completedInstances.length}
          hint="Successfully finalized"
          variant="success"
        />
        <StatCard
          label="Rejected / Aborted"
          value={rejectedInstances.length}
          hint="Requires loopback or review"
          variant="danger"
        />
      </div>

      {/* Recent Instances Card & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Workflow Instances</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any instance to inspect its live step progress.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate(PATHS.PROCESS_ADMIN.INSTANCES)}
            className="text-xs py-1.5 px-3"
          >
            View All
          </Button>
        </div>
        <Table
          columns={instanceColumns}
          data={instances.slice(0, 5)}
          loading={loading}
          emptyMessage="No active process instances found."
          onRowClick={(row) => navigate(`/process-admin/instances/${row.id}`)}
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
              id="dashboardIsActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="dashboardIsActive" className="text-sm font-medium text-slate-700">
              Active (Available for launching instances immediately)
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
