import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { compactQuery } from '../../../services/api/platform';
import {
  fetchSupportGrants,
  createSupportGrant,
  revokeSupportGrant,
  selectSupportGrantsEntry,
} from '../../../store/platformSupportAccess';
import { useKeyedList } from './useKeyedList';

const EMPTY_SUMMARY = { total: 0, active: 0, expired: 0, revoked: 0 };

export function useSupportAccess(initialPageSize = 10) {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceTimerRef.current);
  }, [search]);

  const query = useMemo(
    () =>
      compactQuery({
        page,
        pageSize,
        q: debouncedSearch,
        status: statusFilter,
        companyId: companyFilter,
        startDate,
        endDate,
      }),
    [page, pageSize, debouncedSearch, statusFilter, companyFilter, startDate, endDate],
  );

  const { items, total, summary, loading, error, refetch } = useKeyedList({
    fetchList: fetchSupportGrants,
    selectEntry: selectSupportGrantsEntry,
    query,
  });

  // The slice marks the list stale after a write, and useKeyedList fetches it again.
  const createGrant = (payload) => dispatch(createSupportGrant(payload)).unwrap();
  const revokeGrant = (id) => dispatch(revokeSupportGrant(id)).unwrap();

  return {
    grants: items,
    total,
    summary: summary ?? EMPTY_SUMMARY,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    statusFilter,
    setStatusFilter: (val) => { setStatusFilter(val); setPage(1); },
    companyFilter,
    setCompanyFilter: (val) => { setCompanyFilter(val); setPage(1); },
    startDate,
    setStartDate: (val) => { setStartDate(val); setPage(1); },
    endDate,
    setEndDate: (val) => { setEndDate(val); setPage(1); },
    loading,
    error,
    refetch,
    createGrant,
    revokeGrant,
  };
}
