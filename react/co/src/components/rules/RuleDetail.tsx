import { useState } from "react";
import {
  Pencil,
  Copy,
  Archive,
  Send,
  MoreHorizontal,
  Sparkles,
  ShieldCheck,
  History,
  AlertTriangle,
  GitBranch,
  CheckCircle2,
  Clock,
  FileCheck2,
  ChevronRight,
  Plus,
  Equal,
  ChevronsUp,
  ChevronsDown,
  Search,
  XCircle,
  RotateCcw,
} from "lucide-react";
import type { Rule, RuleCondition, RuleStatus } from "./rules-data";

const statusBadge: Record<RuleStatus, string> = {
  active: "text-success bg-success-soft border-success/20",
  draft: "text-warning-foreground bg-warning-soft border-warning/30",
  archived: "text-muted-foreground bg-secondary border-border",
};

const statusLabel: Record<RuleStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};

const severityTone: Record<Rule["severity"], string> = {
  critical: "text-destructive bg-destructive-soft",
  high: "text-warning-foreground bg-warning-soft",
  medium: "text-primary bg-primary-soft",
  low: "text-muted-foreground bg-secondary",
};

const operatorIcon = {
  equals: Equal,
  greater_than: ChevronsUp,
  less_than: ChevronsDown,
  contains: Search,
  missing: XCircle,
};

const operatorLabel = {
  equals: "equals",
  greater_than: "greater than",
  less_than: "less than",
  contains: "contains",
  missing: "missing",
};

type Tab = "logic" | "history" | "violations";

