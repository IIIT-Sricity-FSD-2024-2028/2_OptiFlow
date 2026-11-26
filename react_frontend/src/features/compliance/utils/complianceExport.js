import { buildUrl } from '../../../services/api/client';
import { getToken } from '../../../services/auth/session';
import * as evidenceApi from '../../../services/api/evidence';
import { downloadBlob } from '../../../shared/utils/downloadBlob';

export const REPORT_TYPES = [
  {
    id: 'compliance-summary',
    name: 'Compliance Summary',
    desc: 'Overall posture, rules, and violations across selected scopes',
    badge: 'Executive',
  },
  {
    id: 'violations-report',
    name: 'Violations Ledger',
    desc: 'Flagged violations, SLA states, and remediation remarks',
    badge: 'Risk Ledger',
  },
  {
    id: 'evidence-log',
    name: 'Evidence Attestation',
    desc: 'Submitted files, review decisions, and verification records',
    badge: 'Attestations',
  },
  {
    id: 'audit-trail',
    name: 'Audit Trail Log',
    desc: 'Immutable compliance event logs and actor timestamps',
    badge: 'Security Stream',
  },
];

export const EXPORT_FORMATS = [
  { id: 'csv', label: 'CSV Ledger', ext: 'csv', mime: 'text/csv;charset=utf-8', desc: 'Tabular audit export' },
  { id: 'json', label: 'JSON Package', ext: 'json', mime: 'application/json;charset=utf-8', desc: 'Structured data' },
  { id: 'txt', label: 'Text Summary', ext: 'txt', mime: 'text/plain;charset=utf-8', desc: 'Readable report' },
];

const csvCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
const csvRow = (cells) => cells.map(csvCell).join(',');

const inDateRange = (rawDate, dateRange) => {
  if (!dateRange?.start && !dateRange?.end) return true;
  if (!rawDate) return true;
  const day = String(rawDate).slice(0, 10);
  if (dateRange.start && day < dateRange.start) return false;
  if (dateRange.end && day > dateRange.end) return false;
  return true;
};

async function fetchBackendCsv(endpoint) {
  const token = getToken();
  const res = await fetch(buildUrl(endpoint), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || contentType.includes('text/html')) {
    throw new Error('Failed to export audit CSV from server');
  }
  return res.blob();
}

/**
 * Filters violations, evidence, rules, and audit logs by project, category, and date range.
 */
export function filterComplianceDataset({
  projects = [],
  tasks = [],
  rules = [],
  violations = [],
  evidence = [],
  auditLogs = [],
  projectId = 'all',
  categoryId = 'all',
  dateRange = {},
}) {
  const taskProjectMap = new Map(
    tasks.map((t) => [String(t.id), String(t.projectId || t.project?.id || '')])
  );
  const targetProjId = projectId !== 'all' ? String(projectId) : null;
  const targetCatId = categoryId !== 'all' ? String(categoryId) : null;

  const filteredRules = rules.filter((r) => {
    if (targetCatId && String(r.categoryId || r.category?.id || '') !== targetCatId) return false;
    return true;
  });

  const filteredViolations = violations.filter((v) => {
    if (!inDateRange(v.detectedAt, dateRange)) return false;
    if (targetCatId) {
      const vCat = String(v.rule?.categoryId || v.rule?.category?.id || '');
      if (vCat !== targetCatId) return false;
    }
    if (targetProjId) {
      const directProj = v.entityType === 'Project' && String(v.entityId) === targetProjId;
      const taskProj = v.entityType === 'Task' && taskProjectMap.get(String(v.entityId)) === targetProjId;
      if (!directProj && !taskProj) return false;
    }
    return true;
  });

  const violationIds = new Set(filteredViolations.map((v) => String(v.id)));
  const filteredEvidence = evidence.filter((ev) => {
    if (!inDateRange(ev.submittedAt || ev.createdAt, dateRange)) return false;
    if (targetProjId) {
      const taskProj = ev.taskId ? taskProjectMap.get(String(ev.taskId)) === targetProjId : false;
      const viaViolation = ev.violationId ? violationIds.has(String(ev.violationId)) : false;
      if (!taskProj && !viaViolation) return false;
    }
    return true;
  });

  const ruleIds = new Set(filteredRules.map((r) => String(r.id)));
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!inDateRange(log.performedAt || log.createdAt, dateRange)) return false;
    if (targetCatId && log.ruleId && !ruleIds.has(String(log.ruleId))) return false;
    return true;
  });

  const projectObj = targetProjId ? projects.find((p) => String(p.id) === targetProjId) : null;

  return {
    projectLabel: projectObj?.name || 'All Projects',
    rules: filteredRules,
    violations: filteredViolations,
    evidence: filteredEvidence,
    auditLogs: filteredAuditLogs,
  };
}

