import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTemplates, listInstances, createInstance } from '../../../services/api/process';
import { PATHS } from '../../../app/paths';
import { StatCard } from '../../../shared/components/StatCard';
import { Table } from '../../../shared/components/Table';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { Modal } from '../../../shared/components/Modal';
import { FormField, Select } from '../../../shared/components/FormField';
import { formatDate } from '../../../shared/utils/formatDate';

export default function ProcessAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [instances, setInstances] = useState([]);
  const [error, setError] = useState(null);

  // Launch Instance Modal State
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [templatesRes, instancesRes] = await Promise.all([
        listTemplates(),
        listInstances(),
      ]);
      const rawT = templatesRes?.data ?? templatesRes;
      const rawI = instancesRes?.data ?? instancesRes;
      setTemplates(Array.isArray(rawT) ? rawT : []);
      setInstances(Array.isArray(rawI) ? rawI : []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const activeInstances = instances.filter((i) => i.status === 'Active');
  const completedInstances = instances.filter((i) => i.status === 'Completed');
  const rejectedInstances = instances.filter((i) => i.status === 'Rejected');

  // Count pending steps across active instances
  const pendingStepsCount = instances.reduce((acc, inst) => {
    const pendingInThis = (inst.steps || []).filter((s) => s.status === 'Pending').length;
    return acc + pendingInThis;
  }, 0);

  const handleLaunchSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      setLaunchError('Please select a template to launch');
      return;
    }

    try {
      setLaunching(true);
      setLaunchError('');
      const res = await createInstance({ templateId: selectedTemplateId });
      setIsLaunchModalOpen(false);
      setSelectedTemplateId('');
      const instanceId = res?.id || res?.data?.id;
      if (instanceId) {
        navigate(`/process-admin/instances/${instanceId}`);
      } else {
        loadDashboardData();
      }
    } catch (err) {
      setLaunchError(err.message || 'Failed to launch process instance');
    } finally {
      setLaunching(false);
    }
  };

  const instanceColumns = [
    {
      key: 'template',
      header: 'Workflow Template',
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {row.template?.name || row.title || 'Standard Workflow'}
        </span>
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
            onClick={() => setIsLaunchModalOpen(true)}
          >
            + Launch Instance
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
              Click any instance to inspect its live step progress and perform review actions.
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
          emptyMessage="No active process instances found. Launch a new instance to begin."
          onRowClick={(row) => navigate(`/process-admin/instances/${row.id}`)}
        />
      </div>

      {/* Launch Process Instance Modal */}
      <Modal
        isOpen={isLaunchModalOpen}
        onClose={() => {
          setIsLaunchModalOpen(false);
          setLaunchError('');
        }}
        title="Launch New Process Instance"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsLaunchModalOpen(false)}
              disabled={launching}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleLaunchSubmit}
              disabled={launching}
            >
              {launching ? 'Starting...' : 'Start Workflow'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleLaunchSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">
            Select a configured process template. The engine will instantiate all defined steps and assign the initial action.
          </p>

          <FormField
            label="Process Template"
            required
            error={launchError}
            hint="Only active templates with defined steps can be launched."
          >
            <Select
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value);
                setLaunchError('');
              }}
              placeholder="Choose a template..."
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version || 1}) - {t.steps?.length || 0} steps
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