export function RuleDetail({ rule }: { rule: Rule }) {
  const [tab, setTab] = useState<Tab>("logic");

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col h-[calc(100vh-13rem)] min-h-[640px] overflow-hidden">
      {/* Toolbar */}
      <div className="px-8 h-12 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{rule.code}</span>
          <span className="text-muted-foreground/40">·</span>
          <GitBranch className="h-3 w-3" />
          <span className="tabular-nums">{rule.version}</span>
          <span className="text-muted-foreground/40">·</span>
          <Clock className="h-3 w-3" />
          <span>Updated {rule.updated} by {rule.updatedBy}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="h-7 w-7 rounded-md hover:bg-secondary grid place-items-center text-muted-foreground hover:text-foreground transition-colors">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button className="h-7 w-7 rounded-md hover:bg-secondary grid place-items-center text-muted-foreground hover:text-foreground transition-colors">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-10 pt-9 pb-7">
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${statusBadge[rule.status]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel[rule.status]}
            </span>
            <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-medium px-2 py-1 rounded-md ${severityTone[rule.severity]}`}>
              {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)} severity
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-[10.5px] font-medium text-secondary-foreground">
              {rule.framework}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-[10.5px] font-medium text-secondary-foreground">
              {rule.category}
            </span>
            {rule.evidenceRequired && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-soft text-primary text-[10.5px] font-medium">
                <FileCheck2 className="h-3 w-3" />
                {rule.evidenceCount} evidence required
              </span>
            )}
          </div>

          <h2 className="text-[26px] font-semibold tracking-[-0.018em] text-foreground leading-[1.2]">
            {rule.title}
          </h2>
          <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed max-w-2xl">
            {rule.description}
          </p>

          {/* Quick stats */}
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
            <Stat label="Triggers (30d)" value={rule.triggers.toString()} />
            <Stat label="Pass rate" value={`${rule.passRate}%`} tone={rule.passRate >= 95 ? "success" : rule.passRate >= 85 ? "warning" : "danger"} />
            <Stat label="Open violations" value={rule.relatedViolations.filter((v) => v.status !== "resolved").length.toString()} tone={rule.relatedViolations.some((v) => v.status === "open") ? "danger" : "default"} />
            <Stat label="Versions" value={rule.versions.length.toString()} />
          </div>
        </div>

        {/* AI suggestion */}
        {rule.status === "active" && rule.passRate < 95 && (
          <div className="mx-10 mb-7 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-soft/80 via-card to-card p-5">
            <div className="flex items-start gap-3.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-primary grid place-items-center shrink-0 shadow-card">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-semibold text-foreground">
                    AI suggests — Tighten condition C2
                  </div>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    <span className="text-[10.5px] text-muted-foreground">Confidence</span>
                    <span className="text-[13px] font-semibold tabular-nums text-primary">87%</span>
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                  Pass rate dropped 4% over the last 30 days. Narrowing scope to privileged accounts only would lift pass rate to ~98% based on similar rules.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1 flex-1 rounded-full bg-card overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: "87%" }} />
                  </div>
                  <button className="text-[11px] font-medium text-primary hover:underline shrink-0">
                    Open in builder →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-10">
          <div className="flex items-center gap-1 border-b border-border">
            <TabButton active={tab === "logic"} onClick={() => setTab("logic")}>
              Logic & evidence
            </TabButton>
            <TabButton active={tab === "history"} onClick={() => setTab("history")}>
              Version history
              <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">{rule.versions.length}</span>
            </TabButton>
            <TabButton active={tab === "violations"} onClick={() => setTab("violations")}>
              Related violations
              <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">{rule.relatedViolations.length}</span>
            </TabButton>
          </div>

          {tab === "logic" && <LogicTab rule={rule} />}
          {tab === "history" && <HistoryTab rule={rule} />}
          {tab === "violations" && <ViolationsTab rule={rule} />}
        </div>
      </div>

      {/* Sticky decision dock */}
      <div className="border-t border-border px-7 py-3.5 bg-card flex items-center gap-2 shrink-0">
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </button>
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          {rule.status === "archived" ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </>
          ) : (
            <>
              <Archive className="h-3.5 w-3.5" />
              Archive
            </>
          )}
        </button>
        <div className="flex-1" />
        <button className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-foreground bg-secondary hover:bg-secondary/70 transition-colors flex items-center gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Edit rule
          <kbd className="text-[10px] bg-card px-1 py-0.5 rounded">E</kbd>
        </button>
        {rule.status === "draft" ? (
          <button className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-primary-foreground bg-gradient-primary hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-card">
            <Send className="h-3.5 w-3.5" />
            Publish rule
            <kbd className="text-[10px] bg-white/20 px-1 py-0.5 rounded">P</kbd>
          </button>
        ) : (
          <button className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-primary-foreground bg-gradient-primary hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-card">
            <GitBranch className="h-3.5 w-3.5" />
            New version
          </button>
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
      className={`relative px-3 py-2.5 text-[12.5px] font-medium transition-colors flex items-center ${
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

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning-foreground"
      : tone === "danger"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="bg-card px-4 py-3.5">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className={`text-[19px] font-semibold tracking-tight tabular-nums mt-1 ${cls}`}>
        {value}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
      {children}
    </div>
  );
}

