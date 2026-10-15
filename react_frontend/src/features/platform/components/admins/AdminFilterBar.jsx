import { Search, X } from 'lucide-react';

export function AdminFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
}) {
  const hasActive = search.trim() !== '' || statusFilter !== 'All';

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by administrator name or email..."
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
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {hasActive && (
        <button
          type="button"
          onClick={() => { onSearchChange(''); onStatusChange('All'); }}
          className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors self-end sm:self-auto"
        >
          <X className="w-3.5 h-3.5" /> Reset filters
        </button>
      )}
    </div>
  );
}
