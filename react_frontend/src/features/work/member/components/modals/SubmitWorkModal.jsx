import React, { useState, useRef } from 'react';
import { Modal } from '../../../../../shared/components/Modal';
import { Button } from '../../../../../shared/components/Button';
import { FormField, Textarea, Input } from '../../../../../shared/components/FormField';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../shared/components/Toast';
import * as tasksApi from '../../../../../services/api/tasks';
import * as evidenceApi from '../../../../../services/api/evidence';
import { Upload, FileText, X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function SubmitWorkModal({
  isOpen,
  onClose,
  taskId,
  taskTitle = 'Task',
  isEvidenceRequired = false,
  complianceRuleName = '',
  existingEvidenceCount = 0,
  onSuccess,
}) {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [submitNotes, setSubmitNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState('Work Output');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setDocTitle('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!submitNotes.trim()) {
      toast.warning('Please provide a brief summary of completed work.');
      return;
    }

    setSubmitting(true);
    try {
      let createdEvidence = null;

      // 1. If member attached a file, upload it as evidence
      if (selectedFile) {
        const evidencePayload = {
          taskId: String(taskId),
          title: docTitle.trim() || selectedFile.name,
          evidenceType: evidenceType || 'Work Output',
          notes: submitNotes.trim(),
          fileUrl: selectedFile.name,
          userId: user?.id,
        };

        const res = await evidenceApi.create(evidencePayload);
        const evidenceId = res?.data?.id || res?.id;
        if (evidenceId) {
          await evidenceApi.uploadFile(evidenceId, selectedFile);
          createdEvidence = res?.data || res;
        }
      }

      // 2. Transition task to In_Review for Team Lead
      await tasksApi.update(taskId, {
        status: 'In_Review',
      });

      toast.success(
        selectedFile
          ? 'Work submitted for review and deliverable artifact uploaded!'
          : 'Work submitted to your team leader for review!'
      );

      setSubmitNotes('');
      setSelectedFile(null);
      setDocTitle('');
      onSuccess?.(createdEvidence);
      onClose();
    } catch (err) {
      console.error(err);
      if (err.error === 'COMPLIANCE_BLOCK' || err.message?.toLowerCase().includes('compliance')) {
        toast.error(
          `Submission blocked: Compliance rule "${complianceRuleName || 'Audit Policy'}" requires approved evidence before review.`
        );
      } else {
        toast.error(err.message || 'Failed to submit work for review.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Work for Review">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Compliance Status Notice */}
        {isEvidenceRequired ? (
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">
                Compliance Governed Deliverable
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                This task is governed by <strong>{complianceRuleName || 'a mandatory policy'}</strong>.
                {existingEvidenceCount > 0
                  ? ` You have already submitted ${existingEvidenceCount} artifact(s).`
                  : ' Please attach your proof or work deliverable below.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">
              Evidence is <strong>optional</strong> for this task. You can submit with just notes.
            </span>
            {existingEvidenceCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                {existingEvidenceCount} artifact(s) linked
              </span>
            )}
          </div>
        )}

        <FormField label="Completion Summary & Notes" required>
          <Textarea
            rows={3}
            placeholder="Describe what was accomplished, link any pull requests, commits, docs, or remarks..."
            value={submitNotes}
            onChange={(e) => setSubmitNotes(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>

        {/* Optional Deliverable / Evidence File Attachment */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Attach Deliverable / Evidence File <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            {selectedFile && (
              <span className="text-[11px] text-blue-600 font-medium">1 file selected</span>
            )}
          </div>

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={submitting}
              />
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">
                Click to browse or drop an artifact
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PDF, images, zip, docs, or test results (max 25MB)
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={submitting}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-blue-100">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">
                    Artifact Title
                  </label>
                  <Input
                    size="sm"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Pull Request Log"
                    disabled={submitting}
                    className="text-xs mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">
                    Category
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    disabled={submitting}
                    className="w-full text-xs mt-0.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Work Output">Work Output</option>
                    <option value="Document">Document</option>
                    <option value="Screenshot">Screenshot</option>
                    <option value="Audit Log">Audit Log</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || !submitNotes.trim()}>
            {submitting ? 'Submitting...' : 'Confirm Submission'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
