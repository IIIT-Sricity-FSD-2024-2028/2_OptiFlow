import { Search, X, Calendar, Filter } from 'lucide-react';

const ACTION_GROUPS = [
  { label: 'All Actions', value: '' },
  { label: 'Company Actions (create, suspend, reactivate, close)', value: 'company.' },
  { label: 'Plan Actions (create, update, archive)', value: 'plan.' },
  { label: 'Subscription Actions (create, update, cancel)', value: 'subscription.' },
  { label: 'Support Access Actions (grant, revoke)', value: 'support_access.' },
  { label: 'Admin User Actions (create, update, reset)', value: 'admin.' },
];

const ENTITY_TYPES = [
  { label: 'All Entity Types', value: '' },
  { label: 'Company', value: 'Company' },
  { label: 'Plan', value: 'Plan' },
  { label: 'Subscription', value: 'Subscription' },
  { label: 'Support Access', value: 'SupportAccess' },
  { label: 'Platform Admin', value: 'PlatformAdminUser' },
];

export function AuditFilterBar({
  q, onQChange,
  action, onActionChange,
  entityType, onEntityTypeChange,
  datePreset, onDatePresetChange,
  startDate, onStartDateChange,
  endDate, onEndDateChange,
  onReset,
}) {
  const hasActive = q || action || entityType || datePreset !== 'all' || startDate || endDate;

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search entity ID, company, admin..."
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Action Group */}
        <select
          value={action}
          onChange={(e) => onActionChange(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
        >
          {ACTION_GROUPS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>

        {/* Entity Type */}
        <select
          value={entityType}
          onChange={(e) => onEntityTypeChange(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Date Preset */}
        <select
          value={datePreset}
          onChange={(e) => onDatePresetChange(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
        >
          <option value="all">All Time</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="custom">Custom Date Range</option>
        </select>
      </div>

      {/* Custom Date Range Row */}
      {datePreset === 'custom' && (
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[11px]">From:</span>
            <input
              type="date"
              value={startDate ? startDate.slice(0, 10) : ''}
              onChange={(e) => onStartDateChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[11px]">To:</span>
            <input
              type="date"
              value={endDate ? endDate.slice(0, 10) : ''}
              onChange={(e) => onEndDateChange(e.target.value ? new Date(`${e.target.value}T23:59:59.999Z`).toISOString() : '')}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {hasActive && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
