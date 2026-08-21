import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  ScrollText,
  Building2,
  Users,
  TrendingUp,
  GitBranch,
} from "lucide-react";

export type ReportFormat = "pdf" | "xlsx" | "csv";

export type ReportType = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  category: "Compliance" | "Risk" | "Operational";
  estPages: number;
  popular?: boolean;
};

export type RecentReport = {
  id: string;
  name: string;
  typeId: string;
  format: ReportFormat;
  size: string;
  createdAt: string;
  lastAccessed: string;
  generatedBy: { name: string; initials: string };
  tags: string[];
  downloads: number;
  scheduled?: boolean;
};

export const reportTypes: ReportType[] = [
  {
    id: "soc2-readiness",
    name: "SOC 2 Readiness",
    description: "Full Type II readiness across all trust service criteria.",
    icon: ShieldCheck,
    category: "Compliance",
    estPages: 42,
    popular: true,
  },
  {
    id: "violations-summary",
    name: "Violations Summary",
    description: "Open, investigating and resolved violations by severity.",
    icon: AlertTriangle,
    category: "Risk",
    estPages: 18,
    popular: true,
  },
  {
    id: "evidence-coverage",
    name: "Evidence Coverage",
    description: "Evidence collected per rule with first-pass approval rate.",
    icon: FileCheck2,
    category: "Compliance",
    estPages: 24,
  },
  {
    id: "audit-trail",
    name: "Audit Trail Export",
    description: "Time-stamped log of every reviewer action and decision.",
    icon: ScrollText,
    category: "Operational",
    estPages: 56,
  },
  {
    id: "department-risk",
    name: "Department Risk",
    description: "Risk score, breach trend and SLA performance by department.",
    icon: Building2,
    category: "Risk",
    estPages: 12,
  },
  {
    id: "vendor-attestation",
    name: "Vendor Attestation",
    description: "Tier-1 vendor SOC 2 status and report freshness.",
    icon: Users,
    category: "Compliance",
    estPages: 9,
  },
  {
    id: "executive-brief",
    name: "Executive Brief",
    description: "One-page summary for board and leadership review.",
    icon: TrendingUp,
    category: "Operational",
    estPages: 4,
    popular: true,
  },
  {
    id: "rule-changes",
    name: "Rule Change Log",
    description: "Versioned diff of every rule edit, publish and archive.",
    icon: GitBranch,
    category: "Operational",
    estPages: 31,
  },
];

export const recentReports: RecentReport[] = [
  {
    id: "rep-204",
    name: "SOC 2 Readiness — Q1 2026",
    typeId: "soc2-readiness",
    format: "pdf",
    size: "4.2 MB",
    createdAt: "23 min ago",
    lastAccessed: "8 min ago",
    generatedBy: { name: "Elena Martins", initials: "EM" },
    tags: ["SOC 2", "Quarterly", "Board"],
    downloads: 12,
    scheduled: true,
  },
  {
    id: "rep-203",
    name: "Violations — Engineering · March",
    typeId: "violations-summary",
    format: "xlsx",
    size: "812 KB",
    createdAt: "2 hours ago",
    lastAccessed: "1 hour ago",
    generatedBy: { name: "Marcus Liu", initials: "ML" },
    tags: ["Engineering", "Monthly"],
    downloads: 5,
  },
  {
    id: "rep-202",
    name: "Audit Trail — Feb 1 → Mar 31",
    typeId: "audit-trail",
    format: "csv",
    size: "11.4 MB",
    createdAt: "Yesterday",
    lastAccessed: "Yesterday",
    generatedBy: { name: "Elena Martins", initials: "EM" },
    tags: ["Audit", "Export"],
    downloads: 3,
  },
  {
    id: "rep-201",
    name: "Executive Brief — Week 14",
    typeId: "executive-brief",
    format: "pdf",
    size: "1.1 MB",
    createdAt: "2 days ago",
    lastAccessed: "Yesterday",
    generatedBy: { name: "Elena Martins", initials: "EM" },
    tags: ["Weekly", "Board"],
    downloads: 18,
    scheduled: true,
  },
  {
    id: "rep-200",
    name: "Vendor Attestation — Tier 1",
    typeId: "vendor-attestation",
    format: "pdf",
    size: "2.6 MB",
    createdAt: "Mar 18",
    lastAccessed: "Mar 22",
    generatedBy: { name: "Priya Shah", initials: "PS" },
    tags: ["Vendor", "SOC 2"],
    downloads: 7,
  },
  {
    id: "rep-199",
    name: "Evidence Coverage — All Frameworks",
    typeId: "evidence-coverage",
    format: "xlsx",
    size: "3.4 MB",
    createdAt: "Mar 15",
    lastAccessed: "Mar 15",
    generatedBy: { name: "Sara Chen", initials: "SC" },
    tags: ["Coverage", "Quarterly"],
    downloads: 9,
  },
];
