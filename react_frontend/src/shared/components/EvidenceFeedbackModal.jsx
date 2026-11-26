import React from 'react';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Button } from './Button';
import { MessageSquare, XCircle, CheckCircle2, Clock, User } from 'lucide-react';

function formatTimestamp(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EvidenceFeedbackModal({ isOpen, onClose, evidence, taskTitle }) {
  if (!evidence) return null;

  const status = String(evidence.status || 'Pending');
  const isRejected = status.toLowerCase() === 'rejected';
  const isApproved = status.toLowerCase() === 'approved';
  const message = evidence.rejectionReason || evidence.notes || '';
  const reviewerName =
    evidence.reviewedBy?.fullName ||
    evidence.reviewedBy?.email ||
    (isRejected || isApproved ? 'Reviewer' : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRejected ? 'Rejection Feedback' : 'Evidence Review Message'}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium">Deliverable:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[260px]">
              {evidence.title || evidence.name || 'Untitled Artifact'}
            </span>
          </div>
          {(taskTitle || evidence.task?.title) && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">Related Task:</span>
              <span className="font-medium text-slate-800 truncate max-w-[260px]">
                {taskTitle || evidence.task?.title}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium">Status:</span>
            <Badge
              status={
                isApproved
                  ? 'success'
                  : isRejected
                    ? 'danger'
                    : status === 'Under_Review'
                      ? 'warning'
                      : 'default'
              }
            >
              {status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium">Submitted:</span>
            <span className="text-slate-700">
              {formatTimestamp(evidence.submittedAt || evidence.createdAt || evidence.updatedAt)}
            </span>
          </div>
          {reviewerName && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 font-medium">Reviewed By:</span>
              <span className="text-slate-800 font-medium inline-flex items-center gap-1">
                <User size={12} className="text-slate-400" />
                {reviewerName}
                {evidence.reviewedAt ? ` (${formatTimestamp(evidence.reviewedAt)})` : ''}
              </span>
            </div>
          )}
        </div>

        <div
          className={`rounded-xl border p-4 space-y-2 ${
            isRejected
              ? 'border-rose-200 bg-rose-50/80'
              : isApproved
                ? 'border-emerald-200 bg-emerald-50/60'
                : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${
              isRejected
                ? 'text-rose-700'
                : isApproved
                  ? 'text-emerald-700'
                  : 'text-slate-700'
            }`}
          >
            {isRejected ? (
              <XCircle size={15} className="text-rose-600 shrink-0" />
            ) : isApproved ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            ) : status === 'Under_Review' ? (
              <Clock size={15} className="text-amber-600 shrink-0" />
            ) : (
              <MessageSquare size={15} className="text-slate-500 shrink-0" />
            )}
            <span>
              {isRejected ? 'Rejection Message & Revision Guidance' : 'Reviewer / Submission Notes'}
            </span>
          </div>

          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-white/90 rounded-lg border border-black/5 p-3">
            {message || (isRejected ? 'No rejection message was recorded.' : 'No notes recorded.')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
