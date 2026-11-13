import React, { useState, useEffect } from "react";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { apiClient } from "../../../services/api/client";
import { useToast } from "../../../shared/components/Toast";
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ExternalLink,
  Send,
  User,
  FolderGit2
} from "lucide-react";

export function ReviewEvidenceModal({ isOpen, onClose, evidence, onReviewed }) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decision, setDecision] = useState("approve"); // "approve" | "reject"
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (evidence) {
      if (evidence.status === "Rejected") {
        setDecision("reject");
        setRejectionReason(evidence.rejectionReason || "");
      } else {
        setDecision("approve");
        setRejectionReason("");
      }
    }
  }, [evidence, isOpen]);

  const handleApprove = async () => {
    if (!evidence) return;
    setIsSubmitting(true);
    try {
      await apiClient(`/evidence/${evidence.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Approved" }),
      });
      toast.success("Evidence validated & violation auto-resolved!");
      if (onReviewed) onReviewed();
      handleClose();
    } catch (err) {
      toast.error("Failed to approve: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!evidence) return;
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 10) {
      toast.error("Please provide a rejection message of at least 10 characters so the submitter knows what to revise.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient(`/evidence/${evidence.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "Rejected",
          rejectionReason: trimmed,
        }),
      });
      toast.success("Feedback sent to team member. Deliverable flagged for revision.");
      if (onReviewed) onReviewed();
      handleClose();
    } catch (err) {
      toast.error("Failed to send rejection: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRejectionReason("");
    setDecision("approve");
    onClose();
  };

  if (!evidence) return null;

  const isCurrentlyRejected = evidence.status === "Rejected";
  const isCurrentlyApproved = evidence.status === "Approved";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Compliance Deliverable Adjudication"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>

          {decision === "reject" ? (
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={isSubmitting || rejectionReason.trim().length < 10}
              className="flex items-center gap-2"
            >
              <Send size={14} />
              {isSubmitting ? "Sending..." : isCurrentlyRejected ? "Update & Re-send Feedback" : "Reject & Send Feedback"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleApprove}
              disabled={isSubmitting || isCurrentlyApproved}
              className="flex items-center gap-2"
            >
              <CheckCircle2 size={14} />
              {isSubmitting ? "Approving..." : isCurrentlyApproved ? "Already Approved" : "Approve & Clear Blocker"}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-800">
        {/* Deliverable Metadata Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Deliverable Title
              </span>
              <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                {evidence.title}
              </h3>
            </div>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                isCurrentlyApproved
                  ? "bg-emerald-100 text-emerald-800"
                  : isCurrentlyRejected
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {isCurrentlyApproved ? "Approved" : isCurrentlyRejected ? "Rejected (Needs Revision)" : "Under Review"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 text-xs">
            <div>
              <span className="text-slate-400 block font-medium mb-0.5">Submitted By</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <User size={12} className="text-slate-400" />
                <span>{evidence.user?.fullName || evidence.user?.email || "Team Submitter"}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block font-medium mb-0.5">Associated Policy / Scope</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <FolderGit2 size={12} className="text-slate-400" />
                <span className="truncate" title={evidence.violation?.rule?.name || evidence.task?.title || "Policy Target"}>
                  {evidence.violation?.rule?.name || evidence.task?.title || "General Governance"}
                </span>
              </div>
            </div>

            {evidence.notes && (
              <div className="col-span-2 bg-white rounded-lg p-2.5 border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Submitter Notes:</span>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  "{evidence.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Attached Artifact Preview / Link */}
          {evidence.fileUrl ? (
            <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-xs font-semibold text-blue-900 block">Attached Artifact</span>
                  <span className="text-[11px] text-blue-700">Type: {evidence.evidenceType || "Report / Log"}</span>
                </div>
              </div>
              <a
                href={`${import.meta.env.VITE_API_URL || "http://localhost:5500"}/api/evidence/${evidence.id}/file?token=${encodeURIComponent(sessionStorage.getItem("authToken") || "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-white text-blue-700 font-semibold text-xs px-3 py-1.5 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors shadow-2xs"
              >
                <span>Open File</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <div className="text-center p-2 text-xs text-slate-400 italic bg-white rounded-lg border border-slate-200">
              No physical file attached to this submission.
            </div>
          )}
        </div>

        {/* Adjudication Decision Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Adjudication Decision
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecision("approve")}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                decision === "approve"
                  ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-400/30"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${decision === "approve" ? "text-emerald-600" : "text-slate-400"}`} />
              <div>
                <span className="text-xs font-bold block">Approve Evidence</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Validates requirement and auto-resolves any active blocker.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDecision("reject")}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                decision === "reject"
                  ? "border-rose-500 bg-rose-50/80 text-rose-950 ring-2 ring-rose-400/30"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <XCircle className={`w-4 h-4 mt-0.5 shrink-0 ${decision === "reject" ? "text-rose-600" : "text-slate-400"}`} />
              <div>
                <span className="text-xs font-bold block">Request Changes / Reject</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Flags deliverable as deficient and sends guidance to submitter.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Rejection Message Input Area */}
        {decision === "reject" && (
          <div className="space-y-2 bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-600" />
                <span>Rejection Message & Revision Instructions *</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Visible to Team Member & Project Manager
              </span>
            </div>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full bg-white border border-rose-300 rounded-lg p-3 text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              placeholder="Explain clearly what was wrong or missing (e.g. Unmasked plain-text PII found in logs; please apply SHA-256 salted hashes and re-upload)..."
            />

            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Minimum 10 characters required.</span>
              <span className={rejectionReason.trim().length >= 10 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                {rejectionReason.trim().length} / 10 min chars
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
