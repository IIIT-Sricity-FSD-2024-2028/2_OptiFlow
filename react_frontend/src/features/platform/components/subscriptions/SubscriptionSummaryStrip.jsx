import { CheckCircle2, Sparkles, AlertTriangle, Clock, XCircle, Layers } from 'lucide-react';

export function SubscriptionSummaryStrip({
  summary,
  currentStatus,
  quickFilter,
  onSelectStatus,
  onSelectQuick,
}) {
  const cards = [
    {
      id: 'all',
      label: 'All Subscriptions',
      count: summary.total || 0,
      icon: Layers,
      color: 'slate',
      isActive: currentStatus === 'All' && quickFilter === 'none',
      onClick: () => onSelectStatus('All'),
    },
    {
      id: 'active',
      label: 'Active',
      count: summary.active || 0,
      icon: CheckCircle2,
      color: 'emerald',
      isActive: currentStatus === 'Active',
      onClick: () => onSelectStatus('Active'),
    },
    {
      id: 'trialing',
      label: 'Free Trial',
      count: summary.trialing || 0,
      icon: Sparkles,
      color: 'amber',
      isActive: currentStatus === 'Trialing',
      onClick: () => onSelectStatus('Trialing'),
    },
    {
      id: 'pastDue',
      label: 'Past Due',
      count: summary.pastDue || 0,
      icon: AlertTriangle,
      color: 'rose',
      isActive: quickFilter === 'pastDue' || currentStatus === 'PastDue',
      onClick: () => onSelectQuick('pastDue'),
    },
    {
      id: 'expiringSoon',
      label: 'Expiring (<30d)',
      count: summary.expiringSoon || 0,
      icon: Clock,
      color: 'indigo',
      isActive: quickFilter === 'expiring30',
      onClick: () => onSelectQuick('expiring30'),
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      count: summary.cancelled || 0,
      icon: XCircle,
      color: 'slate',
      isActive: currentStatus === 'Cancelled',
      onClick: () => onSelectStatus('Cancelled'),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            type="button"
            onClick={card.onClick}
            className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
              card.isActive
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-2">
              <span className="truncate">{card.label}</span>
              <Icon className={`w-4 h-4 shrink-0 ${card.isActive ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {card.count.toLocaleString()}
            </div>
          </button>
        );
      })}
    </div>
  );
}
