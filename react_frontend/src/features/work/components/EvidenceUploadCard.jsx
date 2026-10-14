import React, { useRef, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { FileText, ExternalLink, Trash2 } from 'lucide-react';

export function EvidenceUploadCard({
  taskId,
  evidenceList = [],
  readOnly = false,
  onUpload,
  onRequestUpload,
  onDelete,
}) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (onRequestUpload) {
      onRequestUpload();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Evidence & Deliverable Artifacts</h3>
          <p className="text-xs text-slate-500 mt-0.5">Files, audit records, or links verifying this deliverable</p>
        </div>
        {!readOnly && (
          <div>
            {!onRequestUpload && (
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleButtonClick}
              disabled={isUploading}
              className="text-xs font-semibold"
            >
              {isUploading ? 'Uploading...' : 'Upload Evidence'}
            </Button>
          </div>
        )}
      </div>

      <div className="p-5">
        {evidenceList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No evidence deliverables submitted yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {evidenceList.map((evidence) => {
              const title = evidence.title || evidence.name || 'Deliverable Artifact';
              const fileUrl = evidence.fileUrl || evidence.url;
              const evType = evidence.evidenceType || evidence.type || 'Document';
              const date = evidence.createdAt || evidence.uploadedAt;

              return (
                <li key={evidence.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-9 w-9 shrink-0 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-blue-600">{evType}</span>
                        {date && <span>• {new Date(date).toLocaleDateString()}</span>}
                        {evidence.notes && <span className="truncate max-w-xs">• {evidence.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {fileUrl && (() => {
                      const token = sessionStorage.getItem('authToken') || '';
                      const isExternalUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
                      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5500';
                      const viewUrl = isExternalUrl
                        ? fileUrl
                        : (evidence.id ? `${apiBase}/api/evidence/${evidence.id}/file?token=${encodeURIComponent(token)}` : fileUrl);
                      return (
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>
                      );
                    })()}
                    {!readOnly && onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(evidence.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Remove evidence"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
