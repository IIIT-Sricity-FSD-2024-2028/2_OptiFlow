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
  const [waiverType, setWaiverType] = useState("PROVISIONAL_EXEMPTION");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!violation || resolutionNotes.trim().length < 10) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient(`/compliance-violations/${violation.id || violation.rawViolation?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Resolved',
          waiverType,
          resolutionRemarks: resolutionNotes.trim()
        })
      });
      
      setResolutionNotes("");
      onResolved();
      onClose();
    } catch (err) {
      setError("Failed to grant waiver: " + err.message);
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
      title="Compliance Fast-Track Waiver & Exception"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            variant="warning" 
            onClick={handleSubmit}
            disabled={isSubmitting || resolutionNotes.trim().length < 10}
          >
            {isSubmitting ? 'Applying Waiver...' : 'Grant Waiver & Unblock Task'}
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
          <strong className="block font-semibold mb-1">Fast-Track Compliance Exemption</strong>
          Granting a waiver lifts any active governance lockouts and resolves the violation. Your identity, waiver classification, and justification will be permanently stamped in the audit trail and notified to the Project Manager.
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Waiver Classification *</label>
          <select
            value={waiverType}
            onChange={(e) => setWaiverType(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="PROVISIONAL_EXEMPTION">Provisional Exemption (Temporary unblock until next sprint / audit)</option>
            <option value="PERMANENT_WAIVER">Permanent Policy Waiver (Scope-specific regulatory exemption)</option>
            <option value="FALSE_POSITIVE">False Positive (Deliverable verified through alternative evidence)</option>
            <option value="ADMIN_OVERRIDE">Executive Directive (Emergency business continuity override)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">Regulatory Justification & Audit Notes *</label>
          <textarea 
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-shadow"
            rows={4}
            placeholder="Explain why this waiver is legally/operationally justified (e.g. Third-party pen test scheduled for Oct 30; CTO signed ticket SEC-104)..."
          />
          <span className="text-xs text-slate-400">Minimum 10 characters required.</span>
        </div>
      </div>
    </Modal>
  );
}
