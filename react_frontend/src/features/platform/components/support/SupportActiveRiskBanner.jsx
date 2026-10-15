import { ShieldAlert, ShieldCheck, Clock, XCircle, Layers } from 'lucide-react';

export function SupportActiveRiskBanner({ summary, currentStatus, onSelectStatus }) {
  const activeCount = summary.active || 0;

  const filters = [
    { id: 'All', label: 'All Grants', count: summary.total || 0, icon: Layers },
    { id: 'active', label: 'Active Sessions', count: activeCount, icon: ShieldAlert, activeColor: 'amber' },
    { id: 'expired', label: 'Expired', count: summary.expired || 0, icon: Clock, activeColor: 'slate' },
    { id: 'revoked', label: 'Revoked', count: summary.revoked || 0, icon: XCircle, activeColor: 'rose' },
  ];

  return (
    <div className="space-y-3">
      {/* Risk Alert Banner */}
      {activeCount > 0 ? (
        <div className="p-4 bg-amber-50/90 border border-amber-300/80 rounded-2xl flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <span className="font-bold text-sm block">
              Elevated Risk: {activeCount} Active Support {activeCount === 1 ? 'Session' : 'Sessions'}
            </span>
            <p className="mt-0.5 text-amber-800">
              Platform administrators currently have delegated, time-boxed access into live customer tenant data. All mutations are strictly logged to the platform audit trail.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Zero Active Delegated Sessions:</strong> No platform administrators currently possess active support access to tenant workspaces.
          </span>
        </div>
      )}

      {/* Quick Status Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {filters.map((f) => {
          const Icon = f.icon;
          const isSelected = currentStatus.toLowerCase() === f.id.toLowerCase();
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectStatus(f.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200/90 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
                <span>{f.label}</span>
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {f.count.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
