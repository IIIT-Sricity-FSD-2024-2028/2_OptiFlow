import { useState } from "react";
import {
  Check,
  X,
  MessageSquare,
  ArrowUpRight,
  Sparkles,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  ScrollText,
  Download,
  Eye,
  MoreHorizontal,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  UserPlus,
  Send,
  RotateCcw,
  Lock,
  Activity,
} from "lucide-react";
import type { Violation } from "./violations-data";

function fileIcon(type: "pdf" | "sheet" | "doc" | "log") {
  if (type === "pdf") return FileText;
  if (type === "sheet") return FileSpreadsheet;
  if (type === "log") return ScrollText;
  return FileIcon;
}

const severityTone: Record<Violation["severity"], string> = {
  critical: "text-destructive bg-destructive-soft",
  high: "text-warning-foreground bg-warning-soft",
  medium: "text-primary bg-primary-soft",
  low: "text-muted-foreground bg-secondary",
};

const severityLabel: Record<Violation["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const statusTone: Record<Violation["status"], string> = {
  open: "text-destructive bg-destructive-soft",
  investigating: "text-primary bg-primary-soft",
  escalated: "text-warning-foreground bg-warning-soft",
  resolved: "text-success bg-success-soft",
};

const statusLabel: Record<Violation["status"], string> = {
  open: "Open",
  investigating: "Investigating",
  escalated: "Escalated",
  resolved: "Resolved",
};

type Tab = "investigation" | "activity" | "similar";

const similar = [
  { id: "VL-2891", title: "PII in unencrypted backup snapshot", framework: "GDPR", match: 84, decision: "Resolved · 6d" },
  { id: "VL-2754", title: "S3 bucket SSE drift after Terraform upgrade", framework: "SOC 2", match: 72, decision: "Resolved · 11d" },
  { id: "VL-2611", title: "Analytics export missing encryption header", framework: "GDPR", match: 58, decision: "Resolved · 22d" },
];

const toneClass = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-destructive-soft text-destructive",
  neutral: "bg-secondary text-muted-foreground",
};

