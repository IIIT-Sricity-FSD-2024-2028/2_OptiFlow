import { useState, useEffect } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { apiClient } from '../../../../services/api/client';

export function SupportFilterBar({
  search, onSearchChange,
  statusFilter, onStatusChange,
  companyFilter, onCompanyChange,
  startDate, onStartDateChange,
  endDate, onEndDateChange,
}) {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let isMounted = true;
    apiClient('/api/platform/companies?pageSize=100')
      .then((res) => { if (isMounted) setCompanies(res?.items || []); })
      .catch((err) => console.error('Failed to load companies for filter:', err));
    return () => { isMounted = false; };
  }, []);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'All' ||
    companyFilter !== 'All' ||
    startDate !== '' ||
    endDate !== '';

  const handleClear = () => {
    onSearchChange('');
    onStatusChange('All');
    onCompanyChange('All');
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by company or admin name/email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="revoked">Revoked Only</option>
          </select>
        </div>

        {/* Company Dropdown */}
        <div className="w-full sm:w-48">
          <select
            value={companyFilter}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
          >
            <option value="All">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.legalName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Range & Clear Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Date Range:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reset all
          </button>
        )}
      </div>
    </div>
  );
}
