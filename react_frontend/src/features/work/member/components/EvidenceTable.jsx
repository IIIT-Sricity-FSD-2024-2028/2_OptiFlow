import React from 'react';
import { FileText, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import EmptyState from '../../../../shared/components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { openEvidenceFile } from '../../../../shared/utils/evidenceFile';

export default function EvidenceTable({
  evidence,
  tasks = [],
  searchQuery,
  typeFilter,
  statusFilter,
  onEditItem,
  onDeleteItem,
}) {
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

                return (
                  <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 max-w-xs">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        {ev.title || ev.name}
                      </div>
                      {ev.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                          {ev.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                      {taskObj?.title || `Task #${String(ev.taskId || '').slice(0, 8)}`}
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
                      {ev.createdAt ? new Date(ev.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap space-x-2">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
