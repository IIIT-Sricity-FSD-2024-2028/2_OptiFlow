import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../../services/api/client';

export function useCompanies(initialPageSize = 10) {
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const fetchCompanies = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (debouncedSearch.trim()) params.append('q', debouncedSearch.trim());
      if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);

      const res = await apiClient(`/api/platform/companies?${params.toString()}`);
      setCompanies(res?.items || []);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchCompanies(true);
  }, [fetchCompanies]);

  const updateCompanyStatus = async (companyId, newStatus) => {
    try {
      await apiClient(`/api/platform/companies/${companyId}`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      await fetchCompanies();
      return { success: true };
    } catch (err) {
      console.error(`Failed to update company ${companyId} status:`, err);
      throw err;
    }
  };

  return {
    companies,
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
    refetch: fetchCompanies,
    updateCompanyStatus,
  };
}
