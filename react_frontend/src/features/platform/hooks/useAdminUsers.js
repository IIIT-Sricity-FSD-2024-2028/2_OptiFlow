import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../../services/api/client';

export function useAdminUsers(initialPageSize = 10) {
  const [admins, setAdmins] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
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

  const fetchAdmins = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
      if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);

      const res = await apiClient(`/api/platform/admin-users?${params.toString()}`);
      const items = res?.items || (Array.isArray(res) ? res : []);
      const totalCount = res?.total ?? items.length;
      setAdmins(items);
      setTotal(totalCount);

      const summaryData = res?.summary || res?.data?.summary;
      if (summaryData && (summaryData.total > 0 || summaryData.active > 0 || summaryData.inactive > 0)) {
        setSummary(summaryData);
      } else if (items.length > 0) {
        const active = items.filter((a) => a.isActive).length;
        setSummary({
          total: totalCount,
          active,
          inactive: Math.max(0, totalCount - active),
        });
      }
    } catch (err) {
      console.error('Failed to fetch platform admin users:', err);
      setError(err.message || 'Failed to load platform admin users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchAdmins(true);
  }, [fetchAdmins]);

  const createAdmin = async (payload) => {
    const res = await apiClient('/api/platform/admin-users', {
      method: 'POST',
      body: payload,
    });
    await fetchAdmins();
    return res;
  };

  const updateAdmin = async (id, payload) => {
    const res = await apiClient(`/api/platform/admin-users/${id}`, {
      method: 'PATCH',
      body: payload,
    });
    await fetchAdmins();
    return res;
  };

  const resetPassword = async (id) => {
    const res = await apiClient(`/api/platform/admin-users/${id}/reset-password`, {
      method: 'POST',
    });
    await fetchAdmins();
    return res;
  };

  return {
    admins,
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
    refetch: fetchAdmins,
    createAdmin,
    updateAdmin,
    resetPassword,
  };
}