/**
 * Generates and downloads a real compliance export (CSV, JSON, or TXT).
 * Unfiltered Violations / Evidence CSV exports stream directly from the backend CSV endpoints.
 */
export async function exportCompliancePackage({
  reportType = 'compliance-summary',
  format = 'csv',
  projectId = 'all',
  categoryId = 'all',
  categoryName = 'All Domains',
  dateRange = {},
  data = {},
  user = null,
}) {
  const fmt = EXPORT_FORMATS.find((f) => f.id === format) || EXPORT_FORMATS[0];
  const typeMeta = REPORT_TYPES.find((t) => t.id === reportType) || REPORT_TYPES[0];
  const scoped = filterComplianceDataset({ ...data, projectId, categoryId, dateRange });
  const slug = `${typeMeta.id}_${scoped.projectLabel}_${new Date().toISOString().slice(0, 10)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  const filename = `${slug}.${fmt.ext}`;

  const isUnfilteredAll =
    projectId === 'all' &&
    categoryId === 'all' &&
    !dateRange?.start &&
    !dateRange?.end;

  if (fmt.id === 'csv' && isUnfilteredAll && reportType === 'violations-report') {
    const blob = await fetchBackendCsv('/compliance-violations/export/csv');
    downloadBlob(blob, filename);
    return { filename, format: fmt.id, scoped };
  }

  if (fmt.id === 'csv' && isUnfilteredAll && reportType === 'evidence-log') {
    const blob = await evidenceApi.exportCsv();
    downloadBlob(blob, filename);
    return { filename, format: fmt.id, scoped };
  }

  const users = data.users || [];
  const companyName = user?.company?.legalName || user?.companyName || 'Organization';
  const generatedBy = user?.fullName || user?.email || 'Compliance Officer';
  let content = '';

  if (fmt.id === 'json') {
    content = JSON.stringify(
      {
        reportType: typeMeta.name,
        company: companyName,
        generatedBy,
        generatedAt: new Date().toISOString(),
        filters: {
          project: scoped.projectLabel,
          domain: categoryName,
          dateRange,
        },
        summary: {
          rulesCount: scoped.rules.length,
          activeRulesCount: scoped.rules.filter((r) => r.isActive !== false).length,
          violationsCount: scoped.violations.length,
          openViolationsCount: scoped.violations.filter((v) => ['Open', 'Under_Review'].includes(v.status)).length,
          evidenceCount: scoped.evidence.length,
          approvedEvidenceCount: scoped.evidence.filter((e) => e.status === 'Approved').length,
          auditLogsCount: scoped.auditLogs.length,
        },
        ...(reportType === 'violations-report' || reportType === 'compliance-summary' ? { violations: scoped.violations } : {}),
        ...(reportType === 'evidence-log' || reportType === 'compliance-summary' ? { evidence: scoped.evidence } : {}),
        ...(reportType === 'audit-trail' ? { auditLogs: scoped.auditLogs } : {}),
        ...(reportType === 'compliance-summary' ? { rules: scoped.rules } : {}),
      },
      null,
      2
    );
  } else if (fmt.id === 'csv') {
    if (reportType === 'evidence-log') {
      const header = csvRow(['Evidence ID', 'Title', 'Type', 'Status', 'Submitter', 'Task ID', 'Violation ID', 'Submitted At', 'Notes']);
      const rows = scoped.evidence.map((ev) => {
        const submitter = users.find((u) => String(u.id) === String(ev.userId));
        return csvRow([
          ev.id,
          ev.title,
          ev.evidenceType || 'Document',
          ev.status,
          submitter?.fullName || submitter?.email || ev.userId || '',
          ev.taskId || '',
          ev.violationId || '',
          ev.submittedAt || ev.createdAt || '',
          ev.notes || '',
        ]);
      });
      content = [header, ...rows].join('\n');
    } else if (reportType === 'audit-trail') {
      const header = csvRow(['Audit ID', 'Timestamp', 'Action', 'Actor', 'Entity Type', 'Entity ID', 'New Value']);
      const rows = scoped.auditLogs.map((log) => csvRow([
        log.id,
        log.performedAt || '',
        log.action || '',
        log.performedBy?.fullName || log.performedBy?.email || 'System',
        log.entityType || '',
        log.entityId || '',
        log.newValue ? JSON.stringify(log.newValue) : '',
      ]));
      content = [header, ...rows].join('\n');
    } else {
      const header = csvRow(['Violation ID', 'Policy Name', 'Severity', 'Status', 'Entity Type', 'Entity Name/ID', 'Detected At', 'Due Date', 'Resolution Remarks']);
      const rows = scoped.violations.map((v) => csvRow([
        v.id,
        v.rule?.name || v.ruleId || '',
        v.rule?.severity || v.severity || 'Medium',
        v.status,
        v.entityType,
        v.entityName || v.entityId,
        v.detectedAt || '',
        v.dueDate || '',
        v.resolutionRemarks || '',
      ]));
      content = [header, ...rows].join('\n');
    }
  } else {
    const activeRules = scoped.rules.filter((r) => r.isActive !== false);
    const openViolations = scoped.violations.filter((v) => ['Open', 'Under_Review'].includes(v.status));
    const resolvedViolations = scoped.violations.filter((v) => ['Resolved', 'Ignored'].includes(v.status));

    if (reportType === 'evidence-log') {
      const lines = scoped.evidence.map((ev, idx) => {
        const submitter = users.find((u) => String(u.id) === String(ev.userId));
        return `${idx + 1}. [${String(ev.status || 'Pending').toUpperCase()}] ${ev.title || 'Untitled'}\n   Type: ${ev.evidenceType || 'Document'} | Submitter: ${submitter?.fullName || submitter?.email || ev.userId || 'N/A'} | Submitted: ${ev.submittedAt || ev.createdAt || 'N/A'}`;
      });
      content = [
        'OPTIFLOW COMPLIANCE EVIDENCE & ATTESTATION REPORT',
        `Company: ${companyName} | Scope: ${scoped.projectLabel} | Generated: ${new Date().toLocaleString()}`,
        `Total: ${scoped.evidence.length} | Approved: ${scoped.evidence.filter((e) => e.status === 'Approved').length} | Rejected: ${scoped.evidence.filter((e) => e.status === 'Rejected').length}`,
        '',
        ...(lines.length ? lines : ['No evidence records match the selected filters.']),
      ].join('\n');
    } else if (reportType === 'audit-trail') {
      const lines = scoped.auditLogs.map((log, idx) =>
        `[${idx + 1}] ${log.performedAt || '—'} | ${log.action || 'EVENT'} | Actor: ${log.performedBy?.fullName || log.performedBy?.email || 'System'} | ${log.entityType || 'Entity'}: ${log.entityName || log.entityId || 'N/A'} | ${JSON.stringify(log.newValue || {})}`
      );
      content = [
        'OPTIFLOW COMPLIANCE AUDIT TRAIL',
        `Company: ${companyName} | Scope: ${scoped.projectLabel} | Generated: ${new Date().toLocaleString()}`,
        `Total Events: ${scoped.auditLogs.length}`,
        '',
        ...(lines.length ? lines : ['No audit events match the selected filters.']),
      ].join('\n');
    } else {
      content = [
        `OPTIFLOW ${typeMeta.name.toUpperCase()}`,
        `Company: ${companyName} | Generated By: ${generatedBy}`,
        `Scope: ${scoped.projectLabel} | Domain: ${categoryName} | Range: ${dateRange.start || 'Start'} to ${dateRange.end || 'Present'}`,
        '',
        'SUMMARY METRICS',
        `- Configured Rules: ${scoped.rules.length} (${activeRules.length} Active)`,
        `- Violations: ${scoped.violations.length} (${openViolations.length} Open/Under Review, ${resolvedViolations.length} Resolved/Ignored)`,
        `- Verified Evidence: ${scoped.evidence.filter((e) => e.status === 'Approved').length} / ${scoped.evidence.length}`,
        '',
        'ACTIVE RULES',
        ...(scoped.rules.map((r) => `- [${r.severity || 'Medium'}] ${r.name} (${r.isActive !== false ? 'Active' : 'Inactive'})`)),
        '',
        'OPEN VIOLATIONS',
        ...(openViolations.length
          ? openViolations.map((v) => `- [${v.rule?.severity || v.severity || 'Medium'}] ${v.rule?.name || 'Policy'} | ${v.entityName || v.entityId} | ${v.status}`)
          : ['- None']),
      ].join('\n');
    }
  }

  downloadBlob(new Blob([content], { type: fmt.mime }), filename);
  return { filename, format: fmt.id, scoped };
}