function LogicTab({ rule }: { rule: Rule }) {
  return (
    <div className="pt-6 pb-8">
      {/* Owner + scope */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-5">
        <div>
          <SectionLabel>Owner</SectionLabel>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-[11.5px] font-semibold text-primary-foreground">
              {rule.owner.initials}
            </div>
            <div>
              <div className="text-[13px] font-medium text-foreground">{rule.owner.name}</div>
              <div className="text-[11.5px] text-muted-foreground">{rule.owner.role}</div>
            </div>
          </div>
        </div>
        <div>
          <SectionLabel>Scope</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {rule.scope.map((s) => (
              <span
                key={s}
                className="text-[11.5px] font-medium text-secondary-foreground bg-secondary px-2 py-1 rounded-md"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Conditions — visual logic blocks */}
      <div className="mt-9">
        <div className="flex items-center justify-between">
          <SectionLabel>Conditions</SectionLabel>
          <button className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" />
            Add condition
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {rule.conditions.map((c, i) => (
            <ConditionBlock key={c.id} condition={c} index={i} />
          ))}
        </div>
      </div>

      {/* Trigger logic */}
      <div className="mt-9">
        <SectionLabel>Trigger logic</SectionLabel>
        <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-4 flex items-start gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary-soft text-primary grid place-items-center shrink-0">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <p className="text-[12.5px] text-foreground leading-relaxed pt-0.5">
            {rule.triggerLogic}
          </p>
        </div>
      </div>

      {/* Required evidence */}
      <div className="mt-9">
        <SectionLabel>Required evidence · {rule.requiredEvidence.length}</SectionLabel>
        {rule.requiredEvidence.length > 0 ? (
          <div className="mt-3 space-y-2">
            {rule.requiredEvidence.map((e) => (
              <div
                key={e}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-secondary/40"
              >
                <div className="h-7 w-7 rounded-lg bg-card border border-border grid place-items-center text-muted-foreground shrink-0">
                  <FileCheck2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-[12.5px] text-foreground">{e}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-[12px] text-muted-foreground italic">
            No evidence required for this rule.
          </div>
        )}
      </div>
    </div>
  );
}

function ConditionBlock({ condition, index }: { condition: RuleCondition; index: number }) {
  const Icon = operatorIcon[condition.operator];
  return (
    <div className="group relative flex items-stretch rounded-xl border border-border bg-card hover:border-primary/30 transition-colors overflow-hidden">
      <div className="w-10 grid place-items-center bg-secondary/40 border-r border-border">
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          C{index + 1}
        </span>
      </div>
      <div className="flex-1 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12.5px] font-medium text-foreground">{condition.when}</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-soft text-primary">
          <Icon className="h-3 w-3" />
          <span className="text-[11px] font-medium">{operatorLabel[condition.operator]}</span>
        </div>
        <span className="text-[12.5px] font-mono text-foreground bg-secondary/60 px-2 py-0.5 rounded">
          {condition.value}
        </span>
      </div>
    </div>
  );
}

function HistoryTab({ rule }: { rule: Rule }) {
  return (
    <div className="pt-6 pb-8">
      <SectionLabel>Change log</SectionLabel>
      <div className="relative mt-4">
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />
        <div className="space-y-4">
          {rule.versions.map((v) => (
            <div key={v.version} className="relative flex gap-4">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center shrink-0 z-10 ${
                  v.current
                    ? "bg-primary text-primary-foreground ring-4 ring-primary-soft"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                <History className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-foreground tabular-nums">
                    {v.version}
                  </span>
                  {v.current && (
                    <span className="text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-success-soft text-success">
                      Current
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11.5px] text-muted-foreground">{v.date}</span>
                </div>
                <p className="text-[12.5px] text-foreground mt-1 leading-relaxed">{v.summary}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="h-5 w-5 rounded-full bg-secondary grid place-items-center text-[9px] font-semibold text-secondary-foreground">
                    {v.initials}
                  </div>
                  <span>{v.author}</span>
                  {!v.current && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <button className="text-primary hover:underline font-medium">
                        Compare to current
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ViolationsTab({ rule }: { rule: Rule }) {
  if (rule.relatedViolations.length === 0) {
    return (
      <div className="pt-6 pb-8">
        <div className="text-center py-12">
          <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-3" />
          <div className="text-[13px] font-medium text-foreground">No violations</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">
            This rule has not triggered any violations.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-8">
      <SectionLabel>Triggered violations · {rule.relatedViolations.length}</SectionLabel>
      <div className="mt-3 rounded-xl border border-border overflow-hidden">
        {rule.relatedViolations.map((v, i) => {
          const sevTone =
            v.severity === "critical"
              ? "text-destructive bg-destructive-soft"
              : v.severity === "high"
              ? "text-warning-foreground bg-warning-soft"
              : v.severity === "medium"
              ? "text-primary bg-primary-soft"
              : "text-muted-foreground bg-secondary";
          const statusTone =
            v.status === "open"
              ? "text-destructive"
              : v.status === "investigating"
              ? "text-warning-foreground"
              : "text-success";
          const StatusIcon = v.status === "resolved" ? CheckCircle2 : AlertTriangle;
          return (
            <button
              key={v.id}
              className={`w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-secondary/40 transition-colors ${
                i !== rule.relatedViolations.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${sevTone}`}>
                {v.severity}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">{v.title}</div>
                <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                  {v.id} · {v.when}
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${statusTone}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
