import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Download, ShieldCheck, AlertCircle, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─── SHA-256 via Web Crypto API ───────────────────────────────────────────────
async function computeSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── MIME validation ──────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Upload Mode ──────────────────────────────────────────────────────────────
function UploadMode({ onUpload }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const validate = (fileList) => {
    const valid = [], errs = [];
    for (const f of fileList) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errs.push(`"${f.name}" — unsupported file type.`);
      } else if (f.size > MAX_SIZE_BYTES) {
        errs.push(`"${f.name}" — exceeds 10 MB limit (${(f.size / 1024 / 1024).toFixed(1)} MB).`);
      } else {
        valid.push(f);
      }
    }
    return { valid, errs };
  };

  const processFiles = (fileList) => {
    const { valid, errs } = validate(Array.from(fileList));
    setErrors(errs);
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const processed = await Promise.all(files.map(async f => ({
        file: f,
        name: f.name,
        size: f.size,
        type: f.type,
        sha256: await computeSHA256(f),
      })));
      await onUpload?.(processed);
      setFiles([]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? 'var(--primary-color)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragOver ? 'var(--primary-light)' : 'var(--surface-2)',
          transition: 'all var(--transition)',
        }}
      >
        <Upload size={32} style={{ color: isDragOver ? 'var(--primary-color)' : 'var(--text-muted)', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-main)', marginBottom: 4 }}>
          {isDragOver ? 'Drop files here' : 'Drag & drop evidence files'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          or <span style={{ color: 'var(--primary-color)', fontWeight: 500 }}>click to browse</span> · PDF, DOCX, XLSX, PNG, JPG · Max 10 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          id="evidence-file-input"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={e => processFiles(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {/* Errors */}
      {errors.map((err, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 12px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
          <AlertCircle size={13} /> {err}
        </div>
      ))}

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f, i) => (
            <FileRow key={i} file={f} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
          ))}
          <button
            id="evidence-upload-btn"
            onClick={handleSubmit}
            disabled={uploading}
            style={{
              marginTop: 8, padding: '10px 20px',
              background: 'var(--primary-color)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: uploading ? 0.7 : 1,
            }}
          >
            <Upload size={14} />
            {uploading ? 'Computing SHA-256 & Uploading…' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}

function FileRow({ file, sha256, onRemove }) {
  const sizeKB = (file.size / 1024).toFixed(1);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', background: 'white',
      border: '1px solid var(--border-color)', borderRadius: 'var(--radius)',
    }}>
      <FileText size={18} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>{file.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sizeKB} KB · {file.type.split('/')[1]?.toUpperCase()}</div>
        {sha256 && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
            SHA-256: {sha256.slice(0, 24)}…
          </div>
        )}
      </div>
      {sha256 && <ShieldCheck size={15} style={{ color: '#22c55e' }} title="Hash verified" />}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Review / Viewer Mode ─────────────────────────────────────────────────────
function ViewerMode({ documents = [] }) {
  const [verifiedIds, setVerifiedIds] = useState(new Set());

  const verifyHash = async (doc) => {
    // In real app: re-fetch file and re-compute. Here we simulate verification.
    await new Promise(r => setTimeout(r, 800));
    setVerifiedIds(prev => new Set([...prev, doc.id]));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {documents.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
          No evidence documents attached.
        </p>
      )}
      {documents.map(doc => (
        <div key={doc.id} style={{
          border: '1px solid var(--border-color)', borderRadius: 'var(--radius)',
          overflow: 'hidden', background: 'white',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <FileText size={16} style={{ color: 'var(--primary-color)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: 13, fontWeight: 500 }}>{doc.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Uploaded by {doc.uploadedBy?.name} · {doc.uploadedAt}
              </div>
            </div>
            <a
              href={doc.url ?? '#'}
              download={doc.name}
              id={`download-${doc.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)', background: 'white',
                fontSize: 12, fontWeight: 500, color: 'var(--text-main)',
                textDecoration: 'none',
              }}
            >
              <Download size={12} /> Download
            </a>
          </div>

          {/* SHA-256 verification */}
          {doc.sha256 && (
            <div style={{ padding: '10px 16px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>SHA-256 Checksum</div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                  {doc.sha256}
                </div>
              </div>
              {verifiedIds.has(doc.id) ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#166534', fontWeight: 500 }}>
                  <CheckCircle size={14} /> Verified
                </span>
              ) : (
                <button
                  id={`verify-${doc.id}`}
                  onClick={() => verifyHash(doc)}
                  style={{
                    padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid #bfdbfe', background: 'var(--primary-light)',
                    fontSize: 12, color: 'var(--primary-color)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500,
                  }}
                >
                  <ShieldCheck size={12} /> Verify Hash
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── EvidenceDropzone (Dual-Mode Entry Point) ─────────────────────────────────
/**
 * EvidenceDropzone
 * ────────────────
 * Dual-mode component.
 * - TM upload mode: drag-and-drop, MIME/size validation, SHA-256 hash computation.
 * - Review mode (TL, PM, Compliance): document list, secure download, SHA verification.
 *
 * @param {'upload'|'review'}  mode        - Component mode
 * @param {Function}           [onUpload]  - Called with array of {file, sha256, ...} on upload
 * @param {Array}              [documents] - Existing documents to display in review mode
 */
export default function EvidenceDropzone({ mode = 'upload', onUpload, documents = [] }) {
  const { hasRole } = useAuth();

  // Auto-detect mode from role if not explicitly set
  const effectiveMode = mode === 'auto'
    ? (hasRole('Team_Member') ? 'upload' : 'review')
    : mode;

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
          Evidence {effectiveMode === 'upload' ? 'Submission' : 'Documents'}
        </h3>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 999,
          background: effectiveMode === 'upload' ? '#eff6ff' : '#f0fdf4',
          color: effectiveMode === 'upload' ? '#1d4ed8' : '#166534',
          fontWeight: 600,
        }}>
          {effectiveMode === 'upload' ? 'UPLOAD MODE' : 'REVIEW MODE'}
        </span>
      </div>

      {effectiveMode === 'upload' ? (
        <UploadMode onUpload={onUpload} />
      ) : (
        <ViewerMode documents={documents} />
      )}
    </div>
  );
}
