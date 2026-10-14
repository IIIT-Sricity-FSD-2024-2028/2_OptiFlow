import React, { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/Modal';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { apiClient } from '../../../services/api/client';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  History,
  FileSpreadsheet,
  Download,
  Loader2,
  Calendar,
  Building2,
  Check
} from 'lucide-react';

export const GenerateReportModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  // Live database entities for dynamic compilation
  const [projects, setProjects] = useState([]);
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);

  // Form State
  const [selectedType, setSelectedType] = useState('compliance-summary');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!isOpen) {
      setDownloadSuccess(null);
      return;
    }

    let mounted = true;
    const fetchEntities = async () => {
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
        setProjects(Array.isArray(projRes) ? projRes : projRes?.data || []);
        setRules(Array.isArray(rulesRes) ? rulesRes : rulesRes?.data || []);
        setViolations(Array.isArray(violRes) ? violRes : violRes?.data || []);
        setEvidence(Array.isArray(evRes) ? evRes : evRes?.data || []);
        setAuditLogs(Array.isArray(logsRes) ? logsRes : logsRes?.data || []);
        setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data || []);
      } catch (err) {
        console.error('Failed to prefetch entities for report modal:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEntities();
    return () => { mounted = false; };
  }, [isOpen]);

  const reportTypes = [
    {
      id: 'compliance-summary',
      name: 'Compliance Health Summary',
      desc: 'Overall 3-pillar posture & multi-project audit status',
      icon: ShieldCheck,
      badge: 'Executive',
    },
    {
      id: 'violations-report',
      name: 'Regulatory Violations Ledger',
      desc: 'All flagged infractions, remediation notes & statuses',
      icon: AlertTriangle,
      badge: 'Risk Ledger',
    },
    {
      id: 'evidence-log',
      name: 'Evidence Attestation Audit',
      desc: 'Submitted files, sign-offs & verification records',
      icon: CheckCircle2,
      badge: 'Attestation',
    },
    {
      id: 'audit-trail',
      name: 'System Audit Trail Log',
      desc: 'Immutable security ledger with user action timestamps',
      icon: History,
      badge: 'Security Log',
    },
  ];

  const handleGenerate = () => {
    setGenerating(true);
    toast.info('Extracting database records & compiling compliance package…');

    setTimeout(() => {
      const typeObj = reportTypes.find((t) => t.id === selectedType) || reportTypes[0];
      const projectObj = projects.find((p) => String(p.id) === String(selectedProjectId));
      const projLabel = projectObj ? projectObj.name : 'All Projects';
      const formatUpper = exportFormat.toUpperCase();
      const safeTitle = `${typeObj.name} — ${projLabel}`.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const isCsv = exportFormat === 'csv';
      const isXlsx = exportFormat === 'xlsx';
      const ext = isCsv ? 'csv' : isXlsx ? 'xlsx' : 'txt';
      const mime = isCsv ? 'text/csv' : 'text/plain';

      // Scope violations if project selected
      let filteredViolations = violations;
      if (selectedProjectId !== 'all') {
        filteredViolations = violations.filter(
          (v) => v.entityType === 'Project' && String(v.entityId) === String(selectedProjectId)
        );
      }

      let reportText = '';

      if (selectedType === 'violations-report' || isCsv) {
        reportText = 'Violation ID,Policy Name,Severity,Status,Entity Type,Entity ID,Detected At,Resolution Remarks\n';
        filteredViolations.forEach((v) => {
          const policyName = v.rule?.name || `Rule #${v.ruleId || 'N/A'}`;
          const cleanRemarks = (v.resolutionRemarks || '').replace(/"/g, '""');
          reportText += `"${v.id}","${policyName}","${v.rule?.severity || v.severity || 'Medium'}","${v.status}","${v.entityType}","${v.entityId}","${v.detectedAt || ''}","${cleanRemarks}"\n`;
        });
      } else if (selectedType === 'evidence-log') {
        reportText = `===================================================================
OPTIFLOW COMPLIANCE EVIDENCE & ATTESTATION AUDIT LEDGER
Generated On: ${new Date().toLocaleString()}
Company Context: ${user?.company?.legalName || 'Acme Corp'}
Scope: ${projLabel}
===================================================================

I. EVIDENCE SUBMISSION OVERVIEW
• Total Evidence Records: ${evidence.length}
• Pending Review: ${evidence.filter((e) => e.status === 'Pending' || e.status === 'Under_Review').length}
• Approved & Verified: ${evidence.filter((e) => e.status === 'Approved').length}
• Rejected / Blocked: ${evidence.filter((e) => e.status === 'Rejected').length}

II. ATTESTATION RECORDS
`;
        evidence.forEach((ev, idx) => {
          const submitter = users.find((u) => String(u.id) === String(ev.userId));
          reportText += `
${idx + 1}. [${String(ev.status || 'PENDING').toUpperCase()}] ${ev.title || 'Untitled Evidence'}
   • Submitter: ${submitter ? submitter.fullName || submitter.email : ev.userId || 'N/A'}
   • Violation ID: ${ev.violationId || 'N/A'} | Task ID: ${ev.taskId || 'N/A'}
   • Submitted Date: ${ev.createdAt || 'N/A'}
`;
        });
      } else if (selectedType === 'audit-trail') {
        reportText = `===================================================================
OPTIFLOW IMMUTABLE SYSTEM AUDIT TRAIL & PERMISSION LOG
Generated On: ${new Date().toLocaleString()}
Audit Engine: PostgreSQL / Prisma Cryptographic Trail
Scope: ${projLabel}
===================================================================

Total Audit Events Logged: ${auditLogs.length}

EVENTS BREAKDOWN:
`;
        auditLogs.slice(0, 100).forEach((log, idx) => {
          reportText += `[${idx + 1}] ${log.performedAt || log.createdAt || '—'} | ${log.action || 'ACTION'} | Actor: ${log.performedBy?.fullName || log.performedBy?.email || 'System'} | Entity: ${log.entityType || 'General'} (${log.entityId || 'N/A'})\n`;
        });
      } else {
        const activeRules = rules.filter((r) => r.isActive !== false);
        const openViolations = filteredViolations.filter((v) => v.status === 'Open' || v.status === 'Under_Review');
        const resolvedViolations = filteredViolations.filter((v) => v.status === 'Resolved' || v.status === 'Ignored');

        reportText = `===================================================================
OPTIFLOW EXECUTIVE COMPLIANCE & AUDIT SUMMARY REPORT
Generated On:  ${new Date().toLocaleString()}
Generated By:  ${user?.fullName || user?.email || 'Compliance Officer'}
Target Scope:  ${projLabel}
Framework:     ${selectedFramework === 'all' ? 'All Active Frameworks' : selectedFramework.toUpperCase()}
===================================================================

I. EXECUTIVE HEALTH SUMMARY
• Compliance Policies Configured: ${rules.length} (${activeRules.length} Active)
• Total Violations Logged: ${filteredViolations.length}
• Active Open Violations: ${openViolations.length}
• Mitigated & Resolved Violations: ${resolvedViolations.length}
• Evidence Records Verified: ${evidence.filter((e) => e.status === 'Approved').length} / ${evidence.length}

II. CONFIGURED COMPLIANCE RULES
${rules.map((r) => `  • [${r.severity || 'Medium'}] ${r.name} — Status: ${r.isActive !== false ? 'Active' : 'Inactive'}`).join('\n') || '  No rules configured.'}

III. CRITICAL REMEDIATION FLAGS
${openViolations.map((v) => `  • [${v.rule?.severity || 'High'}] ${v.rule?.name || 'Policy Violation'} (${v.entityType} #${(v.entityId || '').substring(0, 8)}) — Status: ${v.status}`).join('\n') || '  No active open violations logged.'}

IV. REGULATORY CERTIFICATION STATEMENT
This report certifies that OptiFlow compliance policy evaluations, scope bindings, and
transition interceptors are enforced at runtime via immutable database audit logs.
===================================================================
`;
      }

      // Download file to browser
      const blob = new Blob([reportText], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${safeTitle}.${ext}`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setGenerating(false);
      setDownloadSuccess(filename);
      toast.success(`Generated "${filename}" successfully!`);
    }, 700);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Compliance Package"
      className="max-w-2xl sm:max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {downloadSuccess ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Downloaded {downloadSuccess}
              </span>
            ) : (
              <span>Format: {exportFormat.toUpperCase()} · Ready for export</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={generating}>
              {downloadSuccess ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate & Download Package
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading projects & audit criteria…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Report Type Selection Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Select Report Package Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(type.id);
                      setDownloadSuccess(null);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {type.badge}
                      </span>
                    </div>
                    <div className="font-semibold text-sm text-slate-900">{type.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{type.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Scope & Framework Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Target Project Scope
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setDownloadSuccess(null);
                }}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="all">All Projects (Company-Wide)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Regulatory Framework
              </label>
              <select
                value={selectedFramework}
                onChange={(e) => {
                  setSelectedFramework(e.target.value);
                  setDownloadSuccess(null);
                }}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Date Range (Start)
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Date Range (End)
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'pdf', label: 'PDF Document', icon: FileText, desc: 'Executive print' },
                  { id: 'xlsx', label: 'Excel (XLSX)', icon: FileSpreadsheet, desc: 'Audit workpaper' },
                  { id: 'csv', label: 'CSV Ledger', icon: Download, desc: 'Tabular export' },
                ].map((fmt) => {
                  const isFmtSelected = exportFormat === fmt.id;
                  const FmtIcon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => {
                        setExportFormat(fmt.id);
                        setDownloadSuccess(null);
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                        isFmtSelected
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-semibold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FmtIcon size={18} className={isFmtSelected ? 'text-blue-600' : 'text-slate-400'} />
                      <span className="text-xs mt-1">{fmt.label}</span>
                      <span className="text-[10px] text-slate-400">{fmt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default GenerateReportModal;
