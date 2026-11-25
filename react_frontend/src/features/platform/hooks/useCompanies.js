import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { compactQuery } from '../../../services/api/platform';
import {
  fetchCompanies,
  updateCompany,
  selectCompaniesEntry,
} from '../../../store/platformCompanies';
import { useKeyedList } from './useKeyedList';

// Filters, paging and search stay here (they are this page's own state); the rows live in the store.
export function useCompanies(initialPageSize = 10) {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const debounceTimerRef = useRef(null);

  // Debounce search input (350ms)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset to page 1 on new search
    }, 350);
    return () => clearTimeout(debounceTimerRef.current);
  }, [search]);

  // Handle status filter change
  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const query = useMemo(
    () => compactQuery({ page, pageSize, q: debouncedSearch, status: statusFilter }),
    [page, pageSize, debouncedSearch, statusFilter],
  );

  const { items, total, loading, error, refetch } = useKeyedList({
    fetchList: fetchCompanies,
    selectEntry: selectCompaniesEntry,
    query,
  });

  // The slice marks the list stale after the write, and useKeyedList fetches it again.
  const updateCompanyStatus = async (companyId, newStatus) => {
    await dispatch(updateCompany({ id: companyId, body: { status: newStatus } })).unwrap();
    return { success: true };
  };

  return {
    companies: items,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    statusFilter,
    setStatusFilter: handleStatusChange,
    loading,
    error,
    refetch,
    updateCompanyStatus,
  };
}

// Companies for a dropdown or a filter (the first 100). Its own cache entry, so it never
// replaces the page the Companies table is showing. `enabled` = false does not fetch.
const OPTIONS_QUERY = { pageSize: '100' };

export function useCompanyOptions(enabled = true) {
  const { items, loading, error } = useKeyedList({
    fetchList: fetchCompanies,
    selectEntry: selectCompaniesEntry,
    query: OPTIONS_QUERY,
    keepPrevious: false,
    enabled,
  });
  return { companies: items, loading, error };
}
