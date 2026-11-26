import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { filterComplianceDataset, exportCompliancePackage } from './complianceExport';
import * as evidenceApi from '../../../services/api/evidence';
import { downloadBlob } from '../../../shared/utils/downloadBlob';

vi.mock('../../../services/api/client', () => ({
  buildUrl: (endpoint) => `http://localhost:5000/api${endpoint}`,
}));

vi.mock('../../../services/auth/session', () => ({
  getToken: () => 'mock-jwt-token',
}));

vi.mock('../../../services/api/evidence', () => ({
  exportCsv: vi.fn(),
}));

vi.mock('../../../shared/utils/downloadBlob', () => ({
  downloadBlob: vi.fn(),
}));

const sampleData = {
  projects: [
    { id: 'proj-1', name: 'Alpha Platform' },
    { id: 'proj-2', name: 'Beta Migration' },
  ],
  tasks: [
    { id: 'task-1', projectId: 'proj-1' },
    { id: 'task-2', projectId: 'proj-2' },
  ],
  rules: [
    { id: 'rule-1', name: 'SOC2 Encryption', categoryId: 'cat-sec', severity: 'High', isActive: true },
    { id: 'rule-2', name: 'GDPR Retention', categoryId: 'cat-priv', severity: 'Medium', isActive: true },
  ],
  violations: [
    {
      id: 'viol-1',
      ruleId: 'rule-1',
      rule: { id: 'rule-1', name: 'SOC2 Encryption', categoryId: 'cat-sec', severity: 'High' },
      entityType: 'Task',
      entityId: 'task-1',
      entityName: 'Task One',
      status: 'Open',
      detectedAt: '2026-11-10T10:00:00.000Z',
    },
    {
      id: 'viol-2',
      ruleId: 'rule-2',
      rule: { id: 'rule-2', name: 'GDPR Retention', categoryId: 'cat-priv', severity: 'Medium' },
      entityType: 'Project',
      entityId: 'proj-2',
      entityName: 'Beta Migration',
      status: 'Resolved',
      detectedAt: '2026-11-20T10:00:00.000Z',
    },
  ],
  evidence: [
    {
      id: 'ev-1',
      title: 'TLS Cert Proof',
      evidenceType: 'Document',
      status: 'Approved',
      userId: 'usr-1',
      taskId: 'task-1',
      violationId: 'viol-1',
      submittedAt: '2026-11-11T09:00:00.000Z',
      notes: 'Verified by officer',
    },
    {
      id: 'ev-2',
      title: 'Retention Config',
      evidenceType: 'Config',
      status: 'Pending',
      userId: 'usr-2',
      taskId: 'task-2',
      submittedAt: '2026-11-22T09:00:00.000Z',
    },
  ],
  auditLogs: [
    {
      id: 'log-1',
      action: 'VIOLATION_CREATED',
      ruleId: 'rule-1',
      entityType: 'Task',
      entityId: 'task-1',
      performedAt: '2026-11-10T10:05:00.000Z',
      performedBy: { fullName: 'Compliance Bot', email: 'bot@optiflow.test' },
      newValue: { severity: 'High' },
    },
    {
      id: 'log-2',
      action: 'VIOLATION_RESOLVED',
      ruleId: 'rule-2',
      entityType: 'Project',
      entityId: 'proj-2',
      performedAt: '2026-11-21T14:00:00.000Z',
      performedBy: { fullName: 'Officer Jane', email: 'jane@optiflow.test' },
      newValue: { status: 'Resolved' },
    },
  ],
  users: [
    { id: 'usr-1', fullName: 'Alice Member', email: 'alice@optiflow.test' },
    { id: 'usr-2', fullName: 'Bob Lead', email: 'bob@optiflow.test' },
  ],
};

