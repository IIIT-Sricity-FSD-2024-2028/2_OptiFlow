import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { PATHS } from "../../../app/paths";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../shared/components/Toast";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { 
  ShieldCheck, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  PlayCircle, 
  Loader2, 
  Building2, 
  FolderGit2, 
  ArrowUpRight,
  ShieldAlert,
  FileCheck2,
  TrendingUp,
  FileText,
  Filter,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function ComplianceDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);

  // Raw Database Data
  const [rawRules, setRawRules] = useState([]);
  const [rawViolations, setRawViolations] = useState([]);
  const [rawEvidence, setRawEvidence] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState("all");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [rulesResponse, violationsResponse, evidenceResponse, projectsResponse, tasksResponse] = await Promise.all([
        apiClient("/compliance-rules").catch(() => []),
        apiClient("/compliance-violations").catch(() => []),
        apiClient("/evidence").catch(() => []),
        apiClient("/projects").catch(() => []),
        apiClient("/tasks").catch(() => []),
      ]);

      setRawRules(Array.isArray(rulesResponse) ? rulesResponse : rulesResponse?.data || []);
      setRawViolations(Array.isArray(violationsResponse) ? violationsResponse : violationsResponse?.data || []);
      setRawEvidence(Array.isArray(evidenceResponse) ? evidenceResponse : evidenceResponse?.data || []);
      setRawProjects(Array.isArray(projectsResponse) ? projectsResponse : projectsResponse?.data || []);
      setRawTasks(Array.isArray(tasksResponse) ? tasksResponse : tasksResponse?.data || []);
    } catch (error) {
      console.error("Failed to load compliance metrics:", error);
      toast.error("Failed to load compliance status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Map each task to its project
  const taskProjectMap = useMemo(() => {
    const map = new Map();
    rawTasks.forEach((t) => {
      if (t.id && t.projectId) {
        map.set(String(t.id), String(t.projectId));
      }
    });
    return map;
  }, [rawTasks]);

  // Project map for friendly names
  const projectNameMap = useMemo(() => {
    const map = new Map();
    rawProjects.forEach((p) => {
      map.set(String(p.id), p.name);
    });
    return map;
  }, [rawProjects]);

  // Helper to resolve an entity's parent project
  const resolveEntityProject = (entityType, entityId) => {
    if (!entityId) return { id: null, name: "Company / Global" };
    if (entityType === "Project") {
      const projName = projectNameMap.get(String(entityId));
      return { id: String(entityId), name: projName || `Project #${String(entityId).substring(0, 8)}` };
    }
    if (entityType === "Task") {
      const projId = taskProjectMap.get(String(entityId));
      if (projId) {
        return { id: projId, name: projectNameMap.get(projId) || `Project #${projId.substring(0, 8)}` };
      }
    }
    return { id: null, name: "Company / Global" };
  };

  // Filter violations based on selected project
  const filteredViolations = useMemo(() => {
    if (selectedProjectId === "all") return rawViolations;
    if (selectedProjectId === "global") {
      return rawViolations.filter((v) => {
        const { id } = resolveEntityProject(v.entityType, v.entityId);
        return id === null;
      });
    }
    return rawViolations.filter((v) => {
      const { id } = resolveEntityProject(v.entityType, v.entityId);
      return id === String(selectedProjectId);
    });
  }, [rawViolations, selectedProjectId, taskProjectMap, projectNameMap]);

  // Multi-Pillar Compliance Health Score Calculation
  const metrics = useMemo(() => {
    const totalRules = rawRules.length || 1;
    const activeRulesCount = rawRules.filter((r) => r.isActive !== false).length;
    // Pillar 1: Active Rule Coverage (40%)
    const ruleCoverageScore = (activeRulesCount / totalRules) * 40;

    const totalViolations = filteredViolations.length;
    const openViolations = filteredViolations.filter((v) => v.status === "Open" || v.status === "Under_Review");
    const resolvedViolations = filteredViolations.filter((v) => v.status === "Resolved" || v.status === "Ignored");

    // Pillar 2: Violation Remediation Rate (40%)
    const violationRemediationScore = totalViolations === 0 
      ? 40 
      : Math.max(0, 40 - (openViolations.length / totalViolations) * 40);

    const totalEvidence = rawEvidence.length;
    const approvedEvidence = rawEvidence.filter((e) => e.status === "Approved").length;
    const pendingReviews = rawEvidence.filter((e) => e.status === "Pending" || e.status === "Under_Review").length;

    // Pillar 3: Evidence Attestation Rate (20%)
    const evidenceAttestationScore = totalEvidence === 0 
      ? 20 
      : (approvedEvidence / totalEvidence) * 20;

    const complianceScore = Math.min(100, Math.round(ruleCoverageScore + violationRemediationScore + evidenceAttestationScore));

    return {
      complianceScore,
      ruleCoverageScore: Math.round(ruleCoverageScore),
      violationRemediationScore: Math.round(violationRemediationScore),
      evidenceAttestationScore: Math.round(evidenceAttestationScore),
      activeRulesCount,
      totalRules,
      activeViolations: openViolations.length,
      resolvedViolations: resolvedViolations.length,
      totalViolations,
      pendingReviews,
      approvedEvidence,
      totalEvidence,
    };
  }, [rawRules, filteredViolations, rawEvidence]);

  // Project Risk Matrix calculation
  const projectRiskMatrix = useMemo(() => {
    return rawProjects.map((proj) => {
      const projId = String(proj.id);
      const projViolations = rawViolations.filter((v) => {
        const { id } = resolveEntityProject(v.entityType, v.entityId);
        return id === projId;
      });

      const openCount = projViolations.filter((v) => v.status === "Open" || v.status === "Under_Review").length;
      const criticalCount = projViolations.filter((v) => 
        (v.status === "Open" || v.status === "Under_Review") && 
        (v.rule?.severity === "Critical" || v.rule?.severity === "High")
      ).length;

      // Project score calculation
      const score = projViolations.length === 0
        ? 100
        : Math.max(20, Math.round(100 - (openCount * 18 + criticalCount * 12)));

      return {
        id: proj.id,
        name: proj.name,
        teamName: proj.team?.name || "Unassigned",
        totalViolations: projViolations.length,
        openViolations: openCount,
        criticalViolations: criticalCount,
        score,
        status: score >= 80 ? "Healthy" : score >= 60 ? "Attention" : "At Risk",
      };
    }).sort((a, b) => a.score - b.score);
  }, [rawProjects, rawViolations, taskProjectMap, projectNameMap]);

  // Charts Data
  const chartData = useMemo(() => {
    const active = filteredViolations.filter((v) => v.status === "Open" || v.status === "Under_Review");
    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    active.forEach((v) => {
      const severity = v.rule?.severity || "Medium";
      if (severityCounts[severity] !== undefined) {
        severityCounts[severity]++;
      } else {
        severityCounts["Medium"]++;
      }
    });

    const severityChartData = Object.keys(severityCounts)
      .filter((key) => severityCounts[key] > 0)
      .map((key) => ({ name: key, value: severityCounts[key] }));

    const statusCounts = { Open: 0, Under_Review: 0, Resolved: 0, Ignored: 0 };
    filteredViolations.forEach((v) => {
      if (statusCounts[v.status] !== undefined) {
        statusCounts[v.status]++;
      }
    });

    const statusChartData = Object.keys(statusCounts)
      .filter((key) => statusCounts[key] > 0)
      .map((key) => ({ name: key.replace("_", " "), value: statusCounts[key] }));

    return { severity: severityChartData, status: statusChartData };
  }, [filteredViolations]);

  const triggerScan = async () => {
    setIsScanning(true);
    try {
      await apiClient("/compliance-rules/run-engine", { method: "POST" });
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastScanTime(nowStr);
      await fetchDashboardData();
      toast.success("Automated compliance engine scan completed successfully.");
    } catch (error) {
      toast.error("Compliance scan failed: " + (error.message || "Network error"));
    } finally {
      setIsScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-slate-900">
      {/* Top Header & Triage Controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance & Regulatory Oversight</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time multi-framework governance, automated policy interceptors, and project risk triage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter Dropdown */}
          <div className="flex items-center gap-2.5 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 shadow-xs">
            <Filter size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Scope:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-sm font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Company-Wide (All Projects & Global)</option>
              <option value="global">Global / Non-Project Only</option>
              {rawProjects.map((p) => (
                <option key={p.id} value={p.id}>Project: {p.name}</option>
              ))}
            </select>
          </div>

          {/* Automated Scan Button */}
          <button 
            onClick={triggerScan} 
            disabled={isScanning}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isScanning ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Scanning Policies…</span>
              </>
            ) : (
              <>
                <PlayCircle size={16} />
                <span>Run Automated Scan</span>
              </>
            )}
          </button>
        </div>
      </header>

      {lastScanTime && (
        <div className="text-sm text-slate-500 font-medium flex items-center gap-2 -mt-4">
          <Clock size={14} className="text-slate-400" />
          <span>Last automated engine scan completed at: {lastScanTime}</span>
        </div>
      )}

      {/* 4 Professional KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Multi-Factor Health Score */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Compliance Health</span>
              <ShieldCheck size={18} className={metrics.complianceScore >= 80 ? "text-emerald-600" : metrics.complianceScore >= 60 ? "text-amber-600" : "text-rose-600"} />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.complianceScore}%</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                metrics.complianceScore >= 80 
                  ? "bg-emerald-50 text-emerald-700" 
                  : metrics.complianceScore >= 60 
                  ? "bg-amber-50 text-amber-700" 
                  : "bg-rose-50 text-rose-700"
              }`}>
                {metrics.complianceScore >= 80 ? "Good" : metrics.complianceScore >= 60 ? "Fair" : "At Risk"}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Rules: {metrics.ruleCoverageScore}/40</span>
            <span>Violations: {metrics.violationRemediationScore}/40</span>
            <span>Evidence: {metrics.evidenceAttestationScore}/20</span>
          </div>
        </div>

        {/* Card 2: Enforced Rules */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enforced Policies</span>
              <ShieldAlert size={18} className="text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.activeRulesCount}</span>
              <span className="text-xs text-slate-500 ml-1.5 font-medium">/ {metrics.totalRules} active</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-blue-600">
            {Math.round((metrics.activeRulesCount / metrics.totalRules) * 100)}% company policy enforceability
          </div>
        </div>

        {/* Card 3: Active Violations */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Violations</span>
              <AlertTriangle size={18} className={metrics.activeViolations > 0 ? 'text-rose-600' : 'text-slate-400'} />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.activeViolations}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold">
            {metrics.activeViolations > 0 ? (
              <span className="text-rose-600">{metrics.activeViolations} flagged for mitigation</span>
            ) : (
              <span className="text-emerald-600">Zero active policy blocks ✓</span>
            )}
          </div>
        </div>

        {/* Card 4: Pending Evidence */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Attestations</span>
              <Clock size={18} className={metrics.pendingReviews > 0 ? 'text-amber-500' : 'text-slate-400'} />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{metrics.pendingReviews}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold">
            {metrics.pendingReviews > 0 ? (
              <span className="text-amber-600">{metrics.pendingReviews} awaiting officer review</span>
            ) : (
              <span className="text-emerald-600">Attestation queue clear ✓</span>
            )}
          </div>
        </div>
      </section>

      {/* Project Risk Matrix Table */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              <span>Project Risk Matrix & Comparative Posture</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-project risk ranking. Compare violation densities and drill into target scopes.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {projectRiskMatrix.length} Projects Ranked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-5">Project Name</th>
                <th className="py-3 px-4">Assigned Team</th>
                <th className="py-3 px-4 text-center">Open Violations</th>
                <th className="py-3 px-4 text-center">Critical / High</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Posture</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {projectRiskMatrix.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-2">
                    <FolderGit2 size={14} className="text-slate-400" />
                    <span>{item.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{item.teamName}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      item.openViolations > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.openViolations}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      item.criticalViolations > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.criticalViolations}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            item.score >= 80 ? 'bg-emerald-500' : item.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-900">{item.score}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge status={item.status === 'Healthy' ? 'success' : item.status === 'Attention' ? 'warning' : 'danger'}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => setSelectedProjectId(String(item.id))}
                      className="text-blue-600 hover:text-blue-800 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Filter Scope</span>
                      <ArrowUpRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytics Section: Severity & Status Breakdown */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Violations by Severity</h3>
          </div>
          {chartData.severity && chartData.severity.length > 0 ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.severity}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.severity.map((entry, index) => {
                      const colors = {
                        Critical: '#ef4444',
                        High: '#f97316',
                        Medium: '#eab308',
                        Low: '#3b82f6'
                      };
                      return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#94a3b8'} />;
                    })}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-slate-400 text-xs">
              No active severity flags for current scope.
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Violation Status Distribution</h3>
          </div>
          {chartData.status && chartData.status.length > 0 ? (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.status} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                    {chartData.status.map((entry, index) => {
                      const colors = {
                        'Open': '#ef4444',
                        'Under Review': '#f59e0b',
                        'Resolved': '#10b981',
                        'Ignored': '#94a3b8'
                      };
                      return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#3b82f6'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-slate-400 text-xs">
              No status records logged for current scope.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
