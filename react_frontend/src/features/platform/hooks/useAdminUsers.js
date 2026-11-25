import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { compactQuery } from '../../../services/api/platform';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetAdminPassword,
  selectAdminUsersEntry,
} from '../../../store/platformAdminUsers';
import { useKeyedList } from './useKeyedList';

const EMPTY_SUMMARY = { total: 0, active: 0, inactive: 0 };

export function useAdminUsers(initialPageSize = 10) {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

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
    () => compactQuery({ page, pageSize, q: debouncedSearch, status: statusFilter }),
    [page, pageSize, debouncedSearch, statusFilter],
  );

  const { items, total, summary: serverSummary, loading, error, refetch } = useKeyedList({
    fetchList: fetchAdminUsers,
    selectEntry: selectAdminUsersEntry,
    query,
  });

  // Use the server's counts; when it sends none (or all zero) count the rows we have.
  const summary = useMemo(() => {
    if (serverSummary && (serverSummary.total > 0 || serverSummary.active > 0 || serverSummary.inactive > 0)) {
      return serverSummary;
    }
    if (items.length > 0) {
      const active = items.filter((a) => a.isActive).length;
      return { total, active, inactive: Math.max(0, total - active) };
    }
    return EMPTY_SUMMARY;
  }, [serverSummary, items, total]);

  // The slice marks the list stale after a write, and useKeyedList fetches it again.
  // The answers of create and reset carry the temporary password: they go straight to the caller.
  const createAdmin = (payload) => dispatch(createAdminUser(payload)).unwrap();
  const updateAdmin = (id, payload) => dispatch(updateAdminUser({ id, body: payload })).unwrap();
  const resetPassword = (id) => dispatch(resetAdminPassword(id)).unwrap();

  return {
    admins: items,
    total,
    summary,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    statusFilter,
    setStatusFilter: (val) => { setStatusFilter(val); setPage(1); },
    loading,
    error,
    refetch,
    createAdmin,
    updateAdmin,
    resetPassword,
  };
}
