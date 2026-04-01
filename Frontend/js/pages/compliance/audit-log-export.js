/**
 * audit-log-export.js
 * Feature #11 — Immutable Compliance Audit Export
 *
 * Adds to compliance_audit_log.html:
 *  1. Export filter dialog (date range, policy, project, format)
 *  2. Download-with-hash confirmation modal (simulated SHA-256)
 *  3. Self-logging of export events to state.auditLog + localStorage
 *  4. State-diff column (old state → new state) in the audit table
 *  5. Replaces global renderAuditLog with an enhanced data-driven version
 *
 * Non-destructive: loads AFTER audit-log.js; overrides renderAuditLog in global
 * scope, which is correct and intentional — this enhanced version is a superset.
 */

// =====================================================================
// STATE
// =====================================================================
const _exportState = {
  filters: { datePreset: '30', dateFrom: '', dateTo: '', policy: '', project: '', format: 'csv' },
  pendingHash: '',
};

const _auditUiState = {
  selectedEntryId: null,
  allEntries: [],
  filteredEntries: [],
  duplicateRuleVersions: new Set(),
};

// =====================================================================
// MOCK STRUCTURED AUDIT ENTRIES  (with old→new state-diff)
// =====================================================================
const AUDIT_ENTRIES = [
  {
    id: 'al-001', displayTime: 'Today 10:41 AM',
    isoTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actor: 'Shreya Chandra', avatar: 'SC', avatarColor: 'avatar-blue',
    title: 'ISO 27001 Control — Evidence Approved', subtitle: 'Control log verified and accepted',
    entityType: 'Evidence', entityId: 'ev-001',
    oldState: 'PENDING', newState: 'APPROVED',
    workflowId: 'wf-security-audit', workflowName: 'Security Compliance Workflow',
    ruleId: 'rule-iso-access', ruleName: 'ISO Access Evidence Rule', ruleVersion: 'v1',
    policy: 'ISO 27001', policyBadge: 'iso',
    project: 'IT Security Audit', projectKey: 'it-security',
    outcome: 'approved', outcomeBadge: 'outcome-approved',
    iconClass: 'icon-success', svgPath: '<polyline points="20 6 9 17 4 12" stroke-linejoin="round"/>',
  },
  {
    id: 'al-002', displayTime: 'Yesterday 3:12 PM',
    isoTime: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
    actor: 'System Auto', avatar: 'SA', avatarColor: 'avatar-red',
    title: 'SOX 404 — Violation Flagged', subtitle: 'Variance report sign-off missed deadline',
    entityType: 'Violation', entityId: 'viol-001',
    oldState: 'CREATED', newState: 'DETECTED',
    workflowId: 'wf-finance-quarterly', workflowName: 'Finance Quarterly Close',
    ruleId: 'rule-sox-deadline', ruleName: 'SOX Deadline Enforcement', ruleVersion: 'v2',
    policy: 'SOX', policyBadge: 'sox',
    project: 'Finance Q4', projectKey: 'finance-q4',
    outcome: 'violation', outcomeBadge: 'outcome-violation',
    iconClass: 'icon-violation', svgPath: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  },
  {
    id: 'al-003', displayTime: 'Dec 16 9:00 AM',
    isoTime: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    actor: 'Shreya Chandra', avatar: 'SC', avatarColor: 'avatar-blue',
    title: 'GDPR Rule Updated', subtitle: 'Evidence upload requirement made mandatory',
    entityType: 'Rule', entityId: 'rule-gdpr',
    oldState: 'DRAFT', newState: 'ACTIVE',
    workflowId: '', workflowName: '',
    ruleId: 'rule-gdpr', ruleName: 'GDPR Evidence Rule', ruleVersion: 'v3',
    policy: 'GDPR', policyBadge: 'gdpr',
    project: 'All Projects', projectKey: 'all-projects',
    outcome: 'updated', outcomeBadge: 'outcome-updated',
    iconClass: 'icon-update', svgPath: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" stroke-linejoin="round"/>',
  },
  {
    id: 'al-004', displayTime: 'Dec 14 2:30 PM',
    isoTime: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    actor: 'Shreya Chandra', avatar: 'SC', avatarColor: 'avatar-blue',
    title: 'GDPR — Evidence Requested More Info', subtitle: 'Client consent documentation incomplete',
    entityType: 'Evidence', entityId: 'ev-002',
    oldState: 'UNDER_REVIEW', newState: 'INFO_REQUESTED',
    workflowId: 'wf-client-onboarding', workflowName: 'Client Onboarding',
    ruleId: 'rule-gdpr', ruleName: 'GDPR Consent Validation', ruleVersion: 'v3',
    policy: 'GDPR', policyBadge: 'gdpr',
    project: 'Project Atlas', projectKey: 'project-atlas',
    outcome: 'pending', outcomeBadge: 'outcome-pending',
    iconClass: 'icon-warning', svgPath: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  },
  {
    id: 'al-005', displayTime: 'Dec 12 11:15 AM',
    isoTime: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    actor: 'Shreya Chandra', avatar: 'SC', avatarColor: 'avatar-blue',
    title: 'ISO 27001 Violation — Resolved', subtitle: 'Access log gap remediated and verified',
    entityType: 'Violation', entityId: 'viol-002',
    oldState: 'UNDER_INVESTIGATION', newState: 'RESOLVED',
    workflowId: 'wf-security-audit', workflowName: 'Security Compliance Workflow',
    ruleId: 'rule-iso-access', ruleName: 'ISO Access Evidence Rule', ruleVersion: 'v1',
    policy: 'ISO 27001', policyBadge: 'iso',
    project: 'IT Security Audit', projectKey: 'it-security',
    outcome: 'resolved', outcomeBadge: 'outcome-resolved',
    iconClass: 'icon-success', svgPath: '<polyline points="20 6 9 17 4 12" stroke-linejoin="round"/>',
  },
  {
    id: 'al-006', displayTime: 'Dec 10 4:00 PM',
    isoTime: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    actor: 'Shreya Chandra', avatar: 'SC', avatarColor: 'avatar-blue',
    title: 'HR Policy — Evidence Approved', subtitle: 'Onboarding checklist verified',
    entityType: 'Evidence', entityId: 'ev-003',
    oldState: 'PENDING', newState: 'APPROVED',
    workflowId: 'wf-hr-onboarding', workflowName: 'HR Onboarding',
    ruleId: 'rule-hr-checklist', ruleName: 'HR Checklist Validation', ruleVersion: 'v1',
    policy: 'HR Policy', policyBadge: 'hrpol',
    project: 'Onboarding Overhaul', projectKey: 'onboarding',
    outcome: 'approved', outcomeBadge: 'outcome-approved',
    iconClass: 'icon-success', svgPath: '<polyline points="20 6 9 17 4 12" stroke-linejoin="round"/>',
  },
];

