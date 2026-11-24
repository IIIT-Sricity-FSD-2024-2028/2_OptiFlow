// Helper openEvidenceFile(id) for Phase A Task A7 (SEC-M1-01 / PRE-M1-05).
// Securely fetches evidence files as a Blob with the Authorization header
// and opens via in-memory blob URL, preventing sensitive JWT tokens
// from appearing in URL query strings or browser history.

export { openEvidenceFile, default } from '../shared/utils/evidenceFile';
