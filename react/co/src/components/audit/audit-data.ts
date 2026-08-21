export type AuditOutcome = "success" | "denied" | "warning" | "info";
export type AuditRisk = "critical" | "high" | "medium" | "low";
export type AuditModule =
  | "Evidence"
  | "Violations"
  | "Rules"
  | "Reports"
  | "Access"
  | "System"
  | "Settings";

export type AuditChange = {
  field: string;
  before: string | null;
  after: string | null;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  actor: { name: string; initials: string; role: string; email: string };
  action: string;
  actionVerb: "created" | "updated" | "deleted" | "approved" | "rejected" | "viewed" | "exported" | "signed-in" | "denied";
  module: AuditModule;
  entity: { id: string; label: string; href?: string };
  outcome: AuditOutcome;
  risk: AuditRisk;
  ip: string;
  device: string;
  location: string;
  sessionId: string;
  changes?: AuditChange[];
  notes?: string;
  suspicious?: boolean;
  related?: { id: string; label: string }[];
};

const baseDate = "Apr 24, 2026";

export const auditEvents: AuditEvent[] = [
  {
    id: "AU-78421",
    timestamp: "2026-04-24T14:32:18Z",
    date: baseDate,
    time: "14:32:18",
    actor: { name: "Marcus Liu", initials: "ML", role: "Security Lead", email: "[email protected]" },
    action: "Approved evidence submission",
    actionVerb: "approved",
    module: "Evidence",
    entity: { id: "EV-2104", label: "Access review — Production DB" },
    outcome: "success",
    risk: "low",
    ip: "10.42.18.221",
    device: "macOS · Chrome 124",
    location: "Austin, TX",
    sessionId: "sess_8f2a91b4",
    notes: "Approved with note: confirmed scope with vendor.",
    related: [
      { id: "ACR-014", label: "Quarterly access review rule" },
    ],
  },
  {
    id: "AU-78420",
    timestamp: "2026-04-24T14:18:02Z",
    date: baseDate,
    time: "14:18:02",
    actor: { name: "System", initials: "SY", role: "Risk engine", email: "system@officesync" },
    action: "Auto-detected duplicate submission",
    actionVerb: "created",
    module: "Evidence",
    entity: { id: "EV-2104", label: "Access review — Production DB" },
    outcome: "warning",
    risk: "medium",
    ip: "internal",
    device: "Service worker",
    location: "us-east-1",
    sessionId: "sys_risk_engine",
    notes: "78% similarity match to EV-2061 (Staging DB).",
    related: [{ id: "EV-2061", label: "Staging DB access review" }],
  },
  {
    id: "AU-78419",
    timestamp: "2026-04-24T13:54:41Z",
    date: baseDate,
    time: "13:54:41",
    actor: { name: "Unknown", initials: "?", role: "Unauthenticated", email: "—" },
    action: "Failed sign-in attempt — admin console",
    actionVerb: "denied",
    module: "Access",
    entity: { id: "ADM-CONSOLE", label: "Admin console" },
    outcome: "denied",
    risk: "critical",
    ip: "185.220.101.47",
    device: "Linux · curl/8.4.0",
    location: "Unknown · TOR exit",
    sessionId: "—",
    suspicious: true,
    notes: "5 consecutive failed attempts from same IP within 60 seconds. Source IP matches known TOR exit node. Account locked, security team paged.",
  },
  {
    id: "AU-78418",
    timestamp: "2026-04-24T13:41:08Z",
    date: baseDate,
    time: "13:41:08",
    actor: { name: "Sara Chen", initials: "SC", role: "Data Protection Officer", email: "[email protected]" },
    action: "Updated rule conditions",
    actionVerb: "updated",
    module: "Rules",
    entity: { id: "DAT-008", label: "Encryption-at-rest for customer PII" },
    outcome: "success",
    risk: "high",
    ip: "10.42.18.118",
    device: "macOS · Safari 17",
    location: "San Francisco, CA",
    sessionId: "sess_7c3b82a1",
    changes: [
      { field: "Key rotation (months)", before: "24", after: "12" },
      { field: "Version", before: "v2.0", after: "v2.1" },
    ],
    notes: "Tightened key rotation per ISO 27001:2022 update.",
  },
  {
    id: "AU-78417",
    timestamp: "2026-04-24T13:22:55Z",
    date: baseDate,
    time: "13:22:55",
    actor: { name: "Elena Martins", initials: "EM", role: "Compliance Officer", email: "[email protected]" },
    action: "Generated SOC 2 Readiness report",
    actionVerb: "exported",
    module: "Reports",
    entity: { id: "rep-204", label: "SOC 2 Readiness — Q1 2026.pdf" },
    outcome: "success",
    risk: "low",
    ip: "10.42.18.91",
    device: "Windows · Edge 124",
    location: "Austin, TX",
    sessionId: "sess_91e7a042",
    notes: "Exported to PDF · 4.2 MB · 42 pages",
  },
  {
    id: "AU-78416",
    timestamp: "2026-04-24T12:58:14Z",
    date: baseDate,
    time: "12:58:14",
    actor: { name: "Marcus Liu", initials: "ML", role: "Security Lead", email: "[email protected]" },
    action: "Escalated violation to VP Engineering",
    actionVerb: "updated",
    module: "Violations",
    entity: { id: "VIO-2104", label: "3 stale admin accounts in prod-db" },
    outcome: "success",
    risk: "high",
    ip: "10.42.18.221",
    device: "macOS · Chrome 124",
    location: "Austin, TX",
    sessionId: "sess_8f2a91b4",
    changes: [
      { field: "Status", before: "investigating", after: "escalated" },
      { field: "Owner", before: "Marcus Liu", after: "VP Engineering" },
    ],
  },
  {
    id: "AU-78415",
    timestamp: "2026-04-24T12:31:02Z",
    date: baseDate,
    time: "12:31:02",
    actor: { name: "Priya Shah", initials: "PS", role: "Vendor Risk Manager", email: "[email protected]" },
    action: "Viewed audit log",
    actionVerb: "viewed",
    module: "System",
    entity: { id: "AUDIT", label: "Audit log · last 30 days" },
    outcome: "info",
    risk: "low",
    ip: "10.42.18.55",
    device: "macOS · Chrome 124",
    location: "London, UK",
    sessionId: "sess_4d9c1e88",
  },
  {
    id: "AU-78414",
    timestamp: "2026-04-24T12:04:49Z",
    date: baseDate,
    time: "12:04:49",
    actor: { name: "Marcus Liu", initials: "ML", role: "Security Lead", email: "[email protected]" },
    action: "Published rule version",
    actionVerb: "updated",
    module: "Rules",
    entity: { id: "ACR-014", label: "Quarterly access review for production systems" },
    outcome: "success",
    risk: "medium",
    ip: "10.42.18.221",
    device: "macOS · Chrome 124",
    location: "Austin, TX",
    sessionId: "sess_8f2a91b4",
    changes: [
      { field: "Status", before: "draft", after: "active" },
      { field: "Version", before: "v3.1", after: "v3.2" },
    ],
  },
  {
    id: "AU-78413",
    timestamp: "2026-04-24T11:47:11Z",
    date: baseDate,
    time: "11:47:11",
    actor: { name: "Sara Chen", initials: "SC", role: "Data Protection Officer", email: "[email protected]" },
    action: "Rejected evidence — incomplete attestation",
    actionVerb: "rejected",
    module: "Evidence",
    entity: { id: "EV-2098", label: "Encryption attestation Q4" },
    outcome: "denied",
    risk: "medium",
    ip: "10.42.18.118",
    device: "macOS · Safari 17",
    location: "San Francisco, CA",
    sessionId: "sess_7c3b82a1",
    notes: "Attestation missing manager signature. Returned to submitter.",
  },
  {
    id: "AU-78412",
    timestamp: "2026-04-24T11:22:30Z",
    date: baseDate,
    time: "11:22:30",
    actor: { name: "System", initials: "SY", role: "Auto-checks", email: "system@officesync" },
    action: "MFA enforcement check passed",
    actionVerb: "created",
    module: "System",
    entity: { id: "ACR-009", label: "MFA for all administrative consoles" },
    outcome: "success",
    risk: "low",
    ip: "internal",
    device: "Service worker",
    location: "us-east-1",
    sessionId: "sys_autocheck_v5",
  },
  {
    id: "AU-78411",
    timestamp: "2026-04-24T10:58:44Z",
    date: baseDate,
    time: "10:58:44",
    actor: { name: "Elena Martins", initials: "EM", role: "Compliance Officer", email: "[email protected]" },
    action: "Updated workspace settings",
    actionVerb: "updated",
    module: "Settings",
    entity: { id: "WS-ACME", label: "Acme Corporation workspace" },
    outcome: "success",
    risk: "medium",
    ip: "10.42.18.91",
    device: "Windows · Edge 124",
    location: "Austin, TX",
    sessionId: "sess_91e7a042",
    changes: [
      { field: "SLA — incident ack (min)", before: "90", after: "60" },
      { field: "Notification channel", before: "email", after: "email + slack" },
    ],
  },
  {
    id: "AU-78410",
    timestamp: "2026-04-24T10:33:18Z",
    date: baseDate,
    time: "10:33:18",
    actor: { name: "Marcus Liu", initials: "ML", role: "Security Lead", email: "[email protected]" },
    action: "Signed in",
    actionVerb: "signed-in",
    module: "Access",
    entity: { id: "AUTH", label: "OfficeSync console" },
    outcome: "success",
    risk: "low",
    ip: "10.42.18.221",
    device: "macOS · Chrome 124",
    location: "Austin, TX",
    sessionId: "sess_8f2a91b4",
    notes: "Phishing-resistant MFA verified (WebAuthn).",
  },
];
