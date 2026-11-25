import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { compactQuery, exportAuditLogsCsv } from '../../../services/api/platform';
import { fetchAuditLogs, selectAuditLogsEntry } from '../../../store/platformAuditLogs';
import { useKeyedList } from './useKeyedList';

const PRESET_MS = {
  '24h': 24 * 3600 * 1000,
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
};

export function useAuditLogs(initialPageSize = 20) {
  const [searchParams, setSearchParams] = useSearchParams();

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
  // "Last 24h" counts back from the moment the preset was chosen. It is fixed until the user picks
  // a preset again, so the query (and its cache entry) does not change on every render.
  const [presetAnchor, setPresetAnchor] = useState(() => Date.now());

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

  // The filters shared by the list and the CSV export, so an export always matches the table.
  const filters = useMemo(() => {
    const presetMs = PRESET_MS[datePreset];
    return compactQuery({
      q: debouncedQ,
      action,
      entityType,
      entityId,
      adminUserId: adminId,
      companyId,
      startDate: presetMs ? new Date(presetAnchor - presetMs).toISOString() : startDate,
      endDate,
    });
  }, [debouncedQ, action, entityType, entityId, adminId, companyId, datePreset, presetAnchor, startDate, endDate]);

  const query = useMemo(() => ({ page: String(page), pageSize: String(pageSize), ...filters }), [page, pageSize, filters]);

  const { items, total, loading, error, refetch } = useKeyedList({
    fetchList: fetchAuditLogs,
    selectEntry: selectAuditLogsEntry,
    query,
  });

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
    const blob = await exportAuditLogsCsv(filters);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return {
    logs: items, total, page, setPage, pageSize, setPageSize,
    q, setQ, action, setAction: (val) => { setAction(val); setPage(1); },
    entityType, setEntityType: (val) => { setEntityType(val); setPage(1); },
    entityId, setEntityId: (val) => { setEntityId(val); setPage(1); },
    adminId, setAdminId: (val) => { setAdminId(val); setPage(1); },
    companyId, setCompanyId: (val) => { setCompanyId(val); setPage(1); },
    datePreset, setDatePreset: (val) => { setDatePreset(val); setPresetAnchor(Date.now()); setPage(1); },
    startDate, setStartDate: (val) => { setStartDate(val); setPage(1); },
    endDate, setEndDate: (val) => { setEndDate(val); setPage(1); },
    loading, error, refetch, resetFilters, exportCsv,
  };
}

// A fixed slice of the audit log (one admin, one company, one subscription) for a detail panel.
// `scope` is e.g. { adminUserId } and is compared by value, so passing a new object each render is fine.
export function useScopedAuditLogs(scope, { pageSize = 20, enabled = true } = {}) {
  const scopeKey = JSON.stringify(scope ?? {});
  const query = useMemo(
    () => ({ ...compactQuery(JSON.parse(scopeKey)), pageSize: String(pageSize) }),
    [scopeKey, pageSize],
  );
  const { items, loading, error, refetch } = useKeyedList({
    fetchList: fetchAuditLogs,
    selectEntry: selectAuditLogsEntry,
    query,
    keepPrevious: false,
    enabled,
  });
  return { logs: items, loading, error, refetch };
}
