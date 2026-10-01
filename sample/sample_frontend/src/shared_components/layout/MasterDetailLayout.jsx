import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * MasterDetailLayout
 * ──────────────────
 * Split-screen workflow pattern.
 * Left pane: filterable queue (list of items).
 * Right pane: entity inspector and action forms.
 * URL query param synchronization via ?selectedId=...
 *
 * @param {ReactNode} list       - Left pane content (queue / list)
 * @param {ReactNode} [detail]   - Right pane content (inspector)
 * @param {string}    [idParam]  - URL query param key (default: 'selectedId')
 * @param {string}    [listTitle]  - Left pane heading
 * @param {string}    [detailTitle]- Right pane heading
 * @param {number}    [splitPercent] - Left pane % width (default: 38)
 */
export default function MasterDetailLayout({
  list,
  detail,
  idParam = 'selectedId',
  listTitle,
  detailTitle,
  splitPercent = 38,
}) {
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get(idParam);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);

  useEffect(() => {
    if (selectedId) setIsMobileDetailView(true);
  }, [selectedId]);

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', background: 'white' }}>
      {/* ── Left: Queue Pane ── */}
      <div style={{
        width: `${splitPercent}%`,
        minWidth: 260,
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {listTitle && (
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
            fontSize: 13, fontWeight: 600, color: 'var(--text-main)', flexShrink: 0,
            background: 'var(--surface-2)',
          }}>
            {listTitle}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {list}
        </div>
      </div>

      {/* ── Right: Detail Pane ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', minWidth: 0,
      }}>
        {detailTitle && (
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border-color)',
            fontSize: 13, fontWeight: 600, color: 'var(--text-main)', flexShrink: 0,
            background: 'var(--surface-2)',
          }}>
            {detailTitle}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {detail ?? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', color: 'var(--text-muted)',
              fontSize: 14, gap: 8,
            }}>
              <div style={{ fontSize: 36 }}>←</div>
              <p>Select an item from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
