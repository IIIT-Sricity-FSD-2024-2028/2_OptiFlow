import { useState } from "react";
import {
  Check,
  X,
  MessageSquare,
  Flag,
  ArrowUpRight,
  Sparkles,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Download,
  Eye,
  Copy,
  MoreHorizontal,
  Clock,
  ShieldCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
} from "lucide-react";
import type { EvidenceItem } from "./EvidenceQueueList";

const workflowSteps = ["Submitted", "Auto-checks", "In review", "Decision", "Archived"];

function fileIcon(type: "pdf" | "sheet" | "doc") {
  if (type === "pdf") return FileText;
  if (type === "sheet") return FileSpreadsheet;
  return FileIcon;
}

const priorityLabel: Record<EvidenceItem["priority"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityTone: Record<EvidenceItem["priority"], string> = {
  critical: "text-destructive bg-destructive-soft",
  high: "text-warning-foreground bg-warning-soft",
  medium: "text-primary bg-primary-soft",
  low: "text-muted-foreground bg-secondary",
};

type Tab = "details" | "activity" | "similar";

export function EvidencePreview({ item }: { item: EvidenceItem }) {
  const [tab, setTab] = useState<Tab>("details");

  const risk =
    item.riskScore >= 70
      ? { label: "High risk", cls: "text-destructive", bar: "bg-destructive" }
      : item.riskScore >= 40
      ? { label: "Medium risk", cls: "text-warning-foreground", bar: "bg-warning" }
      : { label: "Low risk", cls: "text-success", bar: "bg-success" };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col h-[calc(100vh-13rem)] min-h-[640px] overflow-hidden">
      {/* Toolbar */}
      <div className="px-8 h-12 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{item.id}</span>
          <span className="text-muted-foreground/40">·</span>
          <Clock className="h-3 w-3" />
          <span>Submitted {item.submittedAt}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="h-7 px-2.5 rounded-md hover:bg-secondary grid place-items-center text-[11.5px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
          <button className="h-7 w-7 rounded-md hover:bg-secondary grid place-items-center text-muted-foreground transition-colors">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero — generous breathing room */}
        <div className="px-10 pt-9 pb-7">
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2 py-1 rounded-md ${priorityTone[item.priority]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {priorityLabel[item.priority]} priority
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-[10.5px] font-medium text-secondary-foreground">
              {item.framework}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-[10.5px] font-medium text-secondary-foreground">
              {item.department}
            </span>
            {item.deadlineUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive-soft text-destructive text-[10.5px] font-medium">
                <span className="h-1 w-1 rounded-full bg-destructive animate-pulse" />
                Due {item.deadline}
              </span>
            )}
          </div>

          <h2 className="text-[26px] font-semibold tracking-[-0.018em] text-foreground leading-[1.2]">
            {item.title}
          </h2>
          <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed max-w-2xl">
            {item.description}
          </p>

          {/* Workflow tracker */}
          <div className="mt-8">
            <div className="flex items-center gap-1.5">
              {workflowSteps.map((step, i) => {
                const done = i < item.workflow;
                const current = i === item.workflow;
                return (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full ${
                      done ? "bg-primary" : current ? "bg-primary/30" : "bg-border"
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              {workflowSteps.map((step, i) => {
                const done = i < item.workflow;
                const current = i === item.workflow;
                return (
                  <div
                    key={step}
                    className={`flex-1 text-[10.5px] font-medium ${
                      current
                        ? "text-primary"
                        : done
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Duplicate alert — only when relevant */}
        {item.duplicate && (
          <div className="mx-10 mb-6 rounded-xl border border-warning/30 bg-warning-soft/50 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-warning/20 grid place-items-center shrink-0">
              <Copy className="h-3.5 w-3.5 text-warning-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-warning-foreground">
                Possible duplicate detected
              </div>
              <div className="text-[11.5px] text-warning-foreground/80 mt-0.5 leading-relaxed">
                78% similarity to <span className="font-medium">EV-2061 — Access review (Staging DB)</span>
              </div>
            </div>
            <button className="text-[11.5px] font-medium text-warning-foreground hover:underline shrink-0 self-center">
              Compare →
            </button>
          </div>
        )}

        {/* AI recommendation */}
        <div className="mx-10 mb-7 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-soft/80 via-card to-card p-5">
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shrink-0 shadow-card">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-semibold text-foreground">
                  AI recommends — Approve with note
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-[10.5px] text-muted-foreground">Confidence</span>
                  <span className="text-[13px] font-semibold tabular-nums text-primary">92%</span>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                Matches 14 prior {item.framework} approvals on this rule. Auto-checks passed. Submitter has a 96% first-pass rate.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1 flex-1 rounded-full bg-card overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: "92%" }} />
                </div>
                <button className="text-[11px] font-medium text-primary hover:underline shrink-0">
                  Apply template →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs — secondary content lives here, no separate columns */}
        <div className="px-10">
          <div className="flex items-center gap-1 border-b border-border">
            <TabButton active={tab === "details"} onClick={() => setTab("details")}>
              Details
            </TabButton>
            <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
              Activity
            </TabButton>
            <TabButton active={tab === "similar"} onClick={() => setTab("similar")}>
              Similar evidence
            </TabButton>
          </div>

          {tab === "details" && <DetailsTab item={item} risk={risk} />}
          {tab === "activity" && <ActivityTab />}
          {tab === "similar" && <SimilarTab />}
        </div>
      </div>

      {/* Sticky decision dock */}
      <div className="border-t border-border px-7 py-3.5 bg-card flex items-center gap-2 shrink-0">
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <Flag className="h-3.5 w-3.5" />
          Flag
        </button>
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Escalate
        </button>
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Request info
        </button>
        <div className="flex-1" />
        <button className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-destructive hover:bg-destructive-soft transition-colors flex items-center gap-1.5">
          <X className="h-3.5 w-3.5" />
          Reject
          <kbd className="text-[10px] bg-destructive/10 px-1 py-0.5 rounded">R</kbd>
        </button>
        <button className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-primary-foreground bg-gradient-primary hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-card">
          <Check className="h-3.5 w-3.5" />
          Approve
          <kbd className="text-[10px] bg-white/20 px-1 py-0.5 rounded">A</kbd>
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}

function DetailsTab({
  item,
  risk,
}: {
  item: EvidenceItem;
  risk: { label: string; cls: string; bar: string };
}) {
  return (
    <div className="pt-6 pb-8">
      {/* Metadata */}
      <SectionLabel>Submission</SectionLabel>
      <div className="grid grid-cols-2 gap-x-10 gap-y-5 mt-4">
        <Meta
          label="Submitter"
          value={item.submitter.name}
          sub={item.submitter.role}
          avatar={item.submitter.initials}
        />
        <Meta label="Project" value={item.project} sub={item.department} />
        <Meta label="Linked rule" value={item.rule} sub={item.framework} />
        <Meta
          label="SLA deadline"
          value={item.deadline}
          sub={item.deadlineUrgent ? "Under 8 hours" : "On track"}
          tone={item.deadlineUrgent ? "danger" : "default"}
        />
      </div>

      {/* Risk + auto-checks */}
      <div className="mt-9 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <SectionLabel>Risk signal</SectionLabel>
          <div className="mt-3 flex items-baseline gap-2">
            <div className={`text-[34px] font-semibold tracking-tight tabular-nums ${risk.cls}`}>
              {item.riskScore}
            </div>
            <div className={`text-[12px] font-medium ${risk.cls}`}>{risk.label}</div>
          </div>
          <div className="mt-2.5 h-1 w-full rounded-full bg-secondary overflow-hidden">
            <div className={`h-full ${risk.bar}`} style={{ width: `${item.riskScore}%` }} />
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-2.5 leading-relaxed">
            Late submission · prior overrides on same rule · similarity to EV-2061
          </p>
        </div>

        <div>
          <SectionLabel>Auto-checks</SectionLabel>
          <div className="mt-3 space-y-2">
            <CheckRow label="Digital signature valid" passed />
            <CheckRow label="Format & schema" passed />
            <CheckRow label="Freshness (within 90 days)" passed />
            <CheckRow label="Cross-reference duplicates" passed={!item.duplicate} />
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="mt-9">
        <div className="flex items-center justify-between">
          <SectionLabel>Attachments · {item.files.length}</SectionLabel>
          <button className="text-[11px] font-medium text-primary hover:underline">
            Open viewer
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {item.files.map((f) => {
            const Icon = fileIcon(f.type);
            return (
              <div
                key={f.name}
                className="group flex items-center gap-3 p-3.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                <div className="h-10 w-10 rounded-lg bg-card border border-border grid place-items-center text-muted-foreground shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-foreground truncate">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{f.size}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="h-7 w-7 rounded-md hover:bg-card grid place-items-center text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-7 w-7 rounded-md hover:bg-card grid place-items-center text-muted-foreground">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-9">
        <SectionLabel>Reviewer note</SectionLabel>
        <div className="mt-3 rounded-xl bg-secondary/40 p-4">
          <textarea
            placeholder="Add a note for the audit trail. @ to mention…"
            rows={2}
            className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

const events = [
  { icon: Eye, tone: "primary" as const, actor: "You", text: "opened this evidence", time: "Just now" },
  {
    icon: Sparkles,
    tone: "warning" as const,
    actor: "Risk engine",
    text: "flagged 78% similarity to EV-2061",
    time: "5 min ago",
  },
  {
    icon: MessageSquare,
    tone: "neutral" as const,
    actor: "Sara Chen",
    text: "noted: confirmed scope with vendor",
    time: "1 h ago",
  },
  {
    icon: ShieldCheck,
    tone: "success" as const,
    actor: "Auto-checks",
    text: "all signature & format checks passed",
    time: "2 h ago",
  },
  {
    icon: Upload,
    tone: "neutral" as const,
    actor: "Marcus Liu",
    text: "submitted with 2 attachments",
    time: "2 h ago",
  },
];

const toneClass = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-destructive-soft text-destructive",
  neutral: "bg-secondary text-muted-foreground",
};

function ActivityTab() {
  const recent = [
    { id: "EV-2087", action: "Approved", icon: CheckCircle2, cls: "text-success", when: "12 min ago" },
    { id: "EV-2086", action: "Requested info", icon: MessageSquare, cls: "text-warning-foreground", when: "34 min ago" },
    { id: "EV-2084", action: "Approved", icon: CheckCircle2, cls: "text-success", when: "1 h ago" },
    { id: "EV-2081", action: "Rejected", icon: AlertTriangle, cls: "text-destructive", when: "2 h ago" },
  ];

  return (
    <div className="pt-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-10">
      <div>
        <SectionLabel>Timeline</SectionLabel>
        <div className="relative mt-4">
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
          <div className="space-y-4">
            {events.map((e, i) => {
              const Icon = e.icon;
              return (
                <div key={i} className="relative flex gap-3">
                  <div
                    className={`relative z-10 h-[22px] w-[22px] rounded-full grid place-items-center ring-[3px] ring-card ${toneClass[e.tone]}`}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="text-[12px] text-foreground leading-snug">
                      <span className="font-medium">{e.actor}</span>{" "}
                      <span className="text-muted-foreground">{e.text}</span>
                    </div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">{e.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Your recent decisions</SectionLabel>
        <div className="mt-4 space-y-0.5">
          {recent.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <Icon className={`h-3.5 w-3.5 ${r.cls}`} />
                <div className="text-[12px] font-medium text-foreground tabular-nums flex-1">
                  {r.id}
                </div>
                <div className="text-[11px] text-muted-foreground">{r.action}</div>
                <div className="text-[11px] text-muted-foreground/60">·</div>
                <div className="text-[11px] text-muted-foreground">{r.when}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SimilarTab() {
  const similar = [
    { id: "EV-2061", title: "Access review — Staging DB", framework: "SOC 2", match: 78, decision: "Approved" },
    { id: "EV-1987", title: "Q4 access review", framework: "SOC 2", match: 64, decision: "Approved" },
    { id: "EV-1842", title: "Access review — Analytics DB", framework: "SOC 2", match: 51, decision: "Approved with note" },
  ];

  return (
    <div className="pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <FileSearch className="h-3.5 w-3.5 text-muted-foreground" />
        <SectionLabel>Past evidence on this rule</SectionLabel>
      </div>
      <div className="space-y-1.5">
        {similar.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                {s.title}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                {s.id} · {s.framework} · {s.decision}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-1 w-20 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${s.match}%` }} />
              </div>
              <span className="text-[11.5px] font-semibold tabular-nums text-primary w-10 text-right">
                {s.match}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </div>
  );
}

function Meta({
  label,
  value,
  sub,
  tone,
  avatar,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger";
  avatar?: string;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        {avatar && (
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-[10.5px] font-semibold text-primary-foreground shrink-0">
            {avatar}
          </div>
        )}
        <div className="min-w-0">
          <div
            className={`text-[13px] font-medium leading-tight ${
              tone === "danger" ? "text-destructive" : "text-foreground"
            }`}
          >
            {value}
          </div>
          {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`h-4 w-4 rounded-full grid place-items-center ${
          passed ? "bg-success-soft text-success" : "bg-warning-soft text-warning-foreground"
        }`}
      >
        {passed ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
      </div>
      <span className={`text-[12px] ${passed ? "text-foreground" : "text-warning-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
