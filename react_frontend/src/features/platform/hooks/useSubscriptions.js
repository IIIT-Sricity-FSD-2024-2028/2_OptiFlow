import { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { compactQuery } from '../../../services/api/platform';
import {
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  selectSubscriptionsEntry,
} from '../../../store/platformSubscriptions';
import { useKeyedList } from './useKeyedList';

const EMPTY_SUMMARY = { total: 0, active: 0, trialing: 0, pastDue: 0, cancelled: 0, expiringSoon: 0 };

export function useSubscriptions(initialPageSize = 10) {
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [cycleFilter, setCycleFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState('none'); // 'none' | 'pastDue' | 'expiring30'

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
        planId: planFilter,
        billingCycle: cycleFilter,
        pastDue: quickFilter === 'pastDue' ? 'true' : '',
        expiringWithin: quickFilter === 'expiring30' ? '30' : '',
      }),
    [page, pageSize, debouncedSearch, statusFilter, planFilter, cycleFilter, quickFilter],
  );

  const { items, total, summary, loading, error, refetch } = useKeyedList({
    fetchList: fetchSubscriptions,
    selectEntry: selectSubscriptionsEntry,
    query,
  });

  // The slice marks the list stale after a write, and useKeyedList fetches it again.
  const updateSub = (id, payload) => dispatch(updateSubscription({ id, body: payload })).unwrap();
  const createSub = (payload) => dispatch(createSubscription(payload)).unwrap();

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setQuickFilter('none');
    setPage(1);
  };

  const handleQuickFilterChange = (type) => {
    setQuickFilter((prev) => (prev === type ? 'none' : type));
    if (type === 'pastDue') setStatusFilter('All');
    setPage(1);
  };

  return {
    subscriptions: items,
    total,
    summary: summary ?? EMPTY_SUMMARY,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    planFilter,
    setPlanFilter: (val) => { setPlanFilter(val); setPage(1); },
    cycleFilter,
    setCycleFilter: (val) => { setCycleFilter(val); setPage(1); },
    quickFilter,
    setQuickFilter: handleQuickFilterChange,
    loading,
    error,
    refetch,
    updateSubscription: updateSub,
    createSubscription: createSub,
  };
}
