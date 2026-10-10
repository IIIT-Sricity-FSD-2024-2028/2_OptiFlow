import React, { useRef, useState } from 'react';
import { Button } from '../../../shared/components/Button';

export function EvidenceUploadCard({
  taskId,
  evidenceList = [],
  readOnly = false,
  onUpload,
  onDelete
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h3 className="font-semibold text-gray-900">Evidence / Deliverables</h3>
          <p className="text-xs text-gray-500 mt-1">Files related to this task</p>
        </div>
        {!readOnly && (
          <div>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        )}
      </div>

      <div className="p-5">
        {evidenceList.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No evidence uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {evidenceList.map((evidence) => (
              <li key={evidence.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 shrink-0 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                    <span className="text-xl">📄</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {evidence.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Uploaded {evidence.uploadedAt ? new Date(evidence.uploadedAt).toLocaleDateString() : ''} 
                      {evidence.uploadedBy ? ` by ${evidence.uploadedBy}` : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {evidence.url && (
                    <a 
                      href={evidence.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </a>
                  )}
                  {!readOnly && onDelete && (
                    <button 
                      onClick={() => onDelete(evidence.id)}
                      className="text-sm text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
