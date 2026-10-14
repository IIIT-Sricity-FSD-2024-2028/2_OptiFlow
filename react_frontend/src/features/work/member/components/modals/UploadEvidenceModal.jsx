import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../shared/components/Modal';
import { Button } from '../../../../../shared/components/Button';
import { FormField, Input, Select, Textarea } from '../../../../../shared/components/FormField';
import { FileUpload } from '../../../../../shared/components/FileUpload';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../shared/components/Toast';
import { EVIDENCE_TYPES } from '../../../constants';
import * as evidenceApi from '../../../../../services/api/evidence';

export function UploadEvidenceModal({
  isOpen,
  onClose,
  taskId = '',
  tasks = [],
  initialData = null,
  onSuccess,
}) {
  const { user } = useAuth();
  const toast = useToast();

  const [selectedTaskId, setSelectedTaskId] = useState(taskId || '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState(EVIDENCE_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      if (initialData) {
        setTitle(initialData.title || initialData.name || '');
        setType(initialData.type || initialData.evidenceType || EVIDENCE_TYPES[0]);
        setNotes(initialData.notes || initialData.description || '');
        setFileUrl(initialData.fileUrl || initialData.url || '');
        setSelectedTaskId(initialData.taskId || initialData.task_id || taskId || '');
      } else {
        setTitle('');
        setType(EVIDENCE_TYPES[0]);
        setNotes('');
        setFileUrl('');
        setSelectedTaskId(taskId || (tasks[0]?.id || ''));
      }
    }
  }, [isOpen, initialData, taskId, tasks]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      toast.warning('Title must be at least 3 characters.');
      return;
    }

    const finalTaskId = taskId || selectedTaskId;
    if (!finalTaskId) {
      toast.warning('Please select an associated task.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        taskId: String(finalTaskId),
        title: title.trim(),
        evidenceType: type,
        notes: notes.trim(),
        fileUrl: selectedFile ? selectedFile.name : (fileUrl.trim() || 'deliverable_artifact.pdf'),
        userId: user?.id,
      };

      let result;
      if (initialData?.id) {
        result = await evidenceApi.update(initialData.id, payload);
        if (selectedFile) {
          await evidenceApi.uploadFile(initialData.id, selectedFile);
        }
        toast.success('Evidence updated successfully.');
      } else {
        result = await evidenceApi.create(payload);
        const createdId = result?.data?.id || result?.id;
        if (selectedFile && createdId) {
          await evidenceApi.uploadFile(createdId, selectedFile);
        }
        toast.success('Evidence artifact uploaded for compliance verification!');
      }

      onSuccess?.(result?.data || result);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = Boolean(initialData?.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Evidence Deliverable' : 'Upload Task Evidence'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!taskId && tasks.length > 0 && !isEditing && (
          <FormField label="Target Task" required>
            <Select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={submitting}
            >
              <option value="">Select a task...</option>
              {tasks.map((t) => (
                <option key={t.id || t.taskId} value={t.id || t.taskId}>
                  {t.title}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Artifact Title" required>
            <Input
              placeholder="e.g. Test Coverage Report v1.2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              required
            />
          </FormField>

          <FormField label="Evidence Category" required>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FileUpload
          label="Attach File / Deliverable Artifact"
          hint="PDF, PNG, JPG, CSV, DOCX up to 20MB"
          accept=".pdf,.png,.jpg,.jpeg,.csv,.doc,.docx"
          onFileSelect={(file) => {
            setSelectedFile(file);
            if (!title.trim() && file?.name) {
              setTitle(file.name.replace(/\.[^/.]+$/, ''));
            }
          }}
        />

        <FormField label="External Link / Storage URL (Optional)">
          <Input
            placeholder="e.g. https://github.com/org/repo/pull/42 or cloud storage link"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="Verification Notes & Scope">
          <Textarea
            rows={3}
            placeholder="Notes explaining what this artifact verifies for audit and compliance..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Upload Deliverable'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
