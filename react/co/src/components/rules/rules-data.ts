export type RuleStatus = "active" | "draft" | "archived";
export type RuleSeverity = "critical" | "high" | "medium" | "low";

export type RuleCondition = {
  id: string;
  when: string;
  operator: "equals" | "greater_than" | "less_than" | "contains" | "missing";
  value: string;
};

export type RuleVersion = {
  version: string;
  author: string;
  initials: string;
  date: string;
  summary: string;
  current?: boolean;
};

export type RelatedViolation = {
  id: string;
  title: string;
  severity: RuleSeverity;
  when: string;
  status: "open" | "resolved" | "investigating";
};

export type Rule = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  framework: string;
  status: RuleStatus;
  severity: RuleSeverity;
  scope: string[];
  evidenceRequired: boolean;
  evidenceCount: number;
  owner: { name: string; initials: string; role: string };
  updated: string;
  updatedBy: string;
  version: string;
  triggers: number;
  passRate: number;
  conditions: RuleCondition[];
  triggerLogic: string;
  requiredEvidence: string[];
  versions: RuleVersion[];
  relatedViolations: RelatedViolation[];
};

export const ruleCategories = [
  "Access Control",
  "Data Protection",
  "Vendor Risk",
  "Incident Response",
  "Change Management",
  "Business Continuity",
];