// State pill colour map
const STATE_COLORS = {
  PENDING:              { bg: '#fef9c3', color: '#854d0e' },
  APPROVED:             { bg: '#dcfce7', color: '#166534' },
  REJECTED:             { bg: '#fee2e2', color: '#991b1b' },
  ACTIVE:               { bg: '#dbeafe', color: '#1e40af' },
  DRAFT:                { bg: '#f1f5f9', color: '#475569' },
  CREATED:              { bg: '#f1f5f9', color: '#475569' },
  DETECTED:             { bg: '#fef3c7', color: '#92400e' },
  UNDER_REVIEW:         { bg: '#dbeafe', color: '#1e40af' },
  UNDER_INVESTIGATION:  { bg: '#dbeafe', color: '#1e40af' },
  INFO_REQUESTED:       { bg: '#fef3c7', color: '#92400e' },
  RESOLVED:             { bg: '#dcfce7', color: '#166534' },
  ESCALATED:            { bg: '#fee2e2', color: '#991b1b' },
  CLOSED:               { bg: '#e0e7ff', color: '#3730a3' },
};

// =====================================================================
// UTILITIES
// =====================================================================
function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _statePill(label) {
  const c = STATE_COLORS[label] || { bg: '#f1f5f9', color: '#475569' };
  return `<span class="state-pill" style="background:${c.bg};color:${c.color};">${_esc(label)}</span>`;
}

/** Deterministic fake SHA-256 (simulated). */
function _generateHash(payload) {
  const str = JSON.stringify(payload);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const seed = ((4294967296 * (2097151 & h2)) + (h1 >>> 0)).toString(16) + Date.now().toString(16);
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) hash += chars[(seed.charCodeAt(i % seed.length) + i * 7) % 16];
  return hash;
}

