import React, { useState } from 'react';
import { FileText, ExternalLink, Edit2, Trash2, MessageSquare } from 'lucide-react';
import EmptyState from '../../../../shared/components/EmptyState';
import { EvidenceFeedbackModal } from '../../../../shared/components/EvidenceFeedbackModal';
import { StatusBadge } from '../../components/StatusBadge';
import { openEvidenceFile } from '../../../../shared/utils/evidenceFile';

function formatSubmittedDate(ev) {
  const raw = ev?.submittedAt || ev?.createdAt || ev?.updatedAt;
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

export default function EvidenceTable({
  evidence,
  tasks = [],
  searchQuery,
  typeFilter,
  statusFilter,
  onEditItem,
  onDeleteItem,
}) {
  const [feedbackItem, setFeedbackItem] = useState(null);

  const feedbackTaskTitle = feedbackItem
    ? tasks.find(
        (t) => String(t.id || t.taskId) === String(feedbackItem.taskId || feedbackItem.task_id)
      )?.title || feedbackItem.task?.title
    : null;

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      {evidence.length === 0 ? (
        <div className="p-12">
          <EmptyState
            icon={<FileText className="w-10 h-10 text-slate-400" />}
            title="No evidence found"
            description={
              searchQuery || typeFilter || statusFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'You have not uploaded any deliverables yet.'
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Artifact Title</th>
                <th className="py-3.5 px-6">Related Task</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Submitted</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {evidence.map((ev) => {
                const taskObj = tasks.find(
                  (t) => String(t.id || t.taskId) === String(ev.taskId || ev.task_id)
                );
                const fileUrl = ev.fileUrl || ev.url;
                const feedbackMessage = ev.rejectionReason || ev.notes;
                const isRejected = String(ev.status || '').toLowerCase() === 'rejected';

                return (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        {ev.title || ev.name}
                      </div>
                      {feedbackMessage && (
                        <div
                          className={`text-[11px] mt-0.5 truncate max-w-xs ${
                            isRejected ? 'text-rose-600 font-medium' : 'text-slate-400'
                          }`}
                          title={feedbackMessage}
                        >
                          {isRejected ? `Rejection feedback: ${feedbackMessage}` : feedbackMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                      {taskObj?.title || ev.task?.title || `Task #${String(ev.taskId || '').slice(0, 8)}`}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        {ev.evidenceType || ev.type || 'Document'}
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <StatusBadge status={ev.status || 'Under Review'} />
                    </td>
                    <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                      {formatSubmittedDate(ev)}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap space-x-1.5">
                      {(isRejected || feedbackMessage) && (
                        <button
                          type="button"
                          onClick={() => setFeedbackItem(ev)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors cursor-pointer ${
                            isRejected
                              ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                          }`}
                          aria-label={isRejected ? 'View rejection message' : 'View submission notes'}
                          title={isRejected ? 'View rejection message' : 'View submission notes'}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      {fileUrl && (() => {
                        const isExternalUrl =
                          fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
                        return isExternalUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Open File"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEvidenceFile(ev.id)}
                            className="inline-flex p-1 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Open File"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        );
                      })()}
                      {String(ev.status || 'Pending') === 'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEditItem(ev)}
                            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                            title="Edit Artifact"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(ev)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete Artifact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <EvidenceFeedbackModal
        isOpen={Boolean(feedbackItem)}
        onClose={() => setFeedbackItem(null)}
        evidence={feedbackItem}
        taskTitle={feedbackTaskTitle}
      />
    </div>
  );
}
