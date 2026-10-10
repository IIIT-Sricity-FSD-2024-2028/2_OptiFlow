import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/api/client";
import { useAuth } from "../../../context/AuthContext";
import StatCard from "../../../shared/components/StatCard";
import Table from "../../../shared/components/Table";
import { Badge } from "../../../shared/components/Badge";
import { Modal } from "../../../shared/components/Modal";
import { Button } from "../../../shared/components/Button";
import { ShieldCheck, CheckCircle, AlertTriangle, Clock, PlayCircle, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function ComplianceDashboard() {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState({
    complianceScore: 100,
    activeViolations: 0,
    resolvedViolations: 0,
    pendingReviews: 0,
  });
  const [violationsData, setViolationsData] = useState([]);
  const [chartData, setChartData] = useState({ severity: [], trend: [] });

  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);

  // Modal State
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [rulesResponse, violationsResponse, evidenceResponse] = await Promise.all([
        apiClient("/compliance-rules").catch(() => []),
        apiClient("/compliance-violations").catch(() => []),
        apiClient("/evidence").catch(() => []) // FIXED: Was incorrectly calling /compliance-evidence
      ]);

      const rules = Array.isArray(rulesResponse) ? rulesResponse : [];
      const violations = Array.isArray(violationsResponse) ? violationsResponse : [];
      const evidence = Array.isArray(evidenceResponse) ? evidenceResponse : [];

      const active = violations.filter(v => v.status === 'Open' || v.status === 'Under_Review');
      const resolved = violations.filter(v => v.status === 'Resolved' || v.status === 'Ignored');
      
      const pendingReviews = evidence.filter(e => e.status === 'Pending' || e.status === 'Under_Review').length;

      const score = violations.length > 0 
        ? Math.round((resolved.length / violations.length) * 100) 
        : 100;

      setMetrics({
        complianceScore: score,
        activeViolations: active.length,
        resolvedViolations: resolved.length,
        pendingReviews: pendingReviews,
      });

      // Calculate chart data
      const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      active.forEach(v => {
        const severity = v.rule?.severity || 'Medium';
        if (severityCounts[severity] !== undefined) {
          severityCounts[severity]++;
        } else {
          severityCounts['Medium']++;
        }
      });
      
      const severityChartData = Object.keys(severityCounts)
        .filter(key => severityCounts[key] > 0)
        .map(key => ({ name: key, value: severityCounts[key] }));

      const statusCounts = { Open: 0, Under_Review: 0, Resolved: 0, Ignored: 0 };
      violations.forEach(v => {
        if (statusCounts[v.status] !== undefined) {
          statusCounts[v.status]++;
        }
      });

      const statusChartData = Object.keys(statusCounts)
        .filter(key => statusCounts[key] > 0)
        .map(key => ({ name: key.replace('_', ' '), value: statusCounts[key] }));

      setChartData({ severity: severityChartData, status: statusChartData });

      // Format data for the table
      const formattedViolations = active.map(v => ({
        id: v.id,
        project: v.entityName || `${v.entityType || 'General'} #${(v.entityId || 'N/A').substring(0,8)}`,
        policy: v.rule ? v.rule.name : `Rule #${v.ruleId}`,
        status: v.status,
        evidence: evidence.filter(e => e.violationId === v.id).length,
        lastAudited: new Date(v.detectedAt || new Date()).toLocaleDateString(),
        rawViolation: v, // Keep raw object for modal logic
      }));

      setViolationsData(formattedViolations);

    } catch (error) {
      console.error("Failed to load compliance metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const triggerScan = async () => {
    setIsScanning(true);
    try {
      await apiClient("/compliance-rules/run-engine", { method: "POST" });
      setLastScanTime(new Date().toLocaleTimeString());
      await fetchDashboardData();
      alert("Compliance engine scan completed successfully.");
    } catch (error) {
      alert("Scan failed: " + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleResolveSubmit = async () => {
    if (resolutionNotes.length < 5) {
      alert("Please provide detailed resolution notes.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient(`/compliance-violations/${selectedViolation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Resolved',
          resolutionRemarks: resolutionNotes
        })
      });
      
      setSelectedViolation(null);
      setResolutionNotes("");
      await fetchDashboardData(); // Refresh UI
    } catch (error) {
      alert("Failed to resolve: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const tableColumns = [
    { header: "VIOLATING ENTITY", accessor: "project" },
    { header: "POLICY", accessor: "policy", render: (row) => <span className="font-semibold text-[13px]">{row.policy}</span> },
    { 
      header: "STATUS", 
      accessor: "status",
      render: (row) => (
        <Badge status={row.status === 'Open' ? 'danger' : row.status === 'Under_Review' ? 'warning' : 'success'}>
          {row.status.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      header: "EVIDENCE", 
      accessor: "evidence",
      render: (row) => (
        <Badge status={row.evidence > 0 ? 'info' : 'default'}>
          {row.evidence > 0 ? `${row.evidence} file(s)` : 'None'}
        </Badge>
      )
    },
    { header: "LAST AUDITED", accessor: "lastAudited" },
    { 
      header: "ACTION", 
      accessor: "action",
      render: (row) => (
        <Button 
          variant="secondary"
          size="sm"
          onClick={() => {
            setSelectedViolation(row);
            setResolutionNotes("");
          }}
        >
          Resolve
        </Button>
      )
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto bg-[#f0f4f8] min-h-screen text-[#1a2332]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a2332] mb-2">Compliance Status</h1>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col items-end">
          <button 
            onClick={triggerScan} 
            disabled={isScanning}
            className="flex items-center gap-2 bg-[#3b82f6] text-white px-4 py-2 rounded-md font-semibold text-[13px] hover:bg-[#1d4ed8] transition-colors disabled:opacity-60 shadow-sm"
          >
            {isScanning ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Scanning Network...
              </>
            ) : (
              <>
                <PlayCircle size={16} />
                Run Automated Scan
              </>
            )}
          </button>
          {lastScanTime && (
            <span className="text-xs text-gray-500 mt-2 font-medium">Last scan: {lastScanTime}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Compliance Score"
          value={`${metrics.complianceScore}%`}
          subtitle={
            <span className={metrics.complianceScore >= 80 ? "text-[#10b981]" : metrics.complianceScore >= 60 ? "text-[#f59e0b]" : "text-[#ef4444]"}>
              {metrics.complianceScore >= 80 ? "Fully compliant" : metrics.complianceScore >= 60 ? "Needs attention" : "At risk"}
            </span>
          }
          icon={<ShieldCheck size={20} className={metrics.complianceScore >= 80 ? "text-[#10b981]" : "text-[#f59e0b]"} />}
        />
        <StatCard
          title="Resolved Violations"
          value={metrics.resolvedViolations}
          subtitle={<span className="text-[#10b981]">Fully compliant</span>}
          icon={<CheckCircle size={20} className="text-[#10b981]" />}
        />
        <StatCard
          title="Active Violations"
          value={metrics.activeViolations}
          subtitle={
            <span className={metrics.activeViolations > 0 ? "text-[#ef4444]" : "text-[#10b981]"}>
              {metrics.activeViolations > 0 ? "Open flags" : "None"}
            </span>
          }
          icon={<AlertTriangle size={20} className={metrics.activeViolations > 0 ? 'text-[#ef4444]' : 'text-gray-400'} />}
        />
        <StatCard
          title="Pending Reviews"
          value={metrics.pendingReviews}
          subtitle={
            <span className={metrics.pendingReviews > 0 ? "text-[#f59e0b]" : "text-[#10b981]"}>
              {metrics.pendingReviews > 0 ? "Awaiting audit →" : "All caught up"}
            </span>
          }
          icon={<Clock size={20} className={metrics.pendingReviews > 0 ? 'text-[#f59e0b]' : 'text-gray-400'} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-[12px] border border-[#e2e8f0] shadow-sm">
          <h3 className="text-[15px] font-bold text-[#1a2332] mb-4">Violations by Severity</h3>
          {chartData.severity && chartData.severity.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.severity}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
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
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
              No severity data available
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-[12px] border border-[#e2e8f0] shadow-sm">
          <h3 className="text-[15px] font-bold text-[#1a2332] mb-4">Violations by Status</h3>
          {chartData.status && chartData.status.length > 0 ? (
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.status} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
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
            <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
              No status data available
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#e2e8f0] shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-[#e2e8f0] bg-white">
          <h2 className="text-[15px] font-bold text-[#1a2332]">Active Violations Breakdown</h2>
        </div>
        <div className="p-0">
          <Table 
            columns={tableColumns} 
            data={violationsData} 
            emptyMessage="No active compliance violations found."
          />
        </div>
      </div>

      {/* Resolution Modal */}
      <Modal 
        isOpen={!!selectedViolation} 
        onClose={() => setSelectedViolation(null)}
        title="Resolve Compliance Violation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedViolation(null)}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleResolveSubmit}
              disabled={isSubmitting || resolutionNotes.length < 5}
            >
              {isSubmitting ? 'Resolving...' : 'Mark Resolved'}
            </Button>
          </>
        }
      >
        <div className="mb-4 text-[13px] text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-200">
          Please provide details on how this violation was addressed or mitigated. This will be permanently logged for audit purposes.
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-700">Resolution Notes *</label>
          <textarea 
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            className="w-full border border-slate-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            rows={4}
            placeholder="Describe the actions taken to clear this violation..."
          />
        </div>
      </Modal>
    </div>
  );
}
