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
  FileJson,
  Download,
  Loader2,
  Check,
} from 'lucide-react';
import {
  REPORT_TYPES,
  EXPORT_FORMATS,
  exportCompliancePackage,
} from '../utils/complianceExport';

const TYPE_ICON = {
  'compliance-summary': ShieldCheck,
  'violations-report': AlertTriangle,
  'evidence-log': CheckCircle2,
  'audit-trail': History,
};

const FORMAT_ICON = {
  csv: Download,
  json: FileJson,
  txt: FileText,
};

export const GenerateReportModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedType, setSelectedType] = useState('audit-trail');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    if (!isOpen) {
      setDownloadSuccess(null);
      setLoadError('');
      return;
    }

    let mounted = true;
    const fetchEntities = async () => {
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
          setLoadError(err?.message || 'Failed to load compliance records.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchEntities();
    return () => { mounted = false; };
  }, [isOpen]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const cat = categories.find((c) => String(c.id) === String(selectedCategoryId));
      const { filename } = await exportCompliancePackage({
        reportType: selectedType,
        format: exportFormat,
        projectId: selectedProjectId,
        categoryId: selectedCategoryId,
        categoryName: cat?.name || 'All Domains',
        dateRange,
        data: { projects, tasks, rules, violations, evidence, auditLogs, users },
        user,
      });
      setDownloadSuccess(filename);
      toast.success(`Exported "${filename}" successfully!`);
    } catch (err) {
      toast.error(err?.message || 'Failed to export compliance package.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Compliance Package"
      className="max-w-2xl sm:max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500">
            {downloadSuccess ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Downloaded {downloadSuccess}
              </span>
            ) : (
              <span>Format: {exportFormat.toUpperCase()} · Live export</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} disabled={generating}>
              {downloadSuccess ? 'Close' : 'Cancel'}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || loading || Boolean(loadError)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Package
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
          <p className="text-sm">Loading compliance records…</p>
        </div>
      ) : loadError ? (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm" role="alert">
          {loadError}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Select Report Package Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REPORT_TYPES.map((type) => {
                const Icon = TYPE_ICON[type.id] || FileText;
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
                Compliance Domain
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setDownloadSuccess(null);
                }}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="all">All Compliance Domains</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
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
                {EXPORT_FORMATS.map((fmt) => {
                  const isFmtSelected = exportFormat === fmt.id;
                  const FmtIcon = FORMAT_ICON[fmt.id] || FileText;
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
