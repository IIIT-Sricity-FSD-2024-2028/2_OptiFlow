import React, { useState } from "react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { apiClient } from "../../../services/api/client";

export function ResolveViolationModal({
  isOpen,
  onClose,
  violation,
  onResolved,
}) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!violation || resolutionNotes.trim().length < 5) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient(`/compliance-violations/${violation.id || violation.rawViolation?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Resolved',
          resolutionRemarks: resolutionNotes
        })
      });
      
      setResolutionNotes("");
      onResolved();
      onClose();
    } catch (err) {
      setError("Failed to resolve: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {
        setResolutionNotes("");
        setError(null);
        onClose();
      }}
      title="Manual Override: Force Resolve"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting || resolutionNotes.trim().length < 5}
          >
            {isSubmitting ? 'Resolving...' : 'Force Resolve'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 text-[13px] text-red-800 bg-red-50 p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      <div className="mb-4 text-[13px] text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-200">
        WARNING: You are manually bypassing the evidence workflow. Please provide explicit justification. This will be permanently logged for audit purposes.
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Resolution Notes *</label>
        <textarea 
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          className="w-full border border-slate-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] outline-none"
          rows={4}
          placeholder="Describe the actions taken to clear this violation..."
        />
      </div>
    </Modal>
  );
}