export const rulesData: Rule[] = [
  {
    id: "r-001",
    code: "ACR-014",
    title: "Quarterly access review for production systems",
    description:
      "All privileged production access must be reviewed and re-attested by the system owner every 90 days. Stale or orphaned accounts must be revoked within 5 business days of detection.",
    category: "Access Control",
    framework: "SOC 2",
    status: "active",
    severity: "critical",
    scope: ["Engineering", "Platform Ops", "Security"],
    evidenceRequired: true,
    evidenceCount: 3,
    owner: { name: "Marcus Liu", initials: "ML", role: "Security Lead" },
    updated: "2 days ago",
    updatedBy: "Marcus Liu",
    version: "v3.2",
    triggers: 142,
    passRate: 96,
    conditions: [
      { id: "c1", when: "Days since last review", operator: "greater_than", value: "90" },
      { id: "c2", when: "Account status", operator: "equals", value: "active" },
      { id: "c3", when: "Privilege level", operator: "contains", value: "admin, root, sudo" },
    ],
    triggerLogic: "ALL conditions must match → create evidence request to system owner",
    requiredEvidence: [
      "Signed attestation form",
      "Exported access list with timestamps",
      "Manager approval (for elevated roles)",
    ],
    versions: [
      {
        version: "v3.2",
        author: "Marcus Liu",
        initials: "ML",
        date: "2 days ago",
        summary: "Added sudo to privilege detection list",
        current: true,
      },
      {
        version: "v3.1",
        author: "Sara Chen",
        initials: "SC",
        date: "Mar 4",
        summary: "Tightened review window from 120 to 90 days",
      },
      { version: "v3.0", author: "Marcus Liu", initials: "ML", date: "Feb 12", summary: "Major rewrite for SOC 2 Type II" },
      { version: "v2.4", author: "Priya Shah", initials: "PS", date: "Jan 8", summary: "Added platform ops to scope" },
    ],
    relatedViolations: [
      { id: "VIO-2104", title: "3 stale admin accounts in prod-db", severity: "high", when: "4 h ago", status: "investigating" },
      { id: "VIO-2087", title: "Missed Q1 review — payments cluster", severity: "critical", when: "Yesterday", status: "open" },
      { id: "VIO-2061", title: "Late attestation — staging DB", severity: "medium", when: "Mar 18", status: "resolved" },
    ],
  },
  {
    id: "r-002",
    code: "DAT-008",
    title: "Encryption-at-rest for customer PII",
    description:
      "All datastores containing customer personally identifiable information must use AES-256 encryption at rest with keys rotated every 12 months.",
    category: "Data Protection",
    framework: "ISO 27001",
    status: "active",
    severity: "critical",
    scope: ["Engineering", "Data Platform"],
    evidenceRequired: true,
    evidenceCount: 2,
    owner: { name: "Sara Chen", initials: "SC", role: "Data Protection Officer" },
    updated: "5 days ago",
    updatedBy: "Sara Chen",
    version: "v2.1",
    triggers: 87,
    passRate: 99,
    conditions: [
      { id: "c1", when: "Datastore tag", operator: "contains", value: "pii" },
      { id: "c2", when: "Encryption algorithm", operator: "equals", value: "AES-256" },
      { id: "c3", when: "Key age (months)", operator: "less_than", value: "12" },
    ],
    triggerLogic: "Any condition fails → create critical violation, page on-call",
    requiredEvidence: ["KMS key policy export", "Quarterly encryption audit report"],
    versions: [
      { version: "v2.1", author: "Sara Chen", initials: "SC", date: "5 days ago", summary: "Reduced key rotation to 12 months", current: true },
      { version: "v2.0", author: "Sara Chen", initials: "SC", date: "Feb 1", summary: "Aligned with ISO 27001:2022" },
      { version: "v1.3", author: "Marcus Liu", initials: "ML", date: "Nov 12", summary: "Initial production version" },
    ],
    relatedViolations: [
      { id: "VIO-2098", title: "Analytics replica missing encryption tag", severity: "high", when: "2 days ago", status: "resolved" },
    ],
  },
  {
    id: "r-003",
    code: "VND-021",
    title: "Annual SOC 2 attestation from critical vendors",
    description:
      "Tier-1 vendors processing customer data must provide a current SOC 2 Type II report annually, no more than 13 months old.",
    category: "Vendor Risk",
    framework: "SOC 2",
    status: "active",
    severity: "high",
    scope: ["Procurement", "Security", "Legal"],
    evidenceRequired: true,
    evidenceCount: 1,
    owner: { name: "Priya Shah", initials: "PS", role: "Vendor Risk Manager" },
    updated: "1 week ago",
    updatedBy: "Priya Shah",
    version: "v1.8",
    triggers: 54,
    passRate: 88,
    conditions: [
      { id: "c1", when: "Vendor tier", operator: "equals", value: "1" },
      { id: "c2", when: "SOC 2 report age (months)", operator: "less_than", value: "13" },
    ],
    triggerLogic: "Report missing or stale → notify vendor manager 60 days before expiry",
    requiredEvidence: ["Signed SOC 2 Type II report (PDF)"],
    versions: [
      { version: "v1.8", author: "Priya Shah", initials: "PS", date: "1 week ago", summary: "Added 60-day pre-expiry warning", current: true },
      { version: "v1.7", author: "Priya Shah", initials: "PS", date: "Feb 22", summary: "Clarified Tier 1 definition" },
    ],
    relatedViolations: [
      { id: "VIO-2103", title: "Stripe SOC 2 report not yet received", severity: "medium", when: "Today", status: "open" },
      { id: "VIO-2076", title: "Datadog report 14 months old", severity: "high", when: "Mar 12", status: "investigating" },
    ],
  },
  {
    id: "r-004",
    code: "INC-003",
    title: "Incident response — 1 hour acknowledgement SLA",
    description:
      "Sev-1 and Sev-2 incidents must be acknowledged by an on-call engineer within 60 minutes of detection. Resolution post-mortem due within 5 business days.",
    category: "Incident Response",
    framework: "SOC 2",
    status: "active",
    severity: "high",
    scope: ["Engineering", "Platform Ops"],
    evidenceRequired: true,
    evidenceCount: 2,
    owner: { name: "Elena Martins", initials: "EM", role: "Compliance Officer" },
    updated: "Yesterday",
    updatedBy: "Elena Martins",
    version: "v4.0",
    triggers: 28,
    passRate: 92,
    conditions: [
      { id: "c1", when: "Incident severity", operator: "contains", value: "sev-1, sev-2" },
      { id: "c2", when: "Time to acknowledge (min)", operator: "less_than", value: "60" },
    ],
    triggerLogic: "SLA breach → auto-create violation, notify VP Engineering",
    requiredEvidence: ["PagerDuty timeline export", "Post-mortem document"],
    versions: [
      { version: "v4.0", author: "Elena Martins", initials: "EM", date: "Yesterday", summary: "Tightened ack SLA from 90 to 60 minutes", current: true },
      { version: "v3.5", author: "Marcus Liu", initials: "ML", date: "Jan 24", summary: "Added Sev-2 to scope" },
    ],
    relatedViolations: [
      { id: "VIO-2099", title: "Sev-2 ack at 78 minutes — payments", severity: "medium", when: "3 days ago", status: "resolved" },
    ],
  },
  {
    id: "r-005",
    code: "CHG-012",
    title: "Production change must have peer review",
    description:
      "All production deployments require at least one peer-approved pull request review and a passing CI pipeline before merge.",
    category: "Change Management",
    framework: "SOC 2",
    status: "draft",
    severity: "medium",
    scope: ["Engineering"],
    evidenceRequired: false,
    evidenceCount: 0,
    owner: { name: "Marcus Liu", initials: "ML", role: "Security Lead" },
    updated: "3 hours ago",
    updatedBy: "Marcus Liu",
    version: "v0.3",
    triggers: 0,
    passRate: 0,
    conditions: [
      { id: "c1", when: "Branch target", operator: "equals", value: "main" },
      { id: "c2", when: "Approving reviews", operator: "greater_than", value: "0" },
      { id: "c3", when: "CI status", operator: "equals", value: "passed" },
    ],
    triggerLogic: "Missing approval or failing CI → block merge, log audit event",
    requiredEvidence: [],
    versions: [
      { version: "v0.3", author: "Marcus Liu", initials: "ML", date: "3 hours ago", summary: "Added CI pipeline check", current: true },
      { version: "v0.2", author: "Marcus Liu", initials: "ML", date: "Yesterday", summary: "Initial draft" },
    ],
    relatedViolations: [],
  },
  {
    id: "r-006",
    code: "BCP-005",
    title: "Quarterly disaster recovery drill",
    description:
      "Production restoration from backup must be tested and documented every 90 days with a recovery time objective under 4 hours.",
    category: "Business Continuity",
    framework: "ISO 27001",
    status: "active",
    severity: "medium",
    scope: ["Platform Ops", "Engineering"],
    evidenceRequired: true,
    evidenceCount: 2,
    owner: { name: "Priya Shah", initials: "PS", role: "Vendor Risk Manager" },
    updated: "2 weeks ago",
    updatedBy: "Priya Shah",
    version: "v2.3",
    triggers: 12,
    passRate: 100,
    conditions: [
      { id: "c1", when: "Days since last drill", operator: "less_than", value: "90" },
      { id: "c2", when: "Recovery time (hours)", operator: "less_than", value: "4" },
    ],
    triggerLogic: "All conditions pass → mark control attested for the quarter",
    requiredEvidence: ["Drill timeline log", "Recovery validation checklist"],
    versions: [
      { version: "v2.3", author: "Priya Shah", initials: "PS", date: "2 weeks ago", summary: "Added recovery time objective", current: true },
      { version: "v2.2", author: "Sara Chen", initials: "SC", date: "Feb 4", summary: "Quarterly cadence formalized" },
    ],
    relatedViolations: [],
  },
  {
    id: "r-007",
    code: "ACR-009",
    title: "MFA for all administrative consoles",
    description:
      "All admin consoles (cloud, identity, payment) must enforce phishing-resistant MFA. SMS-based MFA is not acceptable.",
    category: "Access Control",
    framework: "SOC 2",
    status: "active",
    severity: "critical",
    scope: ["Security", "Engineering", "Platform Ops"],
    evidenceRequired: true,
    evidenceCount: 1,
    owner: { name: "Marcus Liu", initials: "ML", role: "Security Lead" },
    updated: "Mar 8",
    updatedBy: "Marcus Liu",
    version: "v5.1",
    triggers: 218,
    passRate: 98,
    conditions: [
      { id: "c1", when: "MFA enforcement", operator: "equals", value: "required" },
      { id: "c2", when: "MFA factor type", operator: "missing", value: "sms" },
    ],
    triggerLogic: "Any console without phishing-resistant MFA → critical violation",
    requiredEvidence: ["IdP MFA policy export"],
    versions: [
      { version: "v5.1", author: "Marcus Liu", initials: "ML", date: "Mar 8", summary: "Removed SMS as accepted factor", current: true },
      { version: "v5.0", author: "Marcus Liu", initials: "ML", date: "Jan 14", summary: "Added phishing-resistant requirement" },
    ],
    relatedViolations: [
      { id: "VIO-2095", title: "Legacy admin console allows SMS MFA", severity: "critical", when: "1 week ago", status: "open" },
    ],
  },
  {
    id: "r-008",
    code: "DAT-011",
    title: "Data retention — purge customer logs after 30 days",
    description:
      "Application logs containing customer identifiers must be purged from hot storage within 30 days and from cold storage within 12 months.",
    category: "Data Protection",
    framework: "GDPR",
    status: "archived",
    severity: "low",
    scope: ["Engineering", "Data Platform"],
    evidenceRequired: false,
    evidenceCount: 0,
    owner: { name: "Sara Chen", initials: "SC", role: "Data Protection Officer" },
    updated: "Jan 30",
    updatedBy: "Sara Chen",
    version: "v1.4",
    triggers: 0,
    passRate: 0,
    conditions: [
      { id: "c1", when: "Log age (days)", operator: "greater_than", value: "30" },
      { id: "c2", when: "Storage tier", operator: "equals", value: "hot" },
    ],
    triggerLogic: "Superseded by DAT-014 (unified retention policy)",
    requiredEvidence: [],
    versions: [
      { version: "v1.4", author: "Sara Chen", initials: "SC", date: "Jan 30", summary: "Archived — replaced by DAT-014", current: true },
      { version: "v1.3", author: "Sara Chen", initials: "SC", date: "Dec 4", summary: "Extended cold storage to 12 months" },
    ],
    relatedViolations: [],
  },
];
