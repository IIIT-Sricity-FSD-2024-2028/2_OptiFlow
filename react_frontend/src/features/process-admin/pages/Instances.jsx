import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProcessInstances,
  selectAllProcessInstances,
  selectProcessInstancesStatus,
  selectProcessInstancesError,
  deleteProcessInstance,
  selectProcessInstanceMutation,
} from '../../../store/processInstances';
import { PATHS } from '../../../app/paths';
import { Table } from '../../../shared/components/Table';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Input, Select } from '../../../shared/components/FormField';
import { formatDate } from '../../../shared/utils/formatDate';

const STATUS_OPTIONS = ['ALL', 'Active', 'Completed', 'Rejected', 'Draft', 'Cancelled'];

export default function ProcessAdminInstances() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const instances = useSelector(selectAllProcessInstances);
  const status = useSelector(selectProcessInstancesStatus);
  const loading = status === 'idle' || status === 'loading';
  const loadError = useSelector(selectProcessInstancesError);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteError, setDeleteError] = useState(null);
  const error = deleteError || loadError?.message;

  // Deletion State
  const [selectedId, setSelectedId] = useState(null);
  const instanceToDelete = instances.find(row => row.id === selectedId);
  const deleting = useSelector(state => selectProcessInstanceMutation(state, 'delete:' + instanceToDelete?.id)?.status === 'loading');

  useEffect(() => {
    dispatch(fetchProcessInstances());
  }, [dispatch]);

  const handleDeleteConfirm = async () => {
    if (!instanceToDelete) return;
    try {
      setDeleteError(null);
      await dispatch(deleteProcessInstance(instanceToDelete.id)).unwrap();
      setSelectedId(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete process instance');
    }
  };

  const filteredInstances = useMemo(() => {
    return instances.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch =
        item.template?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [instances, statusFilter, searchQuery]);

  const columns = [
    {
      key: 'template',
      header: 'Process Instance',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">
            {row.title || row.template?.name || 'Standard Process'}
          </div>
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
            {row.template?.name && <span>Template: {row.template.name}</span>}
            {row.project?.name && <span>• Project: {row.project.name}</span>}
            <span className="text-slate-400 font-mono">• ID: {row.id?.slice(-8)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'currentStep',
      header: 'Current Step',
      render: (row) => {
        if (row.status === 'Completed') {
          return <span className="text-xs text-emerald-700 font-medium">✓ Workflow Finished</span>;
        }
        if (row.status === 'Rejected') {
          return <span className="text-xs text-red-600 font-medium">✕ Workflow Rejected</span>;
        }

        const activeStep = (row.steps || []).find((s) => s.id === row.currentStepId) ||
          (row.steps || []).find((s) => s.status === 'Pending');

        return (
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            {activeStep?.templateStep?.name || activeStep?.name || 'In Progress'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge value={row.status} type="status" />,
    },
    {
      key: 'stepsProgress',
      header: 'Step Progress',
      render: (row) => {
        const total = row.steps?.length || 0;
        const finished = (row.steps || []).filter(
          (s) => s.status === 'Approved' || s.status === 'Completed' || s.status === 'Skipped'
        ).length;
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${total ? (finished / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {finished}/{total}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Initiated On',
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
            onClick={() => navigate(PATHS.PROCESS_ADMIN.INSTANCE_DETAIL.replace(':id', row.id))}
          >
            View
          </Button>
          {row.status !== 'Active' && (
            <Button
              variant="danger"
              className="text-xs py-1 px-2.5"
              onClick={() => setSelectedId(row.id)}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Process Instances</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage active runtime executions of business process templates.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="sm:col-span-2">
          <Input
            type="search"
            placeholder="Search by template name or instance ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                Status: {opt}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Instances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table
          columns={columns}
          data={filteredInstances}
          loading={loading}
          emptyMessage="No matching process instances found."
          onRowClick={(row) => navigate(`/process-admin/instances/${row.id}`)}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(instanceToDelete)}
        title="Delete Process Instance"
        message={`Are you sure you want to delete this process instance for "${instanceToDelete?.template?.name || instanceToDelete?.title || 'workflow'}"?`}
        confirmText="Delete Instance"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSelectedId(null)}
      />
    </div>
  );
}
