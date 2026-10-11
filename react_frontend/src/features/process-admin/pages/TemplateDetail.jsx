import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTemplate, updateTemplate, createInstance } from '../../../services/api/process';
import { PATHS } from '../../../app/paths';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { FormField, Input, Select } from '../../../shared/components/FormField';
import { Loader } from '../../../shared/components/Loader';

const STEP_TYPES = [
  { value: 'Approval', label: 'Approval (Reviewer accepts/rejects)' },
  { value: 'Input_Required', label: 'Input Required (Form submission/Evidence upload)' },
  { value: 'Automated_Task', label: 'Automated Task (System background action)' },
];

export default function ProcessAdminTemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateVersion, setTemplateVersion] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await getTemplate(id);
      const data = res?.data ?? res;
      setTemplate(data);
      setTemplateName(data.name || '');
      setTemplateVersion(data.version || 1);
      setIsActive(Boolean(data.isActive));

      const existingSteps = (data.steps || []).map((s, index) => ({
        id: s.id || `step-temp-${index}`,
        name: s.name,
        stepOrder: s.stepOrder ?? index + 1,
        stepType: s.stepType || 'Approval',
        onRejectGotoStepId: s.onRejectGotoStepId || null,
      }));
      setSteps(existingSteps);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load process template' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  const handleAddStep = () => {
    const newStepIndex = steps.length;
    setSteps((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}-${newStepIndex}`,
        name: `Step ${newStepIndex + 1}`,
        stepOrder: newStepIndex + 1,
        stepType: 'Approval',
        onRejectGotoStepId: null,
      },
    ]);
  };

  const handleRemoveStep = (indexToRemove) => {
    setSteps((prev) => {
      const removedId = prev[indexToRemove].id;
      const updated = prev
        .filter((_, idx) => idx !== indexToRemove)
        .map((s, idx) => ({
          ...s,
          stepOrder: idx + 1,
          onRejectGotoStepId: s.onRejectGotoStepId === removedId ? null : s.onRejectGotoStepId,
        }));
      return updated;
    });
  };

  const handleStepChange = (index, field, value) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleMoveStep = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    setSteps((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;

      return updated.map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    });
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      setFeedback({ type: 'error', message: 'Template name cannot be empty' });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      // Prepare payload for backend update
      const formattedSteps = steps.map((s, idx) => {
        const targetStep = s.onRejectGotoStepId
          ? steps.find((item) => item.id === s.onRejectGotoStepId)
          : null;

        return {
          id: s.id && !String(s.id).startsWith('temp-') ? s.id : undefined,
          name: s.name.trim() || `Step ${idx + 1}`,
          stepOrder: idx + 1,
          stepType: s.stepType,
          onRejectGotoStepId: s.onRejectGotoStepId ? s.onRejectGotoStepId : null,
          onRejectGotoStepOrder: targetStep ? targetStep.stepOrder : null,
        };
      });

      await updateTemplate(id, {
        name: templateName.trim(),
        version: Number(templateVersion),
        isActive,
        steps: formattedSteps,
      });

      setFeedback({ type: 'success', message: 'Process template saved successfully!' });
      await loadTemplate();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save process template' });
    } finally {
      setSaving(false);
    }
  };

  const handleLaunchDirect = async () => {
    try {
      setLaunching(true);
      const res = await createInstance({ templateId: id });
      const instanceId = res?.id || res?.data?.id;
      if (instanceId) {
        navigate(`/process-admin/instances/${instanceId}`);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to launch instance' });
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate(PATHS.PROCESS_ADMIN.TEMPLATES)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mb-1 cursor-pointer"
          >
            ← Back to Templates
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {templateName || 'Untitled Template'}
            </h1>
            <Badge value={isActive ? 'Active' : 'Inactive'} type="status" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleLaunchDirect}
            disabled={launching || saving || steps.length === 0 || !isActive}
          >
            {launching ? 'Launching...' : '▶ Launch Instance'}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Template Metadata Card (Controlled Form) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Template Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Template Title" required>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="E.g. Capital Asset Request"
              />
            </FormField>
          </div>
          <div>
            <FormField label="Version Number">
              <Input
                type="number"
                min="1"
                value={templateVersion}
                onChange={(e) => setTemplateVersion(e.target.value)}
              />
            </FormField>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="templateActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="templateActive" className="text-sm text-slate-700 font-medium">
            Active blueprint (Team members can launch instances from this template)
          </label>
        </div>
      </div>

      {/* Step Sequence Builder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Execution Steps & Decision Rules</h2>
            <p className="text-xs text-slate-500">
              Configure each linear step and specify where the workflow loops back if rejected.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleAddStep}
            className="text-xs py-1.5 px-3"
          >
            + Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6">
            <p className="text-sm text-slate-600 font-medium">No steps configured yet.</p>
            <p className="text-xs text-slate-400 mt-1">Add your first approval or task step to start the workflow.</p>
            <div className="mt-4">
              <Button variant="primary" onClick={handleAddStep}>
                Add Initial Step
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => {
              // Possible loopback targets are only steps that precede this step
              const priorSteps = steps.slice(0, index);

              return (
                <div
                  key={step.id || index}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative transition-all hover:border-slate-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        Step {index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveStep(index, -1)}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded hover:bg-slate-50 cursor-pointer"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={index === steps.length - 1}
                        onClick={() => handleMoveStep(index, 1)}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 rounded hover:bg-slate-50 cursor-pointer"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(index)}
                        className="ml-2 text-xs text-red-600 hover:text-red-800 font-medium p-1 rounded hover:bg-red-50 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {/* Step Title */}
                    <div>
                      <FormField label="Step Name" required>
                        <Input
                          value={step.name}
                          onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                          placeholder="E.g., Department Manager Sign-off"
                        />
                      </FormField>
                    </div>

                    {/* Step Type */}
                    <div>
                      <FormField label="Step Type" required>
                        <Select
                          value={step.stepType}
                          onChange={(e) => handleStepChange(index, 'stepType', e.target.value)}
                        >
                          {STEP_TYPES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>

                    {/* Reject Loopback Configuration */}
                    <div>
                      <FormField
                        label="On Rejection Loopback"
                        hint={
                          priorSteps.length === 0
                            ? 'First step: rejection marks workflow as Rejected.'
                            : 'Select which prior step to return to upon rejection.'
                        }
                      >
                        <Select
                          value={step.onRejectGotoStepId || ''}
                          onChange={(e) =>
                            handleStepChange(index, 'onRejectGotoStepId', e.target.value || null)
                          }
                          disabled={priorSteps.length === 0}
                        >
                          <option value="">Abort & Mark Instance Rejected</option>
                          {priorSteps.map((p, pIdx) => (
                            <option key={p.id || pIdx} value={p.id}>
                              ↺ Loopback to Step {pIdx + 1}: {p.name}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
