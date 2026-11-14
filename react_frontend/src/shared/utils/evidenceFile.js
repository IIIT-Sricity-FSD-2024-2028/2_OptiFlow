import { getToken } from '../../services/auth/session';
// Opens an evidence file the signed-in user is allowed to see.
//
// Files are protected, so the browser cannot just follow a link: it has to send the session token in
// the Authorization header. This fetches the file with that header, turns it into a temporary
// in-memory URL and shows it in a new tab. The token never appears in a URL, so it cannot leak through
// browser history, server logs or Referer headers (SEC-M2-09).

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5500')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

export async function openEvidenceFile(evidenceId) {
  if (!evidenceId) return;

  // Open the tab immediately (inside the click) so the popup blocker allows it,
  // then point it at the file once it has downloaded.
  const tab = window.open('', '_blank');
  if (tab) {
    tab.opener = null;
    tab.document.title = 'Loading file…';
    tab.document.body.textContent = 'Loading file…';
  }

  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/evidence/${encodeURIComponent(evidenceId)}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!response.ok) {
      let reason = `Request failed (${response.status})`;
      try {
        const data = await response.json();
        if (data?.message) reason = data.message;
      } catch {
        /* response was not JSON */
      }
      throw new Error(reason);
    }

    const blobUrl = URL.createObjectURL(await response.blob());
    if (tab) tab.location.href = blobUrl;
    else window.location.href = blobUrl;
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
  } catch (err) {
    if (tab) {
      tab.document.title = 'Could not open file';
      tab.document.body.textContent = `Could not open the file: ${err.message}`;
    }
    console.error('openEvidenceFile failed:', err);
  }
}
