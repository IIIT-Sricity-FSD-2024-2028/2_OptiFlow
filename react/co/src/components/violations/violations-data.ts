export type Violation = {
  id: string;
  title: string;
  summary: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "investigating" | "escalated" | "resolved";
  framework: string;
  rule: string;
  department: string;
  project: string;
  system: string;
  owner: { name: string; initials: string; role: string };
  detectedAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaUrgent: boolean;
  riskScore: number;
  impactedUsers: number;
  rootCause: string;
  evidence: { name: string; size: string; type: "pdf" | "sheet" | "doc" | "log" }[];
  checklist: { label: string; done: boolean }[];
  timeline: {
    actor: string;
    action: string;
    detail?: string;
    time: string;
    tone: "neutral" | "primary" | "warning" | "success" | "danger";
  }[];
  comments: { author: string; initials: string; text: string; time: string }[];
};

export const violationsData: Violation[] = [
  {
    id: "VL-3041",
    title: "Unencrypted PII export from Analytics warehouse",
    summary:
      "A scheduled export from the analytics warehouse wrote 14,200 customer records to an S3 bucket without server-side encryption. Bucket is private but breaches our data-at-rest policy.",
    severity: "critical",
    status: "investigating",
    framework: "GDPR",
    rule: "Art. 32 — Security of processing",
    department: "Data Engineering",
    project: "Customer 360",
    system: "warehouse-prod / s3://acme-analytics-export",
    owner: { name: "Marcus Liu", initials: "ML", role: "DevOps Lead" },
    detectedAt: "Today, 09:14",
    updatedAt: "12 min ago",
    slaDeadline: "Today, 17:00",
    slaUrgent: true,
    riskScore: 88,
    impactedUsers: 14200,
    rootCause:
      "Terraform module default for SSE flipped after provider upgrade. CI policy check skipped due to drift exception.",
    evidence: [
      { name: "cloudtrail-export-09-14.log", size: "412 KB", type: "log" },
      { name: "s3-bucket-policy.json", size: "8 KB", type: "doc" },
      { name: "terraform-diff.pdf", size: "182 KB", type: "pdf" },
    ],
    checklist: [
      { label: "Contain — enable SSE on bucket", done: true },
      { label: "Rotate affected access keys", done: true },
      { label: "Notify DPO within 24h", done: false },
      { label: "Patch Terraform module", done: false },
      { label: "Re-run CI policy gate", done: false },
    ],
    timeline: [
      { actor: "You", action: "took ownership", time: "12 min ago", tone: "primary" },
      {
        actor: "Risk engine",
        action: "auto-escalated to Critical",
        detail: "PII volume above threshold (10k)",
        time: "38 min ago",
        tone: "danger",
      },
      {
        actor: "Marcus Liu",
        action: "applied containment",
        detail: "Enabled SSE-KMS on bucket",
        time: "1 h ago",
        tone: "success",
      },
      {
        actor: "CloudTrail monitor",
        action: "detected violation",
        detail: "PutObject without x-amz-server-side-encryption",
        time: "2 h ago",
        tone: "warning",
      },
    ],
    comments: [
      {
        author: "Sara Chen",
        initials: "SC",
        text: "Confirmed bucket was never public. Scope is internal exposure only — no third-party access detected in CloudTrail.",
        time: "22 min ago",
      },
      {
        author: "Marcus Liu",
        initials: "ML",
        text: "Containment applied. Working on the Terraform fix now, ETA 30 min.",
        time: "8 min ago",
      },
    ],
  },
  {
    id: "VL-3038",
    title: "MFA disabled for 3 admin accounts",
    summary:
      "Routine access review surfaced three privileged accounts in Production where MFA enrollment lapsed after a recent IdP migration.",
    severity: "high",
    status: "open",
    framework: "SOC 2",
    rule: "CC6.1 — Logical access controls",
    department: "IT Operations",
    project: "Q1 SOC 2 Audit",
    system: "Okta · prod tenant",
    owner: { name: "Diego Romero", initials: "DR", role: "IT Admin" },
    detectedAt: "Yesterday, 16:02",
    updatedAt: "2 h ago",
    slaDeadline: "Tomorrow, 12:00",
    slaUrgent: false,
    riskScore: 71,
    impactedUsers: 3,
    rootCause: "IdP migration script did not preserve factor enrollment for service-owner roles.",
    evidence: [
      { name: "okta-mfa-report.xlsx", size: "62 KB", type: "sheet" },
      { name: "migration-runbook.pdf", size: "1.1 MB", type: "pdf" },
    ],
    checklist: [
      { label: "Force re-enrollment on next login", done: true },
      { label: "Notify account owners", done: true },
      { label: "Add MFA drift alert in SIEM", done: false },
      { label: "Update migration runbook", done: false },
    ],
    timeline: [
      { actor: "Diego Romero", action: "forced re-enrollment", time: "2 h ago", tone: "success" },
      { actor: "Access review", action: "flagged 3 accounts", time: "Yesterday, 16:02", tone: "warning" },
    ],
    comments: [
      {
        author: "Diego Romero",
        initials: "DR",
        text: "All three users have been pinged. Two enrolled within the hour, one is OOO until tomorrow.",
        time: "1 h ago",
      },
    ],
  },
  {
    id: "VL-3032",
    title: "Vendor SOC 2 report expired (Datadog)",
    summary: "Vendor risk register shows the latest Datadog SOC 2 Type II report expired 6 days ago. New report not yet ingested.",
    severity: "high",
    status: "investigating",
    framework: "SOC 2",
    rule: "CC9.2 — Vendor management",
    department: "Finance",
    project: "Vendor Risk Program",
    system: "Vendor portal · Datadog",
    owner: { name: "Priya Shah", initials: "PS", role: "Vendor Mgmt" },
    detectedAt: "3 days ago",
    updatedAt: "5 h ago",
    slaDeadline: "Mar 14",
    slaUrgent: false,
    riskScore: 54,
    impactedUsers: 0,
    rootCause: "Vendor publishes annually but renewal lag exceeded 5-day grace window.",
    evidence: [{ name: "vendor-register-extract.pdf", size: "240 KB", type: "pdf" }],
    checklist: [
      { label: "Request new SOC 2 from vendor", done: true },
      { label: "Confirm scope mapping", done: false },
      { label: "Update vendor risk score", done: false },
    ],
    timeline: [
      { actor: "Priya Shah", action: "requested new report from Datadog", time: "5 h ago", tone: "primary" },
      { actor: "Vendor monitor", action: "expired SOC 2 evidence", time: "3 days ago", tone: "warning" },
    ],
    comments: [],
  },
  {
    id: "VL-3027",
    title: "Backup restore drill not executed in Q1",
    summary: "Quarterly backup restore drill for the EU region was missed. Policy requires evidence within 90 days.",
    severity: "medium",
    status: "open",
    framework: "ISO 27001",
    rule: "A.12.3 — Backup",
    department: "IT Operations",
    project: "ISO 27001 Surveillance",
    system: "Veeam · EU cluster",
    owner: { name: "Elena Martins", initials: "EM", role: "Compliance" },
    detectedAt: "5 days ago",
    updatedAt: "1 day ago",
    slaDeadline: "Mar 20",
    slaUrgent: false,
    riskScore: 38,
    impactedUsers: 0,
    rootCause: "Drill owner reassigned mid-quarter, ownership not transferred in calendar.",
    evidence: [],
    checklist: [
      { label: "Schedule drill", done: true },
      { label: "Execute restore", done: false },
      { label: "Submit evidence to queue", done: false },
    ],
    timeline: [
      { actor: "Elena Martins", action: "scheduled drill for Mar 18", time: "1 day ago", tone: "primary" },
      { actor: "Policy monitor", action: "flagged missed cadence", time: "5 days ago", tone: "warning" },
    ],
    comments: [],
  },
  {
    id: "VL-3019",
    title: "Endpoint MDM coverage gap — Contractors",
    summary: "12 contractor laptops detected without MDM enrollment over the past 14 days.",
    severity: "medium",
    status: "escalated",
    framework: "SOC 2",
    rule: "CC6.7 — Endpoint security",
    department: "IT Operations",
    project: "Q1 SOC 2 Audit",
    system: "Jamf · contractor pool",
    owner: { name: "Diego Romero", initials: "DR", role: "IT Admin" },
    detectedAt: "1 week ago",
    updatedAt: "2 days ago",
    slaDeadline: "Mar 22",
    slaUrgent: false,
    riskScore: 47,
    impactedUsers: 12,
    rootCause: "Contractor onboarding flow bypasses MDM enrollment when laptop is shipped pre-imaged.",
    evidence: [{ name: "jamf-coverage-report.pdf", size: "880 KB", type: "pdf" }],
    checklist: [
      { label: "Identify affected contractors", done: true },
      { label: "Force enrollment via email", done: true },
      { label: "Patch onboarding flow", done: false },
    ],
    timeline: [
      { actor: "Diego Romero", action: "escalated to Security", time: "2 days ago", tone: "warning" },
      { actor: "Jamf monitor", action: "detected coverage drop", time: "1 week ago", tone: "warning" },
    ],
    comments: [],
  },
  {
    id: "VL-3008",
    title: "Late incident notification — minor outage",
    summary: "Status page notification for the Feb 28 API degradation was published 47 minutes after threshold.",
    severity: "low",
    status: "resolved",
    framework: "Internal SLA",
    rule: "IR-2 — Communication timeliness",
    department: "Engineering",
    project: "Reliability",
    system: "Statuspage",
    owner: { name: "Sara Chen", initials: "SC", role: "Security Eng." },
    detectedAt: "2 weeks ago",
    updatedAt: "1 week ago",
    slaDeadline: "Resolved",
    slaUrgent: false,
    riskScore: 18,
    impactedUsers: 0,
    rootCause: "On-call engineer prioritized mitigation over comms; runbook order updated.",
    evidence: [{ name: "incident-postmortem.pdf", size: "320 KB", type: "pdf" }],
    checklist: [
      { label: "Update runbook ordering", done: true },
      { label: "Drill comms-first response", done: true },
    ],
    timeline: [
      { actor: "Sara Chen", action: "marked resolved", time: "1 week ago", tone: "success" },
      { actor: "On-call", action: "published postmortem", time: "10 days ago", tone: "primary" },
    ],
    comments: [],
  },
];
