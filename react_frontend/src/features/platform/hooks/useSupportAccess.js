import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../../services/api/client';

export function useSupportAccess(initialPageSize = 10) {
  const [grants, setGrants] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, active: 0, expired: 0, revoked: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

  const fetchGrants = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
      if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);
      if (companyFilter && companyFilter !== 'All') params.append('companyId', companyFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiClient(`/api/platform/support-access?${params.toString()}`);
      setGrants(res?.items || []);
      setTotal(res?.total || 0);
      if (res?.summary) setSummary(res.summary);
    } catch (err) {
      console.error('Failed to fetch support access grants:', err);
      setError(err.message || 'Failed to load support access grants');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter, companyFilter, startDate, endDate]);

  useEffect(() => {
    fetchGrants(true);
  }, [fetchGrants]);

  const createGrant = async (payload) => {
    const res = await apiClient('/api/platform/support-access', {
      method: 'POST',
      body: payload,
    });
    await fetchGrants();
    return res;
  };

  const revokeGrant = async (id) => {
    const res = await apiClient(`/api/platform/support-access/${id}/revoke`, {
      method: 'POST',
    });
    await fetchGrants();
    return res;
  };

  return {
    grants,
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
    companyFilter,
    setCompanyFilter: (val) => { setCompanyFilter(val); setPage(1); },
    startDate,
    setStartDate: (val) => { setStartDate(val); setPage(1); },
    endDate,
    setEndDate: (val) => { setEndDate(val); setPage(1); },
    loading,
    error,
    refetch: fetchGrants,
    createGrant,
    revokeGrant,
  };
}
