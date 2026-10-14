import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../app/paths';
import { Badge } from '../../../shared/components/Badge';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Loader } from '../../../shared/components/Loader';
import { StatCard } from '../../../shared/components/StatCard';
import * as executiveApi from '../../../services/api/executive';
import * as projectsApi from '../../../services/api/projects';
import {
  Users,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  GitBranch,
  TrendingUp,
  Activity,
  BarChart3,
  ChevronRight,
  CreditCard,
} from 'lucide-react';

const normalize = (r) => (Array.isArray(r) ? r : r?.data || []);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '—';

function Sparkline({ data = [] }) {
  if (!data.length) return null;
  const values = data.map((d) => d.count);
  const max = Math.max(...values, 1);
  const width = 160;
  const height = 40;
  const step = width / (values.length - 1 || 1);
  const points = values
    .map((v, i) => `${i * step},${height - (v / max) * height}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-40 h-10 overflow-visible" aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} className="text-blue-400" />
      <polygon points={`0,${height} ${points} ${(values.length - 1) * step},${height}`} className="text-blue-100 fill-current opacity-50" />
    </svg>
  );
}

function TrendBars({ trendMap = {} }) {
  const entries = Object.entries(trendMap).slice(-14);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {entries.map(([date, count]) => (
        <div key={date} title={`${date}: ${count} completed`} className="w-2.5 rounded-t bg-blue-500 opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${Math.max(4, (count / max) * 40)}px` }} />
      ))}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [branches, setBranches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMetrics = useCallback(async (branchId) => {
    setLoading(true);
    setError('');
    try {
      const params = branchId ? { branchId } : {};
      const [metricsRes, projectsRes] = await Promise.all([
        executiveApi.getMetrics(params),
        projectsApi.list(),
      ]);
      setMetrics(metricsRes);
      setProjects(normalize(projectsRes));
    } catch (err) {
      setError(err.message || 'Failed to load executive dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    executiveApi.getBranches().then((res) => { if (active) setBranches(normalize(res)); }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => { loadMetrics(selectedBranchId); }, [selectedBranchId, loadMetrics]);

  if (loading) return <div className="min-h-full flex items-center justify-center p-8"><Loader /></div>;
  if (error) return <div className="p-6 text-sm text-red-600" role="alert">{error}</div>;

  const {
    totalUsers = 0, totalTeams = 0, totalBranches = 0,
    activeProjects = 0, totalProjects = 0,
    activeTasks = 0, completedTasks = 0,
    openEscalations = 0, openViolations = 0,
    completionRate = 0, planName = 'Free Tier', taskTrend = {},
  } = metrics || {};

  const trendData = Object.entries(taskTrend).map(([date, count]) => ({ date, count }));
  const allProjects = projects.slice(0, 6);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Company-wide performance, compliance health, and delivery status.</p>
        </div>
        <div className="flex items-center gap-3">
          {branches.length > 1 && (
            <div className="flex items-center gap-2">
              <GitBranch size={15} className="text-slate-400 shrink-0" />
              <select
                id="branch-filter"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <CreditCard size={12} />{planName}
          </span>
        </div>
      </header>

      {/* Risk Banners */}
      {(openViolations > 0 || openEscalations > 0) && (
        <div className="space-y-3">
          {openViolations > 0 && (
            <div className="rounded-xl border border-rose-300/80 bg-rose-50/70 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700"><ShieldAlert size={20} /></span>
                <div>
                  <p className="text-sm font-bold text-rose-900">{openViolations} Open Compliance Violation{openViolations > 1 ? 's' : ''}</p>
                  <p className="text-xs text-rose-700 mt-0.5">Active violations require executive attention and resolution.</p>
                </div>
              </div>
            </div>
          )}
          {openEscalations > 0 && (
            <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><AlertCircle size={20} /></span>
                <div>
                  <p className="text-sm font-bold text-amber-900">{openEscalations} Open Escalation{openEscalations > 1 ? 's' : ''} Awaiting Resolution</p>
                  <p className="text-xs text-amber-700 mt-0.5">Teams have open blockers or extension requests pending PM review.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Primary KPIs */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Active Projects" value={activeProjects} trend={`${totalProjects} total`} icon={<Briefcase size={18} className="text-blue-600" />} />
        <StatCard title="Active Tasks" value={activeTasks} trend={`${completedTasks} completed`} icon={<CheckCircle2 size={18} className="text-emerald-600" />} />
        <StatCard title="Open Escalations" value={openEscalations} trend={openEscalations ? 'Needs attention' : 'All clear'} trendDirection={openEscalations ? 'down' : 'up'} icon={<AlertCircle size={18} className={openEscalations ? 'text-amber-500' : 'text-slate-400'} />} />
        <StatCard title="Compliance Violations" value={openViolations} trend={openViolations ? 'Action required' : 'Fully compliant'} trendDirection={openViolations ? 'down' : 'up'} icon={<ShieldAlert size={18} className={openViolations ? 'text-rose-500' : 'text-slate-400'} />} />
      </section>

      {/* Secondary KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Users', value: totalUsers, sub: 'Active team members', icon: <Users size={16} className="text-blue-500" /> },
          { label: 'Teams', value: totalTeams, sub: 'Delivery teams', icon: <Activity size={16} className="text-indigo-500" /> },
          { label: 'Branches', value: totalBranches, sub: 'Organisational units', icon: <GitBranch size={16} className="text-violet-500" /> },
          { label: 'Completion Rate', value: `${completionRate}%`, sub: 'Tasks completed vs active', icon: <TrendingUp size={16} className="text-emerald-500" /> },
        ].map(({ label, value, sub, icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
              {icon}
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </section>

      {/* Trend + Compliance */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" />30-Day Task Completion Trend
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Daily completed tasks over the last 30 days.</p>
            </div>
            <span className="text-2xl font-extrabold text-blue-700">{completedTasks}</span>
          </div>
          <div className="p-5">
            {trendData.length > 0 ? (
              <div className="space-y-3">
                <TrendBars trendMap={taskTrend} />
                <div className="flex justify-between text-[10px] font-medium text-slate-400">
                  <span>14 days ago</span><span>Today</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Sparkline data={trendData} />
                  <div className="ml-4 space-y-1">
                    <p className="text-xs font-semibold text-slate-700">{completedTasks} total completed (all time)</p>
                    <p className="text-xs text-slate-500">{trendData.reduce((a, d) => a + d.count, 0)} tasks in last 30 days</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No trend data" description="Completed tasks will appear here." />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Compliance Health</h2>
            </div>
            <Badge status={openViolations === 0 ? 'success' : 'danger'}>
              {openViolations === 0 ? '100% Compliant' : 'Action Required'}
            </Badge>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-100" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    className={completionRate >= 80 ? 'stroke-emerald-500' : completionRate >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'}
                    strokeWidth="3"
                    strokeDasharray={`${completionRate} ${100 - completionRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-slate-900">{completionRate}%</span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">done</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                <p className="text-lg font-extrabold text-slate-900">{openViolations}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Violations</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                <p className="text-lg font-extrabold text-slate-900">{openEscalations}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Escalations</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                <p className="text-lg font-extrabold text-emerald-700">{activeProjects}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Active</p>
              </div>
            </div>
            <Link to={PATHS.EXECUTIVE.AUDIT_LOGS} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50 transition-colors">
              <span className="font-semibold text-slate-700">View Audit Logs</span>
              <ChevronRight size={16} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* Active Projects Section */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/50">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Active Projects</h2>
            <p className="mt-0.5 text-xs text-slate-500">Company-wide project delivery status.</p>
          </div>
          <Link to={PATHS.EXECUTIVE.PROJECTS} className="text-xs font-semibold text-blue-600 hover:text-blue-700">All projects →</Link>
        </div>
        {allProjects.length === 0 ? (
          <div className="p-6"><EmptyState title="No projects" description="Projects created by PMs will appear here." /></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {allProjects.map((project) => {
              const projectTasks = project.tasks || [];
              const done = projectTasks.filter((t) => t.status === 'Completed').length;
              const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
              const statusVariant = project.status === 'Completed' ? 'success' : project.status === 'Active' ? 'info' : project.status === 'OnHold' || project.status === 'On_Hold' ? 'danger' : 'default';
              return (
                <div key={project.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{project.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{project.team?.name || '—'} · Due {formatDate(project.targetDate)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-slate-700">{progress}%</span>
                      <Badge status={statusVariant}>{project.status === 'OnHold' || project.status === 'On_Hold' ? 'On Hold' : project.status || 'Planning'}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