describe('complianceExport', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('filters violations, evidence, rules, and audit logs by project, category, and dateRange', () => {
    const scopedByProject = filterComplianceDataset({
      ...sampleData,
      projectId: 'proj-1',
    });

    expect(scopedByProject.projectLabel).toBe('Alpha Platform');
    expect(scopedByProject.violations.map((v) => v.id)).toEqual(['viol-1']);
    expect(scopedByProject.evidence.map((e) => e.id)).toEqual(['ev-1']);

    const scopedByCategoryAndDate = filterComplianceDataset({
      ...sampleData,
      categoryId: 'cat-priv',
      dateRange: { start: '2026-11-15', end: '2026-11-25' },
    });

    expect(scopedByCategoryAndDate.rules.map((r) => r.id)).toEqual(['rule-2']);
    expect(scopedByCategoryAndDate.violations.map((v) => v.id)).toEqual(['viol-2']);
    expect(scopedByCategoryAndDate.evidence.map((e) => e.id)).toEqual(['ev-2']);
    expect(scopedByCategoryAndDate.auditLogs.map((l) => l.id)).toEqual(['log-2']);
  });

  it('streams backend violations CSV endpoint when exporting unfiltered violations-report as CSV', async () => {
    const csvBlob = new Blob(['id,status\nviol-1,Open'], { type: 'text/csv' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/csv; charset=utf-8' }),
      blob: vi.fn().mockResolvedValue(csvBlob),
    });

    const result = await exportCompliancePackage({
      reportType: 'violations-report',
      format: 'csv',
      data: sampleData,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/compliance-violations/export/csv',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-jwt-token' },
        credentials: 'include',
      })
    );
    expect(downloadBlob).toHaveBeenCalledWith(csvBlob, expect.stringMatching(/^violations_report_all_projects_.*\.csv$/));
    expect(result.format).toBe('csv');
  });

  it('calls evidenceApi.exportCsv when exporting unfiltered evidence-log as CSV', async () => {
    const csvBlob = new Blob(['id,title\nev-1,TLS Cert Proof'], { type: 'text/csv' });
    evidenceApi.exportCsv.mockResolvedValue(csvBlob);

    await exportCompliancePackage({
      reportType: 'evidence-log',
      format: 'csv',
      data: sampleData,
    });

    expect(evidenceApi.exportCsv).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenCalledWith(csvBlob, expect.stringMatching(/^evidence_log_all_projects_.*\.csv$/));
  });

  it('generates RFC-4180 filtered audit-trail CSV with performedAt and performedBy fields', async () => {
    await exportCompliancePackage({
      reportType: 'audit-trail',
      format: 'csv',
      categoryId: 'cat-sec',
      data: sampleData,
    });

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    const [blob, filename] = downloadBlob.mock.calls[0];
    expect(filename).toMatch(/^audit_trail_all_projects_.*\.csv$/);
    const text = await blob.text();
    expect(text).toContain('"Audit ID","Timestamp","Action","Actor","Entity Type","Entity ID","New Value"');
    expect(text).toContain('"log-1","2026-11-10T10:05:00.000Z","VIOLATION_CREATED","Compliance Bot","Task","task-1"');
    expect(text).not.toContain('log-2');
  });

  it('generates structured JSON package with company metadata and scoped counts', async () => {
    await exportCompliancePackage({
      reportType: 'compliance-summary',
      format: 'json',
      projectId: 'proj-1',
      data: sampleData,
      user: { fullName: 'Officer Maya', company: { legalName: 'FinTech Labs' } },
    });

    const [blob, filename] = downloadBlob.mock.calls[0];
    expect(filename).toMatch(/^compliance_summary_alpha_platform_.*\.json$/);
    const parsed = JSON.parse(await blob.text());
    expect(parsed.company).toBe('FinTech Labs');
    expect(parsed.generatedBy).toBe('Officer Maya');
    expect(parsed.summary.violationsCount).toBe(1);
    expect(parsed.summary.openViolationsCount).toBe(1);
    expect(parsed.summary.approvedEvidenceCount).toBe(1);
  });

  it('throws error when backend CSV endpoint returns HTML or non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    await expect(
      exportCompliancePackage({
        reportType: 'violations-report',
        format: 'csv',
        data: sampleData,
      })
    ).rejects.toThrow('Failed to export audit CSV from server');
  });
});
