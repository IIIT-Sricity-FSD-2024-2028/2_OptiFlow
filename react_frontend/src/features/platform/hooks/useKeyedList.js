import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const hasRows = (entry) => entry.status === 'succeeded' || entry.items.length > 0;

/**
 * Reads one query of a keyed list slice (see store/core/keyedList) and keeps it loaded.
 *
 *   fetchList     the slice's list thunk
 *   selectEntry   the slice's (state, query) selector
 *   query         the filters. Build it with useMemo: a new object on every render would look
 *                 like a new query and fetch in a loop.
 *   keepPrevious  while a new query loads, keep showing this component's last result instead of
 *                 an empty table (paging, filtering). Turn it off for lists scoped to one
 *                 record (one company's audit trail), where the old rows would be the wrong ones.
 *   enabled       false = do not fetch (a closed modal, a missing id)
 *
 * After any write that makes the cached query stale the hook fetches it again by itself.
 */
export function useKeyedList({ fetchList, selectEntry, query, keepPrevious = true, enabled = true }) {
  const dispatch = useDispatch();
  const entry = useSelector((state) => selectEntry(state, query));

  // Remember this component's last result that had rows (the pattern React documents for
  // "storing information from previous renders").
  const [shown, setShown] = useState(entry);
  if (hasRows(entry) && entry !== shown) setShown(entry);

  const own = hasRows(entry);
  const view = own || !keepPrevious || !hasRows(shown) ? entry : shown;
  const stale = entry.status === 'succeeded' && !entry.loadedAt;

  useEffect(() => {
    if (enabled) dispatch(fetchList(query));
  }, [dispatch, fetchList, query, enabled, stale]);

  const refetch = useCallback(
    () => dispatch(fetchList({ ...query, force: true })),
    [dispatch, fetchList, query],
  );

  const loading = enabled && !hasRows(view) && (entry.status === 'idle' || entry.status === 'loading');

  return {
    items: view.items,
    total: view.total,
    summary: view.summary,
    loading,
    refreshing: entry.status === 'loading',
    error: entry.error?.message ?? null,
    refetch,
  };
}
