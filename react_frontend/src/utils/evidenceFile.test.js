import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openEvidenceFile } from './evidenceFile';
import * as session from '../services/auth/session';

describe('Task A7: openEvidenceFile helper', () => {
  let originalWindowOpen;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;
  let mockTab;

  beforeEach(() => {
    mockTab = {
      opener: 'something',
      document: {
        title: '',
        body: { textContent: '' },
      },
      location: { href: '' },
    };

    originalWindowOpen = window.open;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    window.open = vi.fn().mockReturnValue(mockTab);
    URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-blob-uuid');
    URL.revokeObjectURL = vi.fn();

    vi.spyOn(session, 'getToken').mockReturnValue('mock-jwt-token');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    window.open = originalWindowOpen;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('returns immediately without opening window or fetching if evidenceId is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await openEvidenceFile();
    await openEvidenceFile(null);
    await openEvidenceFile('');

    expect(window.open).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('opens a blank tab immediately, fetches with Authorization header, and assigns blob URL', async () => {
    const mockBlob = new Blob(['sample-data'], { type: 'application/pdf' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    vi.useFakeTimers();

    await openEvidenceFile('ev-101');

    // 1. Check window.open called immediately with blank tab
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockTab.opener).toBeNull();
    expect(mockTab.document.title).toBe('Loading file…');

    // 2. Check fetch called with Authorization header
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/evidence/ev-101/file'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-jwt-token' },
        credentials: 'include',
      })
    );

    // 3. Blob URL assigned to tab
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockTab.location.href).toBe('blob:http://localhost/mock-blob-uuid');

    // 4. Timer cleans up blob after 5 minutes
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-uuid');

    vi.useRealTimers();
  });

  it('omits Authorization header when token is missing', async () => {
    vi.spyOn(session, 'getToken').mockReturnValue(null);
    const mockBlob = new Blob(['data'], { type: 'application/pdf' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    await openEvidenceFile('ev-102');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/evidence/ev-102/file'),
      expect.objectContaining({
        headers: {},
      })
    );
  });

  it('falls back to window.location if popup was blocked (window.open returns null)', async () => {
    window.open = vi.fn().mockReturnValue(null);
    const mockBlob = new Blob(['data'], { type: 'application/pdf' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(mockBlob),
    });

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    await openEvidenceFile('ev-103');

    expect(window.location.href).toBe('blob:http://localhost/mock-blob-uuid');
    window.location = originalLocation;
  });

  it('handles server JSON error and displays message in the tab', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ message: 'Access denied: Tenant mismatch' }),
    });

    await openEvidenceFile('ev-forbidden');

    expect(mockTab.document.title).toBe('Could not open file');
    expect(mockTab.document.body.textContent).toContain('Access denied: Tenant mismatch');
    expect(console.error).toHaveBeenCalled();
  });

  it('handles server non-JSON error gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('HTML 500 error page')),
    });

    await openEvidenceFile('ev-error');

    expect(mockTab.document.title).toBe('Could not open file');
    expect(mockTab.document.body.textContent).toContain('Request failed (500)');
    expect(console.error).toHaveBeenCalled();
  });
});