function _formatFilterLabel(f) {
  const parts = [`Date: Last ${f.datePreset === 'custom' ? `${f.dateFrom}→${f.dateTo}` : f.datePreset + 'd'}`];
  if (f.policy)  parts.push(`Policy: ${f.policy}`);
  if (f.project) parts.push(`Project: ${f.project}`);
  parts.push(`Format: ${f.format.toUpperCase()}`);
  return parts.join(' | ');
}

function _getSession() {
  try { return JSON.parse(sessionStorage.getItem('currentUser') || '{}'); } catch { return {}; }
}

// =====================================================================
// EXPORT SELF-LOG  (localStorage + state.auditLog)
// =====================================================================
const EXPORT_LOG_KEY = 'complianceAuditExports';

function _getExportLog() {
  try { return JSON.parse(localStorage.getItem(EXPORT_LOG_KEY) || '[]'); } catch { return []; }
}

function _logExportEvent(filters, hash, rowCount) {
  const session  = _getSession();
  const actorName = session.name || 'Compliance Officer';
  const timestamp = new Date().toISOString();

  // Persist to localStorage (immutable — no UI delete)
  const exportLog = _getExportLog();
  exportLog.unshift({ timestamp, actor: actorName, filterLabel: _formatFilterLabel(filters), filters, hash, rowCount });
  localStorage.setItem(EXPORT_LOG_KEY, JSON.stringify(exportLog));

  // Also push to state.auditLog so it appears in the table
  if (typeof state !== 'undefined') {
    if (!state.auditLog) state.auditLog = [];
    state.auditLog.unshift({
      id: Date.now(),
      action: 'AUDIT_EXPORTED',
      entity: `Exported ${rowCount} entries (${filters.format.toUpperCase()})`,
      actor: actorName,
      timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      note: `Hash: ${hash} | Filters: ${_formatFilterLabel(filters)}`,
    });
    if (window.Helpers) window.Helpers.saveState(state);
  }
}

// =====================================================================
// DATA AGGREGATION
// =====================================================================
function _buildAllEntries() {
  let entries = [...AUDIT_ENTRIES];

  // Merge state.auditLog (conflict resolutions, export events, etc.)
  const stateLog = (typeof state !== 'undefined' && state.auditLog) ? state.auditLog : [];
  stateLog.forEach((e) => {
    entries.unshift({
      id: 'sl-' + e.id,
      displayTime: e.timestamp || 'Recent',
      isoTime: new Date().toISOString(),
      actor: e.actor || 'Compliance Officer', avatar: 'CO', avatarColor: 'avatar-blue',
      title: _actionLabel(e.action), subtitle: e.entity || '',
      entityType: 'System', entityId: '',
      oldState: null, newState: null,
      workflowId: e.workflowId || '', workflowName: e.workflowName || '',
      ruleId: e.ruleId || '', ruleName: e.ruleName || '', ruleVersion: e.ruleVersion || '',
      policy: 'Internal', policyBadge: 'hrpol',
      project: 'System', projectKey: 'all-projects',
      outcome: 'resolved', outcomeBadge: 'outcome-resolved',
      iconClass: 'icon-update',
      svgPath: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" stroke-linejoin="round"/>',
      exportHash: e.action === 'AUDIT_EXPORTED' ? (e.note || '').split('Hash: ')[1]?.split(' |')[0] : null,
    });
  });

  return entries;
}

function _actionLabel(action) {
  return ({
    CONFLICT_RESOLVED: 'Rule Conflict Resolved',
    AUDIT_EXPORTED:    'Audit Log Exported',
    EVIDENCE_APPROVED: 'Evidence Approved',
    RULE_UPDATED:      'Rule Updated',
  })[action] || (action || '').replace(/_/g, ' ');
}

