import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { PATHS } from '../../../app/paths';
import { Loader } from '../../../shared/components/Loader';
import { GuidedQuickstartChecklist } from '../components/GuidedQuickstartChecklist';
import * as executiveApi from '../../../services/api/executive';
import * as projectsApi from '../../../services/api/projects';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  GitBranch,
  Users,
  CreditCard,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Layers,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Plus,
} from 'lucide-react';

const normalize = (r) => (Array.isArray(r) ? r : r?.data || []);

export default function ExecutiveDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [branches, setBranches] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async (branchId) => {
    setLoading(true);
    setError('');
    try {
      const params = branchId ? { branchId } : {};
      const [metricsRes, projectsRes] = await Promise.all([
        executiveApi.getMetrics(params),
        projectsApi.list(params),
      ]);
      setMetrics(metricsRes?.data || metricsRes);
      setProjects(normalize(projectsRes));
    } catch (err) {
      setError(err.message || 'Failed to load executive telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    executiveApi.getBranches().then((res) => {
      if (active) setBranches(normalize(res));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    loadDashboardData(selectedBranchId);
  }, [selectedBranchId, loadDashboardData]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-8">
        <Loader />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Aggregating enterprise telemetry...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadDashboardData(selectedBranchId)}
            className="text-xs font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalUsers = 0,
    totalTeams = 0,
    totalBranches = 0,
    activeProjects = 0,
    totalProjects = 0,
    activeTasks = 0,
    completedTasks = 0,
    openEscalations = 0,
    openViolations = 0,
    completionRate = 0,
    complianceScore = 100,
    totalComplianceRules = 0,
    totalProcessTemplates = 0,
    planName = 'Standard Plan',
    subscriptionStatus = 'Active',
    trialEndsAt = null,
    planQuotas = {},
    branchDistribution = [],
    recentViolations = [],
    recentEscalations = [],
  } = metrics || {};

  const recentProjects = projects.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* 1. Header & Executive Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Executive Control Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time cross-domain analytics covering operations, governance, compliance, and workforce distribution.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {branches.length > 1 && (
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="executive-branch-filter"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
              >
                <option value="">All Branches ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.code ? `(${b.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold shadow-2xs">
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            <span>{planName}</span>
          </div>

          <Link
            to={PATHS.EXECUTIVE.PROJECTS}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </Link>
        </div>
      </header>

      {/* 2. Smart Quickstart Checklist */}
      <GuidedQuickstartChecklist
        metrics={metrics || {}}
        companyName={user?.companyName || user?.company?.legalName || 'your organization'}
        companyId={user?.companyId || ''}
      />

      {/* 3. Executive KPI Pulse Bar (4 Core Enterprise Dimensions) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dimension 1: Operational Velocity */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Delivery Velocity
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{completionRate}%</span>
            <span className="text-xs font-semibold text-emerald-600">Completion</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, completionRate)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {completedTasks} completed · {activeTasks} in flight
          </p>
        </div>

        {/* Dimension 2: Governance & Compliance Posture */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Compliance Posture
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              openViolations > 0 ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {openViolations > 0 ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{complianceScore}%</span>
            <span className={`text-xs font-semibold ${openViolations > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {openViolations > 0 ? `${openViolations} Violations` : 'Compliant'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                complianceScore >= 90 ? 'bg-emerald-500' : complianceScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${complianceScore}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {totalComplianceRules} active policies monitored
          </p>
        </div>

        {/* Dimension 3: Active Portfolio Initiatives */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Portfolio
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{activeProjects}</span>
            <span className="text-xs font-semibold text-slate-500">of {totalProjects} Total</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Assigned to {totalTeams} delivery squads
          </p>
        </div>

        {/* Dimension 4: Organization Footprint */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Workforce Capacity
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalUsers}</span>
            <span className="text-xs font-semibold text-slate-500">Members</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${planQuotas?.maxUsers ? Math.min(100, Math.round((totalUsers / planQuotas.maxUsers) * 100)) : 40}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Across {totalBranches} branch office{totalBranches === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      {/* 4. Domain Section: Active Initiatives Portfolio (Work Domain) */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Portfolio Initiatives & Delivery Status</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live projects, milestone progression, and squad assignments.
            </p>
          </div>
          <Link
            to={PATHS.EXECUTIVE.PROJECTS}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All ({projects.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No projects launched yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first project to define milestone deliverables and attach automated compliance rules.
            </p>
            <Link
              to={PATHS.EXECUTIVE.PROJECTS}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Project</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100 text-[11px]">
                <tr>
                  <th className="py-3 px-5">Project Name</th>
                  <th className="py-3 px-4">Squad / Branch</th>
                  <th className="py-3 px-4">Milestone Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProjects.map((p) => {
                  const tasks = p.tasks || [];
                  const completed = tasks.filter((t) => t.status === 'Completed').length;
                  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
                  const squadName = p.team?.name || 'Unassigned';
                  const branchName = p.team?.branch?.name || 'Main HQ';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`${PATHS.EXECUTIVE.PROJECTS}/${p.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {p.code || `PROJ-${p.id.slice(0, 6)}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{squadName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{branchName}</div>
                      </td>

                      <td className="py-3.5 px-4 w-48">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-700">{progress}%</span>
                          <span className="text-slate-400">
                            {completed}/{tasks.length} tasks
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            p.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'Completed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.status || 'Active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <span className="inline-flex items-center gap-1 text-slate-400 group-hover:text-blue-600 font-semibold transition-colors">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Governance, Risk & Blocker Matrix (Compliance & Quality Domain) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Compliance Violations */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Compliance & Audit Alerts</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active policy violations detected by automated gates.
              </p>
            </div>
            <Link
              to={PATHS.COMPLIANCE.VIOLATIONS}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Manage ({openViolations})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentViolations.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">100% Policy Compliant</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No active compliance violations detected across squads or milestone evidence.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentViolations.map((v) => (
                <div key={v.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-900 block">
                      {v.rule?.name || 'Regulatory Policy Breach'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Policy: <span className="text-slate-700 font-medium">{v.rule?.description || v.rule?.name || 'Standard Policy'}</span> · Detected{' '}
                      {new Date(v.detectedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      v.severity === 'Critical'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {v.severity || 'High'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Operational Escalations & Blockers */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Squad Blockers & Escalations</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Delivery bottlenecks flagged by Team Leads.
              </p>
            </div>
            <Link
              to={PATHS.PM.ESCALATIONS || PATHS.EXECUTIVE.PROJECTS}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View All ({openEscalations})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentEscalations.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">Clear Execution Runway</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No active delivery blockers or deadline extension escalations reported.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {recentEscalations.map((esc) => (
                <div key={esc.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-900 block">{esc.title}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Deliverable: <strong>{esc.task?.title || esc.project?.name || 'General Task'}</strong> · Type: {esc.blockerType || 'Operational'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      esc.priority === 'Critical'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {esc.priority || 'High'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Regional Organization & Squad Footprint (HR Domain) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Regional Organization & Squad Footprint</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Branch locations, squad capacity, and personnel assignment.
            </p>
          </div>
          <Link
            to={PATHS.HR.BRANCHES}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Manage Branches →</span>
          </Link>
        </div>

        {branchDistribution.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            No branch offices configured yet. Establish your main headquarters to organize delivery squads.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {branchDistribution.map((b) => {
              const squadCount = b._count?.teams || b.teams?.length || 0;
              return (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Code: {b.code || 'MAIN'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {squadCount} Squad{squadCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                    <span>Assigned Squads:</span>
                    <span className="font-semibold text-slate-800">
                      {b.teams?.map((t) => t.name).join(', ') || 'No squads'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. Commercial Quota & System Capacity (Platform Domain) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              <span>Commercial Plan Entitlements & Capacity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live consumption against subscribed plan quotas.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Billing Status: <strong className="text-slate-800">{subscriptionStatus}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Quota 1: User Seats */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <span className="text-slate-500 font-medium">User Seats</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900">{totalUsers}</span>
              <span className="text-slate-400">Cap: {planQuotas?.maxUsers || '∞'}</span>
            </div>
          </div>

          {/* Quota 2: Branches */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <span className="text-slate-500 font-medium">Branch Units</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900">{totalBranches}</span>
              <span className="text-slate-400">Cap: {planQuotas?.maxBranches || '∞'}</span>
            </div>
          </div>

          {/* Quota 3: Process Templates */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <span className="text-slate-500 font-medium">Process Templates</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900">{totalProcessTemplates}</span>
              <span className="text-slate-400">Cap: {planQuotas?.maxActiveProcessTemplates || '∞'}</span>
            </div>
          </div>

          {/* Quota 4: Audit Retention */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
            <span className="text-slate-500 font-medium">Audit Trail Retention</span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900">{planQuotas?.auditLogRetentionDays || 90}</span>
              <span className="text-slate-400">Days</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
