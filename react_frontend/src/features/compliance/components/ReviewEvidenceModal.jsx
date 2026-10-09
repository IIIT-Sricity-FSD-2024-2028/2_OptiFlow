import React, { useState } from "react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { apiClient } from "../../../services/api/client";

export function ReviewEvidenceModal({ isOpen, onClose, evidence, onReviewed }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateStatus = async (newStatus) => {
    if (!evidence) return;
    
    setIsSubmitting(true);
    try {
      await apiClient(`/evidence/${evidence.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      onReviewed(); // Refresh the list in the parent component
      onClose();    // Close modal
    } catch (err) {
      alert("Failed to update status: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!evidence) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Review Evidence Submission"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <div className="flex gap-2">
            <Button 
              variant="danger" 
              onClick={() => handleUpdateStatus('Rejected')}
              disabled={isSubmitting || evidence.status === 'Rejected'}
            >
              Reject
            </Button>
            <Button 
              variant="primary" 
              onClick={() => handleUpdateStatus('Approved')}
              disabled={isSubmitting || evidence.status === 'Approved'}
            >
              Approve & Resolve Violation
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div>
            <span className="font-semibold block text-gray-500 mb-1">Title</span>
            <span className="text-gray-900">{evidence.title}</span>
          </div>
          <div>
            <span className="font-semibold block text-gray-500 mb-1">Type</span>
            <span className="text-gray-900">{evidence.evidenceType}</span>
          </div>
          <div className="col-span-2">
            <span className="font-semibold block text-gray-500 mb-1">Submitter Notes</span>
            <p className="text-gray-700 italic bg-white p-3 rounded border border-gray-200">
              {evidence.notes || "No additional notes provided by the submitter."}
            </p>
          </div>
        </div>

        {evidence.fileUrl ? (
          <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-semibold text-blue-900">Attached Document</span>
              <span className="text-blue-700 text-xs mt-1">Review the provided proof before approving.</span>
            </div>
            <a 
              href={`http://localhost:5500/api/evidence/${evidence.id}/file`}
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-md text-blue-700 font-semibold border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm"
            >
              View File ↗
            </a>
          </div>
        ) : (
          <div className="border border-gray-200 bg-gray-50 p-4 rounded-lg text-center text-gray-500">
            No physical file was attached to this submission.
          </div>
        )}
      </div>
    </Modal>
  );
}