function _toMillis(isoTime) {
  const parsed = Date.parse(isoTime);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function _normKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function _passesDateFilter(entry, days) {
  if (!days) return true;
  const dayCount = Number(days);
  if (!Number.isFinite(dayCount) || dayCount <= 0) return true;
  const cutoff = Date.now() - dayCount * 24 * 60 * 60 * 1000;
  return _toMillis(entry.isoTime) >= cutoff;
}

function _renderWorkflowFilterOptions(entries) {
  const select = document.getElementById('filterWorkflow');
  if (!select) return;

  const previousValue = select.value;
  const uniqueWorkflows = new Map();
  entries.forEach((entry) => {
    if (!entry.workflowId || !entry.workflowName) return;
    uniqueWorkflows.set(entry.workflowId, entry.workflowName);
  });

  const options = ['<option value="">All Workflows</option>'];
  [...uniqueWorkflows.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([id, name]) => {
      options.push(`<option value="${_esc(id)}">${_esc(name)}</option>`);
    });

  select.innerHTML = options.join('');
  if (previousValue && uniqueWorkflows.has(previousValue)) {
    select.value = previousValue;
  }
}

function _buildDuplicateRuleVersionSet(entries) {
  const counts = new Map();
  entries
    .filter((entry) => entry.entityType === 'Rule' || entry.ruleVersion)
    .forEach((entry) => {
      const trackedRuleId = entry.ruleId || '';
      if (!trackedRuleId || !entry.ruleVersion) return;
      const key = `${trackedRuleId}|${entry.ruleVersion}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

  const duplicates = new Set();
  counts.forEach((count, key) => {
    if (count > 1) duplicates.add(key);
  });
  return duplicates;
}

function _openAuditDetailModal(entryId) {
  const entry = _auditUiState.allEntries.find((item) => item.id === entryId);
  if (!entry) return;

  _auditUiState.selectedEntryId = entryId;

  const details = [
    ['Event ID', entry.id],
    ['Entity Type', entry.entityType || 'System'],
    ['Actor', entry.actor || 'System'],
    ['Policy', entry.policy || 'Internal'],
    ['Project', entry.project || 'System'],
    ['Workflow', entry.workflowName || 'No workflow linked'],
    ['Rule ID', entry.ruleId || 'N/A'],
    ['Rule Version', entry.ruleVersion || 'N/A'],
    ['Outcome', (entry.outcome || '').toUpperCase() || 'N/A'],
  ];

  document.getElementById('auditDetailSubtitle').textContent = `${entry.title} • ${entry.displayTime}`;
  document.getElementById('auditDetailGrid').innerHTML = details
    .map(([label, value]) => `
      <div class="audit-detail-cell">
        <span class="audit-detail-label">${_esc(label)}</span>
        <span class="audit-detail-value">${_esc(value)}</span>
      </div>`)
    .join('');

  document.getElementById('auditDetailStateTransition').innerHTML =
    entry.oldState && entry.newState
      ? `<div class="audit-state-diff">${_statePill(entry.oldState)} <span class="state-arrow">→</span> ${_statePill(entry.newState)}</div>`
      : '<span class="state-na">No state transition available for this event.</span>';

  document.getElementById('auditDetailNotes').textContent = entry.subtitle || 'No additional notes are available.';

  const duplicateKey = `${entry.ruleId || ''}|${entry.ruleVersion || ''}`;
  const duplicateWarning = document.getElementById('auditDetailDuplicateWarning');
  if (entry.ruleVersion && _auditUiState.duplicateRuleVersions.has(duplicateKey)) {
    duplicateWarning.style.display = 'block';
    duplicateWarning.textContent = 'Duplicate rule version detected for this rule ID. Audit review recommended.';
  } else {
    duplicateWarning.style.display = 'none';
    duplicateWarning.textContent = '';
  }

  const workflowBtn = document.getElementById('btnAuditDetailOpenWorkflow');
  workflowBtn.disabled = !entry.workflowId;
  workflowBtn.dataset.workflowId = entry.workflowId || '';
  workflowBtn.dataset.workflowName = entry.workflowName || '';

  document.getElementById('auditDetailModal').classList.add('active');
}

function _closeAuditDetailModal() {
  document.getElementById('auditDetailModal')?.classList.remove('active');
}

// =====================================================================
// ENHANCED renderAuditLog  (replaces global from audit-log.js)
// =====================================================================
function renderAuditLog() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;

  const q = (document.getElementById('auditSearch')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('filterEventType')?.value || '';
  const projectFilter = document.getElementById('filterProject')?.value || '';
  const policyFilter = document.getElementById('filterPolicy')?.value || '';
  const dateFilter = document.getElementById('filterDate')?.value || '';
  const workflowFilter = document.getElementById('filterWorkflow')?.value || '';

  const allEntries = _buildAllEntries();
  _auditUiState.allEntries = allEntries;
  _auditUiState.duplicateRuleVersions = _buildDuplicateRuleVersionSet(allEntries);
  _renderWorkflowFilterOptions(allEntries);

  let entries = [...allEntries];

  if (q) entries = entries.filter(e => `${e.title} ${e.subtitle} ${e.actor} ${e.policy} ${e.project} ${e.workflowName || ''}`.toLowerCase().includes(q));
  if (typeFilter) entries = entries.filter(e => e.outcome.toLowerCase() === typeFilter.toLowerCase());
  if (projectFilter) entries = entries.filter(e => e.project === projectFilter || e.projectKey === projectFilter);
  if (policyFilter) entries = entries.filter(e => _normKey(e.policy).includes(_normKey(policyFilter)));
  if (workflowFilter) entries = entries.filter(e => e.workflowId === workflowFilter);
  if (dateFilter) entries = entries.filter(e => _passesDateFilter(e, dateFilter));

  _auditUiState.filteredEntries = entries;

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No audit entries match the selected filters.</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr data-entry-id="${_esc(e.id)}" tabindex="0" aria-label="Open details for ${_esc(e.title)}">
      <td><span class="audit-timestamp">${_esc(e.displayTime)}</span></td>
      <td>
        <div class="audit-event-cell">
          <div class="audit-event-icon ${e.iconClass}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${e.svgPath}</svg>
          </div>
          <div class="audit-event-text">
            <div class="audit-event-title">${_esc(e.title)}</div>
            <div class="audit-event-subtitle">${_esc(e.subtitle)}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="audit-actor-cell">
          <div class="actor-avatar ${e.avatarColor}">${_esc(e.avatar)}</div>
          <span class="actor-name">${_esc(e.actor)}</span>
        </div>
      </td>
      <td><span class="badge ${e.policyBadge}">${_esc(e.policy)}</span></td>
      <td><span class="audit-project">${_esc(e.project)}</span></td>
      <td>
        <div class="audit-state-diff">
          ${e.oldState && e.newState
            ? `${_statePill(e.oldState)} <span class="state-arrow">→</span> ${_statePill(e.newState)}`
            : `<span class="state-na">—</span>`}
        </div>
      </td>
      <td>
        <span class="badge ${e.outcomeBadge}">${_esc(e.outcome.toUpperCase())}</span>
        ${e.exportHash ? `<div style="font-size:10px;color:#7c3aed;margin-top:3px;font-family:monospace;" title="Export hash">#${e.exportHash.substring(0, 8)}…</div>` : ''}
      </td>
    </tr>`).join('');
}

// =====================================================================
// CSV / TXT GENERATION
// =====================================================================
function _getFilteredEntries(filters) {
  let entries = _buildAllEntries();
  if (filters.datePreset && filters.datePreset !== 'custom') {
    entries = entries.filter(e => _passesDateFilter(e, filters.datePreset));
  }
  if (filters.datePreset === 'custom' && filters.dateFrom && filters.dateTo) {
    const from = Date.parse(`${filters.dateFrom}T00:00:00`);
    const to = Date.parse(`${filters.dateTo}T23:59:59`);
    entries = entries.filter((e) => {
      const ts = _toMillis(e.isoTime);
      return ts >= from && ts <= to;
    });
  }
  if (filters.policy)  entries = entries.filter(e => _normKey(e.policy).includes(_normKey(filters.policy)));
  if (filters.project) entries = entries.filter(e => e.project === filters.project);
  return entries;
}

function _buildCSV(entries, filters, hash) {
  const header = ['ID', 'Timestamp', 'Actor', 'Title', 'Subtitle', 'Entity Type', 'Entity ID',
                  'Old State', 'New State', 'Policy', 'Project', 'Outcome'].join(',');
  const meta = [
    `# COMPLIANCE AUDIT LOG EXPORT`,
    `# Generated: ${new Date().toISOString()}`,
    `# Filters: ${_formatFilterLabel(filters)}`,
    `# Integrity Hash: ${hash}`,
    `# Records: ${entries.length}`,
    `# SELF-LOGGED: This export is recorded in the audit trail.`,
    '',
  ].join('\n');
  const rows = entries.map(e =>
    [e.id, e.isoTime, e.actor, e.title, e.subtitle, e.entityType, e.entityId,
     e.oldState || '', e.newState || '', e.policy, e.project, e.outcome]
    .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
  );
  return meta + header + '\n' + rows.join('\n');
}

function _buildTXT(entries, filters, hash) {
  const lines = [
    'COMPLIANCE AUDIT LOG EXPORT',
    `Generated : ${new Date().toISOString()}`,
    `Actor     : ${_getSession().name || 'Compliance Officer'}`,
    `Filters   : ${_formatFilterLabel(filters)}`,
    `Hash      : ${hash}`,
    `Records   : ${entries.length}`,
    'NOTE      : This export is self-logged to the compliance audit trail.',
    '='.repeat(80),
    '',
    ...entries.map((e, i) => [
      `[${i + 1}] ${e.displayTime} | ${e.actor}`,
      `    ${e.title}`,
      `    ${e.subtitle}`,
      `    Policy: ${e.policy} | Project: ${e.project} | Outcome: ${e.outcome.toUpperCase()}`,
      `    State: ${e.oldState || 'N/A'} → ${e.newState || 'N/A'}`,
      '',
    ].join('\n')),
  ];
  return lines.join('\n');
}

function _downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =====================================================================
// MODAL — EXPORT FILTER
// =====================================================================
function openExportFilterModal() {
  document.getElementById('exportDatePreset').value = '30';
  document.getElementById('exportCustomDateRow').style.display = 'none';
  document.getElementById('exportPolicyFilter').value  = '';
  document.getElementById('exportProjectFilter').value = '';
  document.getElementById('fmtCsv').checked = true;
  document.getElementById('exportFilterModal').classList.add('active');
}

function closeExportFilterModal() {
  document.getElementById('exportFilterModal').classList.remove('active');
}

function _readFilters() {
  return {
    datePreset: document.getElementById('exportDatePreset').value,
    dateFrom:   document.getElementById('exportDateFrom').value,
    dateTo:     document.getElementById('exportDateTo').value,
    policy:     document.getElementById('exportPolicyFilter').value,
    project:    document.getElementById('exportProjectFilter').value,
    format:     document.querySelector('input[name="exportFormat"]:checked')?.value || 'csv',
  };
}

function _validateExportFilters(filters) {
  if (filters.datePreset !== 'custom') return { valid: true };

  if (!filters.dateFrom || !filters.dateTo) {
    return { valid: false, message: 'Please select both custom date boundaries.' };
  }

  const from = Date.parse(`${filters.dateFrom}T00:00:00`);
  const to = Date.parse(`${filters.dateTo}T23:59:59`);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return { valid: false, message: 'Invalid custom date range provided.' };
  }
  if (from > to) {
    return { valid: false, message: 'The custom "From" date must be before or equal to "To" date.' };
  }

  return { valid: true };
}

// =====================================================================
// MODAL — HASH CONFIRMATION
// =====================================================================
function openHashConfirmModal() {
  const filters = _readFilters();
  const validation = _validateExportFilters(filters);
  if (!validation.valid) {
    if (window.Toast) window.Toast.show(validation.message, 'error');
    return;
  }

  _exportState.filters = filters;

  const entries = _getFilteredEntries(filters);
  const hash    = _generateHash({ filters, ids: entries.map(e => e.id), ts: Date.now() });
  _exportState.pendingHash = hash;

  const session = _getSession();

  // Populate summary
  document.getElementById('exportSummaryGrid').innerHTML = [
    ['Actor',       session.name || 'Compliance Officer'],
    ['Records',     `${entries.length} entries`],
    ['Format',      filters.format.toUpperCase()],
    ['Date Range',  filters.datePreset === 'custom' ? `${filters.dateFrom} → ${filters.dateTo}` : `Last ${filters.datePreset} days`],
    ['Policy',      filters.policy  || 'All'],
    ['Project',     filters.project || 'All'],
  ].map(([l, v]) => `
    <div class="export-summary-cell">
      <span class="export-summary-label">${l}</span>
      <span class="export-summary-value">${_esc(v)}</span>
    </div>`).join('');

  document.getElementById('exportHashBox').textContent = hash;
  document.getElementById('exportConfirmCheck').checked = false;
  document.getElementById('exportConfirmError').style.display = 'none';

  closeExportFilterModal();
  document.getElementById('hashConfirmModal').classList.add('active');
}

function closeHashConfirmModal() {
  document.getElementById('hashConfirmModal').classList.remove('active');
}

// =====================================================================
// EXECUTE EXPORT
// =====================================================================
function executeExport() {
  if (!document.getElementById('exportConfirmCheck').checked) {
    document.getElementById('exportConfirmError').style.display = 'block';
    return;
  }

  const filters  = _exportState.filters;
  const hash     = _exportState.pendingHash;
  const entries  = _getFilteredEntries(filters);
  const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `compliance-audit-${ts}.${filters.format}`;

  let content, mimeType;
  if (filters.format === 'csv') {
    content  = _buildCSV(entries, filters, hash);
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    content  = _buildTXT(entries, filters, hash);
    mimeType = 'text/plain;charset=utf-8;';
  }

  _downloadFile(content, filename, mimeType);
  _logExportEvent(filters, hash, entries.length);
  closeHashConfirmModal();

  if (window.Toast) window.Toast.show(
    `Export complete — ${entries.length} records | Hash: ${hash.substring(0, 12)}… | Logged to audit trail`,
    'success'
  );

  // Re-render to show the self-log entry
  setTimeout(renderAuditLog, 300);
}

// =====================================================================
// EXPORT BUTTON ENHANCEMENT
// =====================================================================
function _enhanceExportButton() {
  const btn = document.getElementById('btn-export');
  if (!btn) return;
  // Clone removes original event listeners (the simple Toast call from audit-log.js)
  const clone = btn.cloneNode(false);
  clone.id = 'btn-export';
  clone.setAttribute('aria-label', 'Export audit log');
  clone.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    <span>Export</span>`;
  clone.addEventListener('click', openExportFilterModal);
  btn.parentNode.replaceChild(clone, btn);
}

// =====================================================================
// INIT
// =====================================================================
document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('auditTable')) return;

  // 1. Enhance the export button (replaces simple Toast handler)
  _enhanceExportButton();

  // 2. Export Filter Modal wiring
  document.getElementById('btnCloseExportFilter')?.addEventListener('click', closeExportFilterModal);
  document.getElementById('btnCancelExportFilter')?.addEventListener('click', closeExportFilterModal);
  document.getElementById('btnPreviewExport')?.addEventListener('click', openHashConfirmModal);
  document.getElementById('exportDatePreset')?.addEventListener('change', function () {
    document.getElementById('exportCustomDateRow').style.display = this.value === 'custom' ? 'grid' : 'none';
  });
  document.getElementById('exportFilterModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeExportFilterModal();
  });

  // 3. Hash Confirm Modal wiring
  document.getElementById('btnCloseHashConfirm')?.addEventListener('click', closeHashConfirmModal);
  document.getElementById('btnBackToFilter')?.addEventListener('click', function () {
    closeHashConfirmModal();
    document.getElementById('exportFilterModal').classList.add('active');
  });
  document.getElementById('btnDownloadExport')?.addEventListener('click', executeExport);
  document.getElementById('exportConfirmCheck')?.addEventListener('change', function () {
    if (this.checked) document.getElementById('exportConfirmError').style.display = 'none';
  });
  document.getElementById('hashConfirmModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeHashConfirmModal();
  });

  // 4. Audit table and filter enhancements
  document.getElementById('filterWorkflow')?.addEventListener('change', renderAuditLog);
  document.getElementById('btnResetAuditFilters')?.addEventListener('click', function () {
    const resetMap = {
      auditSearch: '',
      filterEventType: '',
      filterProject: '',
      filterPolicy: '',
      filterWorkflow: '',
      filterDate: '30',
    };

    Object.entries(resetMap).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.value = value;
    });

    renderAuditLog();
  });

  document.getElementById('auditTableBody')?.addEventListener('click', function (e) {
    const row = e.target.closest('tr[data-entry-id]');
    if (!row) return;
    _openAuditDetailModal(row.dataset.entryId);
  });

  document.getElementById('auditTableBody')?.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('tr[data-entry-id]');
    if (!row) return;
    e.preventDefault();
    _openAuditDetailModal(row.dataset.entryId);
  });

  document.getElementById('btnCloseAuditDetail')?.addEventListener('click', _closeAuditDetailModal);
  document.getElementById('btnAuditDetailClose')?.addEventListener('click', _closeAuditDetailModal);
  document.getElementById('auditDetailModal')?.addEventListener('click', function (e) {
    if (e.target === this) _closeAuditDetailModal();
  });

  document.getElementById('btnAuditDetailOpenWorkflow')?.addEventListener('click', function () {
    const workflowId = this.dataset.workflowId || '';
    const workflowName = this.dataset.workflowName || '';
    if (!workflowId) {
      if (window.Toast) window.Toast.show('No workflow selected for this audit event.', 'warning');
      return;
    }
    if (window.Toast) window.Toast.show(`Workflow context: ${workflowName}`, 'info');
  });

  // 5. Re-render with enhanced function (replaces the initial render from audit-log.js)
  renderAuditLog();
});
