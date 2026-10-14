import { PieChart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../../app/paths';

export function DashboardPlanDistribution({ plans = [], loading }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-slate-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalAssigned = plans.reduce((acc, p) => acc + (p.count || 0), 0);

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Plan Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Active, trialing, and past due tenants</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {totalAssigned} Subscriptions
          </span>
        </div>

        {plans.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-6 text-center">No plan tiers configured.</p>
        ) : (
          <div className="space-y-3.5">
            {plans.map((plan) => {
              const pct = totalAssigned > 0 ? Math.round((plan.count / totalAssigned) * 100) : 0;
              return (
                <div
                  key={plan.planId || plan.planName}
                  onClick={() => navigate(`${PATHS.PLATFORM.SUBSCRIPTIONS}?planId=${plan.planId}`)}
                  className="group cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      <span>{plan.planName}</span>
                      {plan.isActive === false && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-normal">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-slate-500 text-[11px]">
                      <span className="font-bold text-slate-900">{plan.count}</span>
                      <span>({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        plan.isActive === false ? 'bg-amber-400' : 'bg-blue-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400">Click any plan to view its subscribers</span>
        <button
          type="button"
          onClick={() => navigate(PATHS.PLATFORM.PLANS)}
          className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
        >
          <span>Manage Plans</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
