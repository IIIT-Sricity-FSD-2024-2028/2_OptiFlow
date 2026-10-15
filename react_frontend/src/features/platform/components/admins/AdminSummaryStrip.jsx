import { Users, UserCheck, UserX } from 'lucide-react';

export function AdminSummaryStrip({ summary, statusFilter, onStatusFilterChange }) {
  const cards = [
    { label: 'Total Administrators', count: summary?.total ?? 0, key: 'All', icon: Users, color: 'text-slate-700' },
    { label: 'Active Personnel', count: summary?.active ?? 0, key: 'active', icon: UserCheck, color: 'text-emerald-600' },
    { label: 'Deactivated Accounts', count: summary?.inactive ?? 0, key: 'inactive', icon: UserX, color: 'text-rose-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onStatusFilterChange(item.key)}
          className={`p-4 bg-white border rounded-2xl text-left transition-all cursor-pointer ${
            statusFilter === item.key
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{item.label}</span>
            <item.icon className={`w-4 h-4 ${item.color}`} />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1.5">{item.count}</p>
        </button>
      ))}
    </div>
  );
}
