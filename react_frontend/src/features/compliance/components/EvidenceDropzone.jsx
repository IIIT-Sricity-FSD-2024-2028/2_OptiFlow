import React, { useState, useRef, useCallback } from 'react';
import SeverityBadge from './SeverityBadge';

/**
 * Utility: Compute SHA-256 Hash using browser native Web Crypto API
 * @param {File | Blob} file
 * @returns {Promise<string>} Hexadecimal SHA-256 string
 */
export async function calculateSHA256(file) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not supported in this environment.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Utility: Format byte sizes nicely
 */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * EvidenceDropzone Component
 * Dual-Mode:
 *   1. Upload Mode: Drag-and-drop, MIME/size validation, Web Crypto SHA-256 calculation
 *   2. Review Mode: Document download, SHA-256 hash verification against audit ledger
 */
export function EvidenceDropzone({
  mode = 'upload', // 'upload' | 'review'
  initialEvidence = null,
  onEvidenceAttached,
  onModeChange,
  maxSizeMB = 10,
  acceptedMimeTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  style = {},
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [isDragging, setIsDragging] = useState(false);
  const [hashingState, setHashingState] = useState('idle'); // 'idle' | 'processing' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [fileData, setFileData] = useState(null);

  // Review mode verification states
  const [reviewVerificationStatus, setReviewVerificationStatus] = useState(null); // 'matched' | 'mismatched' | 'checking' | null
  const [computedReviewHash, setComputedReviewHash] = useState(null);

  const fileInputRef = useRef(null);
  const reviewFileInputRef = useRef(null);

  // Synchronize internal mode if prop changes
  React.useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  /**
   * Process and validate a selected file
   */
  const processFile = useCallback(
    async (file) => {
      setErrorMessage(null);
      setFileData(null);
      setHashingState('processing');

      // 1. Size Validation
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setErrorMessage(`File exceeds maximum size limit of ${maxSizeMB} MB.`);
        setHashingState('error');
        return;
      }

      // 2. MIME Type Validation
      if (acceptedMimeTypes.length > 0 && !acceptedMimeTypes.includes(file.type)) {
        // Fallback check on extension if MIME is generic
        const ext = file.name.split('.').pop()?.toLowerCase();
        const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'txt'];
        if (!validExtensions.includes(ext)) {
          setErrorMessage(
            `Unsupported file format (${file.type || ext}). Allowed: PDF, PNG, JPG, DOCX, TXT.`
          );
          setHashingState('error');
          return;
        }
      }

      try {
        // 3. Web Crypto API SHA-256 computation
        const hash = await calculateSHA256(file);

        const newFileData = {
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          sha256: hash,
          uploadedAt: new Date().toISOString(),
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        };

        setFileData(newFileData);
        setHashingState('ready');
      } catch (err) {
        setErrorMessage(`Hashing failed: ${err.message}`);
        setHashingState('error');
      }
    },
    [acceptedMimeTypes, maxSizeMB]
  );

  /**
   * Drag and Drop Handlers
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleAttachEvidence = () => {
    if (fileData && onEvidenceAttached) {
      onEvidenceAttached(fileData);
      setFileData(null);
      setHashingState('idle');
    }
  };

  /**
   * Review Mode: Verify a file against expected audit hash
   */
  const handleVerifyFileAgainstLedger = async (file) => {
    if (!initialEvidence || !initialEvidence.sha256) return;
    setReviewVerificationStatus('checking');

    try {
      const calculated = await calculateSHA256(file);
      setComputedReviewHash(calculated);

      if (calculated.toLowerCase() === initialEvidence.sha256.toLowerCase()) {
        setReviewVerificationStatus('matched');
      } else {
        setReviewVerificationStatus('mismatched');
      }
    } catch (err) {
      setReviewVerificationStatus('error');
    }
  };

  /**
   * Simulated Download
   */
  const handleDownload = () => {
    if (initialEvidence) {
      const content = `--- OptiFlow Regulatory Evidence ---\nDocument: ${initialEvidence.name}\nSHA-256: ${initialEvidence.sha256}\nTimestamp: ${initialEvidence.uploadedAt}\nAuditor: Vaitish (Compliance Pod)\nStatus: Immutable Audit Record`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = initialEvidence.name.endsWith('.txt') ? initialEvidence.name : `${initialEvidence.name}.audit.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        ...style,
      }}
    >
      {/* Header with Mode Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
            {currentMode === 'upload' ? '📁 Evidence Submission (Hashing Engine)' : '🔍 Evidence Review & Audit Verification'}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            {currentMode === 'upload'
              ? 'Files are cryptographically fingerprinted using client-side SHA-256 before ledger storage.'
              : 'Verify physical document integrity against tamper-proof cryptographic audit records.'}
          </p>
        </div>

        {/* Mode Switcher Button */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => {
              setCurrentMode('upload');
              if (onModeChange) onModeChange('upload');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: currentMode === 'upload' ? '#ffffff' : 'transparent',
              color: currentMode === 'upload' ? '#2563eb' : '#64748b',
              boxShadow: currentMode === 'upload' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Upload Mode
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentMode('review');
              if (onModeChange) onModeChange('review');
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backgroundColor: currentMode === 'review' ? '#ffffff' : 'transparent',
              color: currentMode === 'review' ? '#7c3aed' : '#64748b',
              boxShadow: currentMode === 'review' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Review Mode
          </button>
        </div>
      </div>

      {/* -------------------- UPLOAD MODE -------------------- */}
      {currentMode === 'upload' && (
        <div>
          {/* Dropzone Container */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? '#3b82f6' : '#cbd5e1'}`,
              backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
              borderRadius: '10px',
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
            />

            <div style={{ fontSize: '32px', marginBottom: '8px' }}>
              {isDragging ? '📥' : '🛡️'}
            </div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
              {isDragging ? 'Drop audit evidence file here' : 'Drag & drop compliance evidence here, or click to browse'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Supports PDF, PNG, JPG, DOCX, TXT (Max {maxSizeMB}MB). Instant SHA-256 Web Crypto calculation.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Hashing In-Progress State */}
          {hashingState === 'processing' && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  border: '2px solid #3b82f6',
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span>Calculating SHA-256 digest via Web Crypto API...</span>
            </div>
          )}

          {/* Ready / Processed Evidence Card */}
          {hashingState === 'ready' && fileData && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#dbeafe',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                    }}
                  >
                    📄
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                      {fileData.name}
                    </h5>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                      {formatBytes(fileData.size)} • {fileData.type}
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '700',
                  }}
                >
                  ✓ Hash Generated
                </span>
              </div>

              {/* SHA-256 Display */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 12px',
                  backgroundColor: '#0f172a',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  wordBreak: 'break-all',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase' }}>
                  SHA-256 Cryptographic Fingerprint:
                </div>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{fileData.sha256}</span>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFileData(null);
                    setHashingState('idle');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleAttachEvidence}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  Attach to Audit Record
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- REVIEW MODE -------------------- */}
      {currentMode === 'review' && (
        <div>
          {initialEvidence ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>📑</span>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#581c87' }}>
                      {initialEvidence.name}
                    </h5>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7e22ce' }}>
                    Uploaded by <strong>{initialEvidence.uploadedBy || 'Alex Morgan'}</strong> •{' '}
                    {new Date(initialEvidence.uploadedAt || Date.now()).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #c084fc',
                    backgroundColor: '#ffffff',
                    color: '#7e22ce',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ⬇ Download Evidence
                </button>
              </div>

              {/* Expected Stored Hash */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px',
                  backgroundColor: '#1e1b4b',
                  borderRadius: '6px',
                  color: '#e0e7ff',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  wordBreak: 'break-all',
                }}
              >
                <div style={{ color: '#a5b4fc', fontSize: '10px', marginBottom: '2px', textTransform: 'uppercase' }}>
                  Immutable Ledger Stored Hash:
                </div>
                <span style={{ color: '#c7d2fe' }}>{initialEvidence.sha256}</span>
              </div>

              {/* Hash Verification Section */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px dashed #d8b4fe',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#4c1d95' }}>
                      Audit Integrity Verification:
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b21a8' }}>
                      Select a downloaded copy to verify cryptographic proof.
                    </p>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={reviewFileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleVerifyFileAgainstLedger(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => reviewFileInputRef.current?.click()}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Verify Document Copy
                    </button>
                  </div>
                </div>

                {/* Verification Result Feedback */}
                {reviewVerificationStatus === 'matched' && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#dcfce7',
                      border: '1px solid #86efac',
                      color: '#14532d',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓</span> <span>Cryptographic Proof Validated (100% Match)</span>
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>
                      Digest: {computedReviewHash}
                    </div>
                  </div>
                )}

                {reviewVerificationStatus === 'mismatched' && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: '#fee2e2',
                      border: '1px solid #f87171',
                      color: '#7f1d1d',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚠</span> <span>Tamper Alert: Hash Mismatch Detected!</span>
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>
                      Computed: {computedReviewHash}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
              No evidence document attached to this compliance record yet. Switch to Upload Mode to attach one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default EvidenceDropzone;
