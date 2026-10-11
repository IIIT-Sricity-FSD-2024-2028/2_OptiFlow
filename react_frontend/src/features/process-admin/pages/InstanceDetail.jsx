import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInstance, actionStep, updateInstance } from '../../../services/api/process';
import { PATHS } from '../../../app/paths';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { Modal } from '../../../shared/components/Modal';
import { FormField, Textarea } from '../../../shared/components/FormField';
import { Loader } from '../../../shared/components/Loader';
import { formatDate } from '../../../shared/utils/formatDate';

export default function ProcessAdminInstanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState(null);
  const [error, setError] = useState(null);

  // Action Dialog State
  const [actionModal, setActionModal] = useState({
    open: false,
    step: null,
    actionType: null, // 'Approved' | 'Rejected' | 'Skipped'
  });
  const [actionComment, setActionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadInstance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getInstance(id);
      const inst = res?.data ?? res;
      setInstance(inst);
    } catch (err) {
      setError(err.message || 'Failed to load process instance details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadInstance();
    }
  }, [id]);

  const handleOpenActionModal = (step, actionType) => {
    setActionModal({
      open: true,
      step,
      actionType,
    });
    setActionComment('');
    setActionError('');
  };

  const handleExecuteAction = async () => {
    if (!actionModal.step) return;

    try {
      setSubmitting(true);
      setActionError('');

      await actionStep(actionModal.step.id, {
        status: actionModal.actionType,
        comment: actionComment.trim() || undefined,
      });

      setActionModal({ open: false, step: null, actionType: null });
      await loadInstance();
    } catch (err) {
      setActionError(err.message || `Failed to ${actionModal.actionType?.toLowerCase()} step`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      await updateInstance(id, { status: newStatus });
      await loadInstance();
    } catch (err) {
      setError(err.message || `Failed to update status to ${newStatus}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error || 'Process instance could not be found.'}
        </div>
        <Button variant="secondary" onClick={() => navigate(PATHS.PROCESS_ADMIN.INSTANCES)}>
          ← Return to Instances
        </Button>
      </div>
    );
  }

  const steps = instance.steps || [];
  const completedCount = steps.filter(
    (s) => s.status === 'Approved' || s.status === 'Completed' || s.status === 'Skipped'
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(PATHS.PROCESS_ADMIN.INSTANCES)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mb-1 cursor-pointer"
          >
            ← Back to All Instances
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {instance.template?.name || instance.title || 'Process Instance'}
            </h1>
            <Badge value={instance.status} type="status" />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Instance ID: {instance.id} • Started {formatDate(instance.createdAt)}
          </p>
        </div>

        {/* Administrative State Overrides */}
        <div className="flex items-center gap-2">
          {instance.status === 'Active' && (
            <Button
              variant="danger"
              className="text-xs py-1.5 px-3"
              onClick={() => handleManualStatusChange('Cancelled')}
            >
              Abort / Cancel Instance
            </Button>
          )}
          {(instance.status === 'Draft' || instance.status === 'Cancelled') && (
            <Button
              variant="primary"
              className="text-xs py-1.5 px-3"
              onClick={() => handleManualStatusChange('Active')}
            >
              Resume / Start Instance
            </Button>
          )}
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">Step Execution Progress</span>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">
            {completedCount} / {steps.length} Steps Complete
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                instance.status === 'Rejected'
                  ? 'bg-red-500'
                  : instance.status === 'Completed'
                  ? 'bg-emerald-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${steps.length ? (completedCount / steps.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-500 font-medium">Template Reference</span>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">
            {instance.template?.name || 'Custom Template'} (v{instance.template?.version || 1})
          </div>
          <button
            type="button"
            onClick={() => navigate(`/process-admin/templates/${instance.templateId}`)}
            className="text-xs text-blue-600 hover:underline mt-1 block cursor-pointer"
          >
            View Blueprint & Rules →
          </button>
        </div>

        <div>
          <span className="text-xs text-slate-500 font-medium">Associated Project</span>
          <div className="text-sm font-semibold text-slate-900 mt-0.5">
            {instance.project?.name || 'Organization-wide Workflow'}
          </div>
        </div>
      </div>

      {/* Visual Step Timeline & Interactive Action Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Workflow Execution Timeline</h2>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isCurrent = step.id === instance.currentStepId;
            const isPending = step.status === 'Pending';
            const isApproved = step.status === 'Approved';
            const isRejected = step.status === 'Rejected';
            const hasLoopback = Boolean(step.templateStep?.onRejectGotoStep);

            return (
              <div
                key={step.id || index}
                className={`bg-white rounded-xl border p-5 transition-all shadow-xs ${
                  isCurrent
                    ? 'border-blue-400 ring-2 ring-blue-500/10'
                    : isApproved
                    ? 'border-emerald-200'
                    : isRejected
                    ? 'border-red-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isRejected
                          ? 'bg-red-100 text-red-800'
                          : isCurrent
                          ? 'bg-blue-600 text-white animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isApproved ? '✓' : isRejected ? '✕' : index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {step.templateStep?.name || step.name || `Step ${index + 1}`}
                        </h3>
                        <Badge value={step.status} type="status" />
                        {isCurrent && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                            Active Step
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span>Type: <b>{step.templateStep?.stepType || 'Approval'}</b></span>
                        {step.assignedTo && (
                          <span>Assignee: <b>{step.assignedTo.fullName || step.assignedTo.email}</b></span>
                        )}
                        {step.actionedAt && (
                          <span>Actioned on: <b>{formatDate(step.actionedAt)}</b></span>
                        )}
                      </div>

                      {hasLoopback && (
                        <div className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md mt-2 inline-flex items-center gap-1 font-medium">
                          ↺ Rejection loopback rule configured: returns to prior step.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step Action Buttons (Only available for Pending active steps or Process Admin override) */}
                  {instance.status === 'Active' && isPending && (
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
                      <Button
                        variant="secondary"
                        className="text-xs py-1.5 px-3 bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        onClick={() => handleOpenActionModal(step, 'Rejected')}
                      >
                        ✕ Reject
                      </Button>
                      <Button
                        variant="primary"
                        className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleOpenActionModal(step, 'Approved')}
                      >
                        ✓ Approve
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Action Confirmation Modal */}
      <Modal
        isOpen={actionModal.open}
        onClose={() => setActionModal({ open: false, step: null, actionType: null })}
        title={`${actionModal.actionType === 'Approved' ? 'Approve' : 'Reject'} Step`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setActionModal({ open: false, step: null, actionType: null })}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.actionType === 'Approved' ? 'primary' : 'danger'}
              onClick={handleExecuteAction}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : `Confirm ${actionModal.actionType}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You are marking <b>{actionModal.step?.templateStep?.name || 'this step'}</b> as{' '}
            <span className={actionModal.actionType === 'Approved' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
              {actionModal.actionType}
            </span>.
            {actionModal.actionType === 'Rejected' && actionModal.step?.templateStep?.onRejectGotoStep && (
              <span className="block mt-2 text-amber-800 bg-amber-50 p-2.5 rounded-md text-xs">
                Notice: The process state machine will automatically loop back execution to the configured return step.
              </span>
            )}
          </p>

          {actionError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md">
              {actionError}
            </div>
          )}

          <FormField label="Decision Comments / Audit Notes">
            <Textarea
              rows={3}
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder="Add optional notes for the audit trail..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
