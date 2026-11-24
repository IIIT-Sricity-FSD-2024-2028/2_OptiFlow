// Shared helpers for the executive portfolio views (health labels, CSV export).

export const HEALTH_META = {
  off_track: { label: 'Off Track', chip: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  at_risk: { label: 'At Risk', chip: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  on_track: { label: 'On Track', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  done: { label: 'Closed', chip: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

export const healthMeta = (health) => HEALTH_META[health] || HEALTH_META.on_track;

export const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** Builds a CSV string from rows and column definitions [{ header, value(row) }]. */
export function toCsv(rows, columns) {
  const head = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(','));
  return [head, ...body].join('\r\n');
}

// Byte-order mark so Excel opens the UTF-8 file with the right encoding.
const BOM = String.fromCharCode(0xfeff);

/** Starts a browser download of a CSV string. */
export function downloadCsv(filename, csv) {
  const blob = new Blob([`${BOM}${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const PORTFOLIO_CSV_COLUMNS = [
  { header: 'Project', value: (p) => p.name },
  { header: 'Status', value: (p) => p.status },
  { header: 'Health', value: (p) => healthMeta(p.health).label },
  { header: 'Reasons', value: (p) => (p.reasons || []).join('; ') },
  { header: 'Branch', value: (p) => p.branch?.name },
  { header: 'Team', value: (p) => p.team?.name },
  { header: 'Project Manager', value: (p) => p.projectManager?.fullName || 'Unassigned' },
  { header: 'Progress %', value: (p) => p.progress },
  { header: 'Tasks Completed', value: (p) => p.completedTasks },
  { header: 'Tasks Total', value: (p) => p.totalTasks },
  { header: 'Overdue Tasks', value: (p) => p.overdueTasks },
  { header: 'Blocked Tasks', value: (p) => p.blockedTasks },
  { header: 'Open Escalations', value: (p) => p.openEscalations },
  { header: 'Open Violations', value: (p) => p.openViolations },
  { header: 'Start Date', value: (p) => (p.startDate ? String(p.startDate).slice(0, 10) : '') },
  { header: 'Target Date', value: (p) => (p.targetDate ? String(p.targetDate).slice(0, 10) : '') },
];

export const BRANCH_CSV_COLUMNS = [
  { header: 'Branch', value: (b) => b.name },
  { header: 'Code', value: (b) => b.code },
  { header: 'Headcount', value: (b) => b.headcount },
  { header: 'Teams', value: (b) => b.teams },
  { header: 'Projects', value: (b) => b.totalProjects },
  { header: 'Active Projects', value: (b) => b.activeProjects },
  { header: 'At Risk Projects', value: (b) => b.atRiskProjects },
  { header: 'Off Track Projects', value: (b) => b.offTrackProjects },
  { header: 'Completion %', value: (b) => b.completionRate },
  { header: 'Overdue Tasks', value: (b) => b.overdueTasks },
  { header: 'Blocked Tasks', value: (b) => b.blockedTasks },
  { header: 'Open Escalations', value: (b) => b.openEscalations },
  { header: 'Open Violations', value: (b) => b.openViolations },
];
