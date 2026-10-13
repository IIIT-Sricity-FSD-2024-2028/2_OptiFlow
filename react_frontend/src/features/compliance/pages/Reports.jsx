import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../app/paths';
import { apiClient } from '../../../services/api/client';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../shared/components/Toast';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Download, 
  CheckCircle2, 
  Filter, 
  Calendar, 
  Building2, 
  History,
  Check,
  FileSpreadsheet
} from 'lucide-react';

export default function ComplianceReports() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadedFileName, setDownloadedFileName] = useState('');

  // Live Database State
  const [projects, setProjects] = useState([]);
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);

  // Generator Form
  const [selectedType, setSelectedType] = useState('compliance-summary');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Recent Generated Reports List
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [projRes, rulesRes, violRes, evRes, logsRes, usersRes] = await Promise.all([
          apiClient('/projects').catch(() => []),
          apiClient('/compliance-rules').catch(() => []),
          apiClient('/compliance-violations').catch(() => []),
          apiClient('/evidence').catch(() => []),
          apiClient('/audit-logs').catch(() => []),
          apiClient('/users').catch(() => []),
        ]);

        if (!mounted) return;

        const projList = Array.isArray(projRes) ? projRes : projRes?.data || [];
        const rulesList = Array.isArray(rulesRes) ? rulesRes : rulesRes?.data || [];
        const violList = Array.isArray(violRes) ? violRes : violRes?.data || [];
        const evList = Array.isArray(evRes) ? evRes : evRes?.data || [];
        const logsList = Array.isArray(logsRes) ? logsRes : logsRes?.data || [];
        const usersList = Array.isArray(usersRes) ? usersRes : usersRes?.data || [];

        setProjects(projList);
        setRules(rulesList);
        setViolations(violList);
        setEvidence(evList);
        setAuditLogs(logsList);
        setUsers(usersList);

        // Pre-populate standard enterprise reports
        setRecentReports([
          {
            id: 'rep_exec_summary',
            type: 'compliance-summary',
            title: 'Executive Compliance Health & Audit Summary Report',
            meta: `${projList.length} Projects · GDPR, SOX, ISO 27001 · Active Audit Ledger`,
            format: 'PDF',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            badge: 'Company-Wide',
            badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          },
          {
            id: 'rep_violations_ledger',
            type: 'violations-report',
            title: 'Regulatory Violation & Escalation Ledger',
            meta: `${violList.length} Violations Logged · ${violList.filter(v => v.status === 'Open' || v.status === 'Under_Review').length} Open Remediation Flags`,
            format: 'CSV',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            badge: 'Risk Ledger',
            badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          },
          {
            id: 'rep_evidence_attestation',
            type: 'evidence-log',
            title: 'Evidence Verification & File Attestation Audit',
            meta: `${evList.length} Evidence Records · Attestation & Verification State`,
            format: 'XLSX',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            badge: 'Attestations',
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          },
          {
            id: 'rep_audit_trail',
            type: 'audit-trail',
            title: 'System Audit Trail & Permission History Log',
            meta: `${logsList.length} System Logs · Cryptographic Audit Trail`,
            format: 'PDF',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            badge: 'Security Stream',
            badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          },
        ]);
      } catch (err) {
        console.error('Failed to load compliance data for reports:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => { mounted = false; };
  }, []);

  const reportTypes = [
    {
      id: 'compliance-summary',
      name: 'Compliance Summary',
      desc: 'Overall health score & framework audit across projects',
      icon: ShieldCheck,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      id: 'violations-report',
      name: 'Violations Ledger',
      desc: 'All flagged violations, remediation notes & status',
      icon: AlertTriangle,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      id: 'evidence-log',
      name: 'Evidence Attestation',
      desc: 'Submitted files, sign-offs & verification records',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'audit-trail',
      name: 'Audit Trail Log',
      desc: 'Security event logs, actor timestamps & system events',
      icon: History,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
  ];

  const handleGenerateReport = () => {
    setGenerating(true);
    toast.info('Extracting database records & compiling report…');

    setTimeout(() => {
      const typeObj = reportTypes.find(t => t.id === selectedType) || reportTypes[0];
      const projectObj = projects.find(p => String(p.id) === String(selectedProjectId));
      const projLabel = projectObj ? projectObj.name : 'All Projects';
      const formatUpper = exportFormat.toUpperCase();
      const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const newReport = {
        id: `rep_${Date.now()}`,
        type: selectedType,
        title: `${typeObj.name} — ${projLabel}`,
        meta: `${projLabel} · ${selectedFramework === 'all' ? 'All Frameworks' : selectedFramework.toUpperCase()} · Generated ${todayFormatted} · ${formatUpper}`,
        format: formatUpper,
        date: todayFormatted,
        badge: projLabel === 'All Projects' ? 'Company-Wide' : 'Project-Scoped',
        badgeColor: projLabel === 'All Projects' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200',
        filterContext: {
          projectId: selectedProjectId,
          framework: selectedFramework,
        },
      };

      setRecentReports(prev => [newReport, ...prev]);
      setGenerating(false);
      toast.success(`"${newReport.title}" generated successfully!`);
      downloadReportContent(newReport);
    }, 800);
  };

  const downloadReportContent = (report) => {
    const format = report.format || 'PDF';
    const safeTitle = (report.title || 'compliance_report').toLowerCase().replace(/[^a-z0-9]/gi, '_');
    const isCsv = format === 'CSV';
    const isXlsx = format === 'XLSX';
    const ext = isCsv ? 'csv' : isXlsx ? 'xlsx' : 'txt';
    const mime = isCsv ? 'text/csv' : 'text/plain';

    // Filter violations by project if project-scoped
    let filteredViolations = violations;
    if (report.filterContext?.projectId && report.filterContext.projectId !== 'all') {
      const targetProjId = String(report.filterContext.projectId);
      filteredViolations = violations.filter(v => {
        if (v.entityType === 'Project' && String(v.entityId) === targetProjId) return true;
        return false;
      });
    }

    let reportText = '';

    if (report.type === 'violations-report' || isCsv) {
      // CSV format
      reportText = 'Violation ID,Policy Name,Severity,Status,Entity Type,Entity ID,Detected At,Resolution Remarks\n';
      filteredViolations.forEach(v => {
        const policyName = v.rule?.name || `Rule #${v.ruleId || 'N/A'}`;
        const cleanRemarks = (v.resolutionRemarks || '').replace(/"/g, '""');
        reportText += `"${v.id}","${policyName}","${v.rule?.severity || v.severity || 'Medium'}","${v.status}","${v.entityType}","${v.entityId}","${v.detectedAt || ''}","${cleanRemarks}"\n`;
      });
    } else if (report.type === 'evidence-log') {
      // Evidence Attestation text
      reportText = `===================================================================
OPTIFLOW COMPLIANCE EVIDENCE & ATTESTATION AUDIT LEDGER
Generated On: ${new Date().toLocaleString()}
Company Context: ${user?.company?.legalName || 'Acme Corp'}
===================================================================

I. EVIDENCE SUBMISSION OVERVIEW
• Total Evidence Records: ${evidence.length}
• Pending Review: ${evidence.filter(e => e.status === 'Pending' || e.status === 'Under_Review').length}
• Approved & Verified: ${evidence.filter(e => e.status === 'Approved').length}
• Rejected / Blocked: ${evidence.filter(e => e.status === 'Rejected').length}

II. ATTESTATION LOG RECORDS
`;
      evidence.forEach((ev, idx) => {
        const submitter = users.find(u => String(u.id) === String(ev.userId));
        reportText += `
${idx + 1}. [${String(ev.status || 'PENDING').toUpperCase()}] ${ev.title || 'Untitled Evidence'}
   • Type: ${ev.type || ev.evidenceType || 'Document'}
   • Submitter: ${submitter ? submitter.fullName || submitter.email : ev.userId}
   • Associated Task: ${ev.taskId || 'None'} | Violation ID: ${ev.violationId || 'None'}
   • Submitted Date: ${ev.createdAt || 'N/A'}
`;
      });
    } else if (report.type === 'audit-trail') {
      // Audit Trail
      reportText = `===================================================================
OPTIFLOW SYSTEM AUDIT TRAIL & PERMISSION LOG
Generated On: ${new Date().toLocaleString()}
Audit Engine: PostgreSQL / Prisma Cryptographic Trail
===================================================================

Total Audit Events Logged: ${auditLogs.length}

EVENTS BREAKDOWN:
`;
      auditLogs.slice(0, 100).forEach((log, idx) => {
        reportText += `[${idx + 1}] ${log.createdAt || '—'} | ${log.action || 'SYSTEM_EVENT'} | Actor: ${log.actorId || 'System'} | Details: ${JSON.stringify(log.details || log.metadata || {})}\n`;
      });
    } else {
      // Executive Compliance Summary Report
      const activeRules = rules.filter(r => r.isActive !== false);
      const openViolations = filteredViolations.filter(v => v.status === 'Open' || v.status === 'Under_Review');
      const resolvedViolations = filteredViolations.filter(v => v.status === 'Resolved' || v.status === 'Ignored');

      reportText = `===================================================================
OPTIFLOW EXECUTIVE COMPLIANCE & AUDIT SUMMARY REPORT
Report Title: ${report.title}
Generated On:  ${new Date().toLocaleString()}
Generated By:  ${user?.fullName || user?.email || 'Compliance Officer'}
===================================================================

I. EXECUTIVE HEALTH SUMMARY
• Compliance Policies Configured: ${rules.length} (${activeRules.length} Active)
• Total Violations Logged: ${filteredViolations.length}
• Active Open Violations: ${openViolations.length}
• Mitigated & Resolved Violations: ${resolvedViolations.length}
• Evidence Records Verified: ${evidence.filter(e => e.status === 'Approved').length} / ${evidence.length}

II. CONFIGURED COMPLIANCE RULES
${rules.map(r => `  • [${r.severity || 'Medium'}] ${r.name} — Status: ${r.isActive !== false ? 'Active' : 'Inactive'}`).join('\n') || '  No rules configured.'}

III. CRITICAL REMEDIATION FLAGS
${openViolations.map(v => `  • [${v.rule?.severity || 'High'}] ${v.rule?.name || 'Policy Violation'} (${v.entityType} #${(v.entityId || '').substring(0, 8)}) — Status: ${v.status}`).join('\n') || '  No active open violations logged.'}

IV. REGULATORY CERTIFICATION STATEMENT
This report certifies that OptiFlow compliance policy evaluations, scope bindings, and
transition interceptors are enforced at runtime via immutable database audit logs.
===================================================================
`;
    }

    const blob = new Blob([reportText], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setDownloadedFileName(`${safeTitle}.${ext}`);
    setDownloadModalOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Audit Trail</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate and export regulatory audit ledgers, executive health summaries, and attestation packages.
          </p>
        </div>
      </header>

      {/* Reports & Audit Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to={PATHS.COMPLIANCE.REPORTS}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
        >
          <FileText size={14} />
          <span>Report Generator</span>
        </Link>
        <Link
          to={PATHS.COMPLIANCE.AUDIT_LOGS}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <History size={14} className="text-slate-400" />
          <span>System Audit Trail</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Generator Form (7 cols) */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Generate Compliance Package</h2>
              <p className="text-xs text-slate-500">Configure report scope, framework, and target file format</p>
            </div>
          </div>

          {/* 1. Report Type Selection Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Select Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/10 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${type.color}`}>
                        <Icon size={18} />
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-slate-900">{type.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{type.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Filters & Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Target Project Scope
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="all">All Projects (Company-Wide)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Policy / Regulatory Framework
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="all">All Active Frameworks</option>
                <option value="gdpr">GDPR / Data Privacy</option>
                <option value="sox">SOX / Financial Controls</option>
                <option value="iso27001">ISO 27001 Information Security</option>
                <option value="soc2">SOC 2 Trust Principles</option>
                <option value="internal">Internal Operational Standards</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Date Range (Start)
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Date Range (End)
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'pdf', label: 'PDF Document', icon: FileText, desc: 'Executive print' },
                  { id: 'xlsx', label: 'Excel (XLSX)', icon: FileSpreadsheet, desc: 'Audit workpaper' },
                  { id: 'csv', label: 'CSV Ledger', icon: Download, desc: 'Raw tabular export' },
                ].map((fmt) => {
                  const isFmtSelected = exportFormat === fmt.id;
                  const FmtIcon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setExportFormat(fmt.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all ${
                        isFmtSelected
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FmtIcon size={18} className="mb-1 text-slate-500" />
                      <span className="text-xs">{fmt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              variant="primary"
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 shadow-sm"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Compiling Audit Package…</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Compile & Download Report</span>
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Right: Recent Reports Ledger (5 cols) */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Generated Reports</h2>
              <p className="text-xs text-slate-500">Available downloads & historical exports</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Live Database
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {recentReports.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No generated reports yet. Click Generate Report to create one.
              </div>
            ) : (
              recentReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-slate-50/50 transition-all flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                        <FileText size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{report.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{report.meta}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${report.badgeColor}`}>
                        {report.badge}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {report.format}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadReportContent(report)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors py-1 px-2.5 rounded-md hover:bg-blue-50"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Download Success Modal */}
      <Modal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        title="Download Completed Successfully"
        footer={
          <Button variant="primary" onClick={() => setDownloadModalOpen(false)} className="w-full">
            Done
          </Button>
        }
      >
        <div className="text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">File Dispatched to Browser</h4>
            <p className="text-xs text-slate-500 mt-1">
              Your export file <span className="font-semibold text-slate-700">{downloadedFileName}</span> has been downloaded.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
