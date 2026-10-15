import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../../services/api/client';

export function useSubscriptions(initialPageSize = 10) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    trialing: 0,
    pastDue: 0,
    cancelled: 0,
    expiringSoon: 0,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('All');
  const [cycleFilter, setCycleFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState('none'); // 'none' | 'pastDue' | 'expiring30'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceTimerRef.current);
  }, [search]);

  const fetchSubscriptions = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
      if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);
      if (planFilter && planFilter !== 'All') params.append('planId', planFilter);
      if (cycleFilter && cycleFilter !== 'All') params.append('billingCycle', cycleFilter);

      if (quickFilter === 'pastDue') {
        params.append('pastDue', 'true');
      } else if (quickFilter === 'expiring30') {
        params.append('expiringWithin', '30');
      }

      const res = await apiClient(`/api/platform/subscriptions?${params.toString()}`);
      setSubscriptions(res?.items || []);
      setTotal(res?.total || 0);
      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError(err.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter, planFilter, cycleFilter, quickFilter]);

  useEffect(() => {
    fetchSubscriptions(true);
  }, [fetchSubscriptions]);

  const updateSub = async (id, payload) => {
    const res = await apiClient(`/api/platform/subscriptions/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    await fetchSubscriptions();
    return res;
  };

  const createSub = async (payload) => {
    const res = await apiClient('/api/platform/subscriptions', {
      method: 'POST',
      body: payload,
    });
    await fetchSubscriptions();
    return res;
  };

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
    subscriptions,
    total,
    summary,
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
    refetch: fetchSubscriptions,
    updateSubscription: updateSub,
    createSubscription: createSub,
  };
}
