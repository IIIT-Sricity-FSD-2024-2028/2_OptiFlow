import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../../services/api/client';

export function useAuditLogs(initialPageSize = 20) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || initialPageSize);

  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') || '');
  const [action, setAction] = useState(() => searchParams.get('action') || '');
  const [entityType, setEntityType] = useState(() => searchParams.get('entityType') || '');
  const [entityId, setEntityId] = useState(() => searchParams.get('entityId') || '');
  const [adminId, setAdminId] = useState(() => searchParams.get('adminId') || '');
  const [companyId, setCompanyId] = useState(() => searchParams.get('companyId') || '');
  const [datePreset, setDatePreset] = useState(() => searchParams.get('preset') || 'all');
  const [startDate, setStartDate] = useState(() => searchParams.get('from') || '');
  const [endDate, setEndDate] = useState(() => searchParams.get('to') || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  // Sync state to URL searchParams
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== initialPageSize) params.set('pageSize', String(pageSize));
    if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    if (entityId) params.set('entityId', entityId);
    if (adminId) params.set('adminId', adminId);
    if (companyId) params.set('companyId', companyId);
    if (datePreset !== 'all') params.set('preset', datePreset);
    if (startDate) params.set('from', startDate);
    if (endDate) params.set('to', endDate);
    setSearchParams(params, { replace: true });
  }, [page, pageSize, debouncedQ, action, entityType, entityId, adminId, companyId, datePreset, startDate, endDate, initialPageSize, setSearchParams]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (debouncedQ.trim()) params.append('q', debouncedQ.trim());
      if (action) params.append('action', action);
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      if (adminId) params.append('adminUserId', adminId);
      if (companyId) params.append('companyId', companyId);

      let effectiveStart = startDate;
      let effectiveEnd = endDate;
      if (datePreset === '24h') {
        effectiveStart = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      } else if (datePreset === '7d') {
        effectiveStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      } else if (datePreset === '30d') {
        effectiveStart = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      }

      if (effectiveStart) params.append('startDate', effectiveStart);
      if (effectiveEnd) params.append('endDate', effectiveEnd);

      const res = await apiClient(`/api/platform/audit-logs?${params.toString()}`);
      setLogs(res?.items || (Array.isArray(res) ? res : []));
      setTotal(res?.total ?? 0);
    } catch (err) {
      setError(err?.message || 'Failed to load platform audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQ, action, entityType, entityId, adminId, companyId, datePreset, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetFilters = () => {
    setQ('');
    setAction('');
    setEntityType('');
    setEntityId('');
    setAdminId('');
    setCompanyId('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const exportCsv = async () => {
    const params = new URLSearchParams();
    if (debouncedQ.trim()) params.append('q', debouncedQ.trim());
    if (action) params.append('action', action);
    if (entityType) params.append('entityType', entityType);
    if (entityId) params.append('entityId', entityId);
    if (adminId) params.append('adminUserId', adminId);
    if (companyId) params.append('companyId', companyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const token = sessionStorage.getItem('authToken');
    const res = await fetch(`/api/platform/audit-logs/export?${params.toString()}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error('Failed to export audit logs');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return {
    logs, total, page, setPage, pageSize, setPageSize,
    q, setQ, action, setAction: (val) => { setAction(val); setPage(1); },
    entityType, setEntityType: (val) => { setEntityType(val); setPage(1); },
    entityId, setEntityId: (val) => { setEntityId(val); setPage(1); },
    adminId, setAdminId: (val) => { setAdminId(val); setPage(1); },
    companyId, setCompanyId: (val) => { setCompanyId(val); setPage(1); },
    datePreset, setDatePreset: (val) => { setDatePreset(val); setPage(1); },
    startDate, setStartDate: (val) => { setStartDate(val); setPage(1); },
    endDate, setEndDate: (val) => { setEndDate(val); setPage(1); },
    loading, error, refetch: fetchLogs, resetFilters, exportCsv,
  };
}