export function ViolationDetail({ item }: { item: Violation }) {
  const [tab, setTab] = useState<Tab>("investigation");

  const risk =
    item.riskScore >= 70
      ? { label: "High risk", cls: "text-destructive", bar: "bg-destructive" }
      : item.riskScore >= 40
      ? { label: "Medium risk", cls: "text-warning-foreground", bar: "bg-warning" }
      : { label: "Low risk", cls: "text-success", bar: "bg-success" };

  const checklistDone = item.checklist.filter((c) => c.done).length;
  const checklistPct = item.checklist.length
    ? Math.round((checklistDone / item.checklist.length) * 100)
    : 0;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col h-[calc(100vh-13rem)] min-h-[640px] overflow-hidden">
      {/* Toolbar */}
      <div className="px-8 h-12 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{item.id}</span>
          <span className="text-muted-foreground/40">·</span>
          <Clock className="h-3 w-3" />
          <span>Detected {item.detectedAt}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>Updated {item.updatedAt}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="h-7 w-7 rounded-md hover:bg-secondary grid place-items-center text-muted-foreground transition-colors">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
          <button className="h-7 w-7 rounded-md hover:bg-secondary grid place-items-center text-muted-foreground transition-colors">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-10 pt-9 pb-7">
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2 py-1 rounded-md ${severityTone[item.severity]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {severityLabel[item.severity]} severity
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2 py-1 rounded-md ${statusTone[item.status]}`}
            >
              {statusLabel[item.status]}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-[10.5px] font-medium text-secondary-foreground">
              {item.framework}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-[10.5px] font-medium text-secondary-foreground">
              {item.department}
            </span>
            {item.slaUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive-soft text-destructive text-[10.5px] font-medium">
                <span className="h-1 w-1 rounded-full bg-destructive animate-pulse" />
                SLA {item.slaDeadline}
              </span>
            )}
          </div>

          <h2 className="text-[26px] font-semibold tracking-[-0.018em] text-foreground leading-[1.2]">
            {item.title}
          </h2>
          <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed max-w-3xl">
            {item.summary}
          </p>

          {/* Quick stats row */}
          <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickStat label="Risk score" value={item.riskScore.toString()} sub={risk.label} tone={risk.cls} />
            <QuickStat
              label="Impacted"
              value={item.impactedUsers >= 1000 ? `${(item.impactedUsers / 1000).toFixed(1)}k` : item.impactedUsers.toString()}
              sub="users / records"
            />
            <QuickStat label="Owner" value={item.owner.name} sub={item.owner.role} avatar={item.owner.initials} />
            <QuickStat
              label="Remediation"
              value={`${checklistPct}%`}
              sub={`${checklistDone}/${item.checklist.length} steps`}
              progress={checklistPct}
            />
          </div>
        </div>

        {/* AI remediation */}
        <div className="mx-10 mb-7 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-soft/80 via-card to-card p-5">
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shrink-0 shadow-card">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-semibold text-foreground">
                  AI suggests — Notify DPO and patch Terraform module
                </div>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-[10.5px] text-muted-foreground">Confidence</span>
                  <span className="text-[13px] font-semibold tabular-nums text-primary">89%</span>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                3 similar incidents resolved with this pattern in &lt;6h. DPO notification is the
                next blocking step toward SLA compliance.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1 flex-1 rounded-full bg-card overflow-hidden">
                  <div className="h-full bg-gradient-primary" style={{ width: "89%" }} />
                </div>
                <button className="text-[11px] font-medium text-primary hover:underline shrink-0">
                  Apply runbook →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-10">
          <div className="flex items-center gap-1 border-b border-border">
            <TabButton active={tab === "investigation"} onClick={() => setTab("investigation")}>
              Investigation
            </TabButton>
            <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
              Timeline & comments
            </TabButton>
            <TabButton active={tab === "similar"} onClick={() => setTab("similar")}>
              Similar incidents
            </TabButton>
          </div>

          {tab === "investigation" && <InvestigationTab item={item} risk={risk} />}
          {tab === "activity" && <ActivityTab item={item} />}
          {tab === "similar" && <SimilarTab />}
        </div>
      </div>

      {/* Sticky decision dock */}
      <div className="border-t border-border px-7 py-3.5 bg-card flex items-center gap-2 shrink-0 flex-wrap">
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Assign
        </button>
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" />
          Request evidence
        </button>
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Escalate
        </button>
        <div className="flex-1" />
        {item.status === "resolved" ? (
          <button className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reopen
          </button>
        ) : (
          <>
            <button className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-warning-foreground hover:bg-warning-soft transition-colors flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Mark contained
            </button>
            <button className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-primary-foreground bg-gradient-primary hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-card">
              <Check className="h-3.5 w-3.5" />
              Resolve case
              <kbd className="text-[10px] bg-white/20 px-1 py-0.5 rounded">⌘ ⏎</kbd>
            </button>
          </>
        )}
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

function InvestigationTab({
  item,
  risk,
}: {
  item: Violation;
  risk: { label: string; cls: string; bar: string };
}) {
  return (
    <div className="pt-6 pb-8">
      {/* Metadata */}
      <SectionLabel>Scope</SectionLabel>
      <div className="grid grid-cols-2 gap-x-10 gap-y-5 mt-4">
        <Meta label="Project" value={item.project} sub={item.department} />
        <Meta label="Affected system" value={item.system} mono />
        <Meta label="Linked rule" value={item.rule} sub={item.framework} />
        <Meta
          label="SLA deadline"
          value={item.slaDeadline}
          sub={item.slaUrgent ? "Under 8 hours" : "On track"}
          tone={item.slaUrgent ? "danger" : "default"}
        />
      </div>

      {/* Risk + auto checks */}
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
            Severity-weighted score across data sensitivity, blast radius and SLA pressure.
          </p>
        </div>

        <div>
          <SectionLabel>Containment checks</SectionLabel>
          <div className="mt-3 space-y-2">
            <CheckRow label="Exposure scope confirmed" passed />
            <CheckRow label="Access keys rotated" passed />
            <CheckRow label="DPO notification sent" passed={false} />
            <CheckRow label="Root cause patched" passed={false} />
          </div>
        </div>
      </div>

      {/* Root cause */}
      <div className="mt-9">
        <SectionLabel>Root cause</SectionLabel>
        <div className="mt-3 rounded-xl bg-secondary/40 p-4 text-[13px] text-foreground leading-relaxed">
          {item.rootCause}
        </div>
      </div>

      {/* Checklist */}
      <div className="mt-9">
        <SectionLabel>Resolution checklist</SectionLabel>
        <div className="mt-3 space-y-1.5">
          {item.checklist.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors group cursor-pointer"
            >
              <div
                className={`h-4 w-4 rounded-md grid place-items-center shrink-0 transition-colors ${
                  c.done
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border group-hover:border-primary/40"
                }`}
              >
                {c.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </div>
              <span
                className={`text-[12.5px] ${
                  c.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence */}
      {item.evidence.length > 0 && (
        <div className="mt-9">
          <div className="flex items-center justify-between">
            <SectionLabel>Evidence · {item.evidence.length}</SectionLabel>
            <button className="text-[11px] font-medium text-primary hover:underline">
              Open viewer
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {item.evidence.map((f) => {
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
      )}
    </div>
  );
}

const timelineIcon = {
  primary: Activity,
  success: ShieldCheck,
  warning: AlertTriangle,
  danger: AlertTriangle,
  neutral: MessageSquare,
};

function ActivityTab({ item }: { item: Violation }) {
  return (
    <div className="pt-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-10">
      <div>
        <SectionLabel>Timeline</SectionLabel>
        <div className="relative mt-4">
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />
          <div className="space-y-4">
            {item.timeline.map((e, i) => {
              const Icon = timelineIcon[e.tone];
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
                      <span className="text-muted-foreground">{e.action}</span>
                    </div>
                    {e.detail && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {e.detail}
                      </div>
                    )}
                    <div className="text-[10.5px] text-muted-foreground/70 mt-0.5">{e.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Comments</SectionLabel>
        <div className="mt-4 space-y-3">
          {item.comments.map((c, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-[10.5px] font-semibold text-primary-foreground shrink-0">
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] font-medium text-foreground">{c.author}</span>
                  <span className="text-[10.5px] text-muted-foreground">{c.time}</span>
                </div>
                <div className="text-[12.5px] text-foreground/90 leading-relaxed mt-1">
                  {c.text}
                </div>
              </div>
            </div>
          ))}
          {item.comments.length === 0 && (
            <div className="text-[12px] text-muted-foreground py-6 text-center">
              No comments yet — start the thread below.
            </div>
          )}

          <div className="mt-4 rounded-xl bg-secondary/40 p-4">
            <textarea
              placeholder="Add a comment for the case thread. @ to mention…"
              rows={2}
              className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-end mt-2">
              <button className="h-7 px-3 rounded-md text-[11.5px] font-medium text-primary-foreground bg-primary hover:opacity-95 transition-opacity">
                Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarTab() {
  return (
    <div className="pt-6 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <FileSearch className="h-3.5 w-3.5 text-muted-foreground" />
        <SectionLabel>Past incidents on this rule</SectionLabel>
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

function QuickStat({
  label,
  value,
  sub,
  tone,
  avatar,
  progress,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: string;
  avatar?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl bg-secondary/40 p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {avatar && (
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-[10px] font-semibold text-primary-foreground shrink-0">
            {avatar}
          </div>
        )}
        <div className={`text-[18px] font-semibold tracking-tight tabular-nums leading-none ${tone ?? "text-foreground"}`}>
          {value}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</div>
      {progress !== undefined && (
        <div className="mt-2 h-1 w-full rounded-full bg-card overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  sub,
  tone,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger";
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2">
        <div
          className={`text-[13px] font-medium leading-tight ${
            tone === "danger" ? "text-destructive" : "text-foreground"
          } ${mono ? "font-mono text-[12px] break-all" : ""}`}
        >
          {value}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
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
