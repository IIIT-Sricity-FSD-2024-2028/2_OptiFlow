import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  GitBranch,
  RefreshCw,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { PATHS } from '../../../app/paths';
import { Loader } from '../../../shared/components/Loader';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchExecutiveBranches,
  fetchExecutivePortfolio,
  fetchBranchPerformance,
  selectExecutiveBranches,
  selectPortfolioSummary,
  selectPortfolioProjects,
  selectPortfolioStatus,
  selectPortfolioError,
  selectBranchPerformance,
  selectBranchPerformanceStatus,
  selectBranchPerformanceError,
} from '../../../store/executive';
import { AssignManagerModal } from '../components/AssignManagerModal';
import {
  BRANCH_CSV_COLUMNS,
  PORTFOLIO_CSV_COLUMNS,
  downloadCsv,
  formatDate,
  healthMeta,
  toCsv,
} from '../components/portfolioUtils';

const HEALTH_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'off_track', label: 'Off Track' },
  { value: 'at_risk', label: 'At Risk' },
  { value: 'on_track', label: 'On Track' },
  { value: 'done', label: 'Closed' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function ExecutivePortfolio() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const branches = useSelector(selectExecutiveBranches);
  const summary = useSelector(selectPortfolioSummary);
  const projects = useSelector(selectPortfolioProjects);
  const status = useSelector(selectPortfolioStatus);
  const error = useSelector(selectPortfolioError);
  const branchRows = useSelector(selectBranchPerformance);
  const branchStatus = useSelector(selectBranchPerformanceStatus);
  const branchError = useSelector(selectBranchPerformanceError);

  const [branchId, setBranchId] = useState('');
  const [healthFilter, setHealthFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [assigning, setAssigning] = useState(null);

  const load = useCallback(() => {
    const params = branchId ? { branchId } : {};
    dispatch(fetchExecutivePortfolio(params));
    dispatch(fetchBranchPerformance(params));
  }, [dispatch, branchId]);

  useEffect(() => {
    dispatch(fetchExecutiveBranches());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (healthFilter !== 'all' && p.health !== healthFilter) return false;
      if (!query) return true;
      return [p.name, p.team?.name, p.branch?.name, p.projectManager?.fullName]
        .some((v) => String(v || '').toLowerCase().includes(query));
    });
  }, [projects, healthFilter, search]);

  const counts = useMemo(() => {
    const c = { all: projects.length, off_track: 0, at_risk: 0, on_track: 0, done: 0 };
    projects.forEach((p) => { c[p.health] = (c[p.health] || 0) + 1; });
    return c;
  }, [projects]);

  const exportPortfolio = () =>
    downloadCsv(`portfolio-health-${today()}.csv`, toCsv(visible, PORTFOLIO_CSV_COLUMNS));
  const exportBranches = () =>
    downloadCsv(`branch-performance-${today()}.csv`, toCsv(branchRows, BRANCH_CSV_COLUMNS));

  const firstLoad = status === 'loading' && projects.length === 0 && !summary;
  const canPickBranch = user?.role !== 'branch_manager' && branches.length > 1;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Portfolio Health
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Every project rated On Track, At Risk or Off Track, with the reasons, plus a branch-by-branch comparison.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canPickBranch && (
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-slate-400" />
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700"
                aria-label="Filter by branch"
              >
                <option value="">All Branches ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportPortfolio}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-sm">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error.message || 'Failed to load the portfolio.'}</span>
          <button onClick={load} className="text-xs font-bold underline">Retry</button>
        </div>
      )}

      {firstLoad ? (
        <div className="min-h-[40vh] flex items-center justify-center"><Loader /></div>
      ) : (
        <>
          {/* Summary */}
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Off Track', value: summary?.off_track ?? 0, cls: 'text-rose-700', icon: XCircle },
              { label: 'At Risk', value: summary?.at_risk ?? 0, cls: 'text-amber-700', icon: AlertTriangle },
              { label: 'On Track', value: summary?.on_track ?? 0, cls: 'text-emerald-700', icon: CheckCircle2 },
              { label: 'Closed', value: summary?.done ?? 0, cls: 'text-slate-700', icon: CheckCircle2 },
              { label: 'Without a PM', value: summary?.withoutManager ?? 0, cls: (summary?.withoutManager ?? 0) > 0 ? 'text-rose-700' : 'text-slate-900', icon: UserPlus },
              { label: 'Overdue Tasks', value: summary?.overdueTasks ?? 0, cls: (summary?.overdueTasks ?? 0) > 0 ? 'text-amber-700' : 'text-slate-900', icon: AlertTriangle },
            ].map(({ label, value, cls, icon: Icon }) => (
              <div key={label} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                  <Icon className={`w-4 h-4 ${cls}`} />
                </div>
                <p className={`text-3xl font-extrabold mt-2 ${cls}`}>{value}</p>
              </div>
            ))}
          </section>

          {/* Project health board */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {HEALTH_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setHealthFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      healthFilter === f.value
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.label} ({counts[f.value] || 0})
                  </button>
                ))}
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search project, team, branch, PM…"
                className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 w-full md:w-64"
              />
            </div>

            {visible.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-500">
                {projects.length === 0 ? (
                  <>No projects yet. <Link className="text-blue-600 font-semibold" to={`${PATHS.EXECUTIVE.PROJECTS}?new=1`}>Launch the first one</Link>.</>
                ) : 'No projects match this filter.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-3">Health</th>
                      <th className="py-3 px-3">Project Manager</th>
                      <th className="py-3 px-3 w-40">Progress</th>
                      <th className="py-3 px-3 text-center">Overdue / Blocked</th>
                      <th className="py-3 px-3 text-center">Escalations / Violations</th>
                      <th className="py-3 px-4">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((p) => {
                      const meta = healthMeta(p.health);
                      const closed = p.health === 'done';
                      return (
                        <tr key={p.id} className="align-top hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <Link
                              to={PATHS.EXECUTIVE.PROJECT_DETAIL.replace(':id', p.id)}
                              className="font-bold text-slate-900 hover:text-blue-600"
                            >
                              {p.name}
                            </Link>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {p.team?.name || 'No team'} · {p.branch?.name || '—'} · {p.status}
                            </div>
                          </td>
                          <td className="py-3 px-3 max-w-[220px]">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${meta.chip}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                            {p.reasons?.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5 text-[11px] text-slate-500 list-disc pl-4">
                                {p.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}
                                {p.reasons.length > 3 && <li>+{p.reasons.length - 3} more</li>}
                              </ul>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {p.projectManager ? (
                              <div className="font-medium text-slate-800">{p.projectManager.fullName}</div>
                            ) : (
                              <div className="font-semibold text-rose-600">Unassigned</div>
                            )}
                            {!closed && (
                              <button
                                onClick={() => setAssigning(p)}
                                className="mt-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                              >
                                {p.projectManager ? 'Change' : 'Assign PM'}
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="font-semibold text-slate-700">{p.progress}%</span>
                              <span className="text-slate-400">{p.completedTasks}/{p.totalTasks}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${p.progress}%` }} />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            <span className={p.overdueTasks ? 'text-amber-700' : 'text-slate-400'}>{p.overdueTasks}</span>
                            <span className="text-slate-300"> / </span>
                            <span className={p.blockedTasks ? 'text-rose-700' : 'text-slate-400'}>{p.blockedTasks}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">
                            <span className={p.openEscalations ? 'text-amber-700' : 'text-slate-400'}>{p.openEscalations}</span>
                            <span className="text-slate-300"> / </span>
                            <span className={p.openViolations ? 'text-rose-700' : 'text-slate-400'}>{p.openViolations}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(p.targetDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Branch comparison */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Branch Performance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Headcount, delivery and open risk per branch.</p>
              </div>
              <button
                onClick={exportBranches}
                disabled={branchRows.length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            {branchError ? (
              <p className="p-6 text-sm text-rose-700">{branchError.message || 'Failed to load branch performance.'}</p>
            ) : branchStatus === 'loading' && branchRows.length === 0 ? (
              <div className="p-8 flex justify-center"><Loader /></div>
            ) : branchRows.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No branches configured yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-3 text-right">Headcount</th>
                      <th className="py-3 px-3 text-right">Teams</th>
                      <th className="py-3 px-3 text-right">Projects</th>
                      <th className="py-3 px-3 text-right">At Risk / Off Track</th>
                      <th className="py-3 px-3 w-36">Task Completion</th>
                      <th className="py-3 px-3 text-right">Overdue</th>
                      <th className="py-3 px-4 text-right">Escalations / Violations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {branchRows.map((b) => (
                      <tr key={b.id}>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{b.name}</div>
                          {b.code && <div className="text-[11px] font-mono text-slate-400">{b.code}</div>}
                        </td>
                        <td className="py-3 px-3 text-right">{b.headcount}</td>
                        <td className="py-3 px-3 text-right">{b.teams}</td>
                        <td className="py-3 px-3 text-right">{b.activeProjects} active / {b.totalProjects}</td>
                        <td className="py-3 px-3 text-right font-semibold">
                          <span className={b.atRiskProjects ? 'text-amber-700' : 'text-slate-400'}>{b.atRiskProjects}</span>
                          <span className="text-slate-300"> / </span>
                          <span className={b.offTrackProjects ? 'text-rose-700' : 'text-slate-400'}>{b.offTrackProjects}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-[11px] font-semibold text-slate-700 mb-1">{b.completionRate}%</div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${b.completionRate}%` }} />
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-right font-semibold ${b.overdueTasks ? 'text-amber-700' : 'text-slate-400'}`}>{b.overdueTasks}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          <span className={b.openEscalations ? 'text-amber-700' : 'text-slate-400'}>{b.openEscalations}</span>
                          <span className="text-slate-300"> / </span>
                          <span className={b.openViolations ? 'text-rose-700' : 'text-slate-400'}>{b.openViolations}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {assigning && (
        <AssignManagerModal
          project={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={load}
        />
      )}
    </div>
  );
}
