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
            variant="warning" 
            onClick={handleSubmit}
            disabled={isSubmitting || resolutionNotes.trim().length < 5}
          >
            {isSubmitting ? 'Resolving...' : 'Force Resolve'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 text-sm text-red-800 bg-red-50 p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      <div className="mb-5 flex gap-3 text-sm text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-200">
        <svg className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <strong className="block font-semibold mb-1">WARNING: Bypassing standard workflow</strong>
          You are manually bypassing the evidence review workflow. Please provide explicit justification below. This action and your notes will be permanently logged for audit purposes.
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Resolution Notes *</label>
        <textarea 
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-shadow"
          rows={4}
          placeholder="Describe the specific reason or actions taken to clear this violation..."
        />
      </div>
    </Modal>
  );
}
