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
  History,
  Check,
  FileJson,
  Loader2,
} from 'lucide-react';
import {
  REPORT_TYPES,
  EXPORT_FORMATS,
  exportCompliancePackage,
} from '../utils/complianceExport';

const TYPE_STYLE = {
  'compliance-summary': { icon: ShieldCheck, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  'violations-report': { icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  'evidence-log': { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  'audit-trail': { icon: History, color: 'text-amber-600 bg-amber-50 border-amber-200' },
};

const FORMAT_ICON = {
  csv: Download,
  json: FileJson,
  txt: FileText,
};

export default function ComplianceReports() {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadedFileName, setDownloadedFileName] = useState('');

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedType, setSelectedType] = useState('compliance-summary');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sessionExports, setSessionExports] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const unwrap = (r) => (Array.isArray(r) ? r : r?.data || []);
        const [projRes, taskRes, catRes, rulesRes, violRes, evRes, logsRes, usersRes] = await Promise.all([
          apiClient('/projects'),
          apiClient('/tasks'),
          apiClient('/compliance-categories'),
          apiClient('/compliance-rules'),
          apiClient('/compliance-violations'),
          apiClient('/evidence'),
          apiClient('/audit-logs'),
          apiClient('/users'),
        ]);
        if (!mounted) return;
        setProjects(unwrap(projRes));
        setTasks(unwrap(taskRes));
        setCategories(unwrap(catRes));
        setRules(unwrap(rulesRes));
        setViolations(unwrap(violRes));
        setEvidence(unwrap(evRes));
        setAuditLogs(unwrap(logsRes));
        setUsers(unwrap(usersRes));
      } catch (err) {
        if (mounted) {
          const msg = err?.message || 'Failed to load compliance data for exports.';
          setLoadError(msg);
          toast.error(msg);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => { mounted = false; };
  }, []);

  const runExport = async (opts) => {
    setGenerating(true);
    try {
      const cat = categories.find((c) => String(c.id) === String(opts.categoryId));
      const { filename, scoped } = await exportCompliancePackage({
        ...opts,
        categoryName: cat?.name || 'All Domains',
        data: { projects, tasks, rules, violations, evidence, auditLogs, users },
        user,
      });
      const typeMeta = REPORT_TYPES.find((t) => t.id === opts.reportType) || REPORT_TYPES[0];
      setSessionExports((prev) => [
        {
          id: `exp_${Date.now()}`,
          title: `${typeMeta.name} — ${scoped.projectLabel}`,
          meta: `${filename} · ${cat?.name || 'All Domains'}`,
          format: opts.format.toUpperCase(),
          options: opts,
        },
        ...prev,
      ]);
      setDownloadedFileName(filename);
      setDownloadModalOpen(true);
      toast.success(`Exported "${filename}" successfully.`);
    } catch (err) {
      toast.error(err?.message || 'Failed to export compliance report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateReport = () => {
    runExport({
      reportType: selectedType,
      format: exportFormat,
      projectId: selectedProjectId,
      categoryId: selectedCategoryId,
      dateRange,
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Audit Trail</h1>
          <p className="mt-1 text-sm text-slate-500">
            Export live regulatory audit ledgers, violation CSVs, and evidence attestation packages.
          </p>
        </div>
      </header>

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

      {loadError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm" role="alert">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Export Compliance Package</h2>
              <p className="text-xs text-slate-500">Filter live database records and export to CSV, JSON, or TXT</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Select Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REPORT_TYPES.map((type) => {
                const style = TYPE_STYLE[type.id] || TYPE_STYLE['compliance-summary'];
                const Icon = style.icon;
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
                      <div className={`p-2 rounded-lg ${style.color}`}>
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
                Compliance Domain
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="all">All Compliance Domains</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {EXPORT_FORMATS.map((fmt) => {
                  const isFmtSelected = exportFormat === fmt.id;
                  const FmtIcon = FORMAT_ICON[fmt.id] || FileText;
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
                      <span className="text-[10px] text-slate-400">{fmt.desc}</span>
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
              disabled={generating || Boolean(loadError)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 shadow-sm"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting…</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Export Report</span>
                </>
              )}
            </Button>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Session Exports</h2>
              <p className="text-xs text-slate-500">Live records: {rules.length} rules · {violations.length} violations · {evidence.length} evidence</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Live DB
            </span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {sessionExports.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Select filters and click <strong>Export Report</strong> to download live audit data.
              </div>
            ) : (
              sessionExports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-slate-50/50 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{report.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{report.meta}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runExport(report.options)}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 py-1 px-2.5 rounded-md hover:bg-blue-50 shrink-0"
                  >
                    <Download size={13} />
                    <span>{report.format}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        title="Export Completed"
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
