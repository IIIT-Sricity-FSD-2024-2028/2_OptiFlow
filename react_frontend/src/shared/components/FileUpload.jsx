import React, { useState, useRef } from 'react';

// WHY: Compliance evidence, project assets, and profile pictures require uploading documents.
// FileUpload provides a consistent drag-and-drop zone with client-side size limits,
// instant validation feedback, and a clean file preview chip across all 9 roles.
export const FileUpload = ({
  accept = '*/*',
  maxMB = 10,
  onUpload,
  onFileSelect,
  label,
  hint,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Format bytes to clean KB/MB string
  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFile = (file) => {
    if (!file) return;

    // Validate maximum file size
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File size exceeds the ${maxMB}MB limit (${formatSize(file.size)})`);
      return;
    }

    setError(null);
    setSelectedFile(file);
    if (onUpload) onUpload(file);
    if (onFileSelect) onFileSelect(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          {label}
        </label>
      )}

      {selectedFile ? (
        // Selected File Preview Card
        <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatSize(selectedFile.size)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg transition-colors"
            title="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Dropzone Area
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-3 text-gray-400 group-hover:text-indigo-500 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="text-sm font-medium text-gray-700 text-center">
            <span className="text-indigo-600 font-semibold hover:underline">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {hint || `Supported formats up to ${maxMB}MB`}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
          />
        </label>
      )}

      {error && (
        <p className="mt-2 text-xs font-medium text-rose-600 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
