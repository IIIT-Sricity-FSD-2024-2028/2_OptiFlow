import { useState, useEffect } from 'react';
import { Search, Filter, X, AlertCircle, Clock } from 'lucide-react';
import { apiClient } from '../../../../services/api/client';

export function SubscriptionFilterBar({
  search, onSearchChange, statusFilter, onStatusChange,
  planFilter, onPlanChange, cycleFilter, onCycleChange,
  quickFilter, onQuickFilterChange,
}) {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let isMounted = true;
    apiClient('/api/platform/plans')
      .then((res) => { if (isMounted) setPlans(res || []); })
      .catch((err) => console.error('Failed to load plans:', err));
    return () => { isMounted = false; };
  }, []);

  const hasActive = search.trim() !== '' || statusFilter !== 'All' || planFilter !== 'All' || cycleFilter !== 'All' || quickFilter !== 'none';

  const handleClear = () => {
    onSearchChange('');
    onStatusChange('All');
    onPlanChange('All');
    onCycleChange('All');
    onQuickFilterChange('none');
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by company name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="Trialing">Trialing</option>
          <option value="Active">Active</option>
          <option value="PastDue">Past Due</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => onPlanChange(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
        >
          <option value="All">All Plans</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name} {p.isActive === false ? '(Archived)' : ''}</option>
          ))}
        </select>

        <select
          value={cycleFilter}
          onChange={(e) => onCycleChange(e.target.value)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
        >
          <option value="All">All Cycles</option>
          <option value="Monthly">Monthly</option>
          <option value="Annual">Annual</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Quick:
          </span>
          <button
            type="button"
            onClick={() => onQuickFilterChange('pastDue')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              quickFilter === 'pastDue' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Past Due
          </button>
          <button
            type="button"
            onClick={() => onQuickFilterChange('expiring30')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              quickFilter === 'expiring30' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-500" /> Expiring &lt;30d
          </button>
        </div>

        {hasActive && (
          <button type="button" onClick={handleClear} className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800">
            <X className="w-3.5 h-3.5" /> Reset all
          </button>
        )}
      </div>
    </div>
  );
}
