import { Search, Inbox, CheckCircle2, Flag, LayoutList } from "lucide-react";

export type EvidenceItem = {
  id: string;
  title: string;
  description: string;
  submitter: { name: string; initials: string; role: string };
  department: string;
  project: string;
  framework: string;
  rule: string;
  submittedAt: string;
  deadline: string;
  deadlineUrgent: boolean;
  priority: "critical" | "high" | "medium" | "low";
  status: "pending" | "reviewed" | "flagged";
  riskScore: number;
  duplicate: boolean;
  files: { name: string; size: string; type: "pdf" | "sheet" | "doc" }[];
  workflow: number;
};

type Tab = "pending" | "reviewed" | "flagged" | "all";

const tabs: { key: Tab; label: string; icon: typeof Inbox }[] = [
  { key: "pending", label: "Pending", icon: Inbox },
  { key: "reviewed", label: "Reviewed", icon: CheckCircle2 },
  { key: "flagged", label: "Flagged", icon: Flag },
  { key: "all", label: "All", icon: LayoutList },
];

const priorityDot: Record<EvidenceItem["priority"], string> = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-muted-foreground/40",
};

function riskTone(score: number) {
  if (score >= 70) return "text-destructive";
  if (score >= 40) return "text-warning-foreground";
  return "text-success";
}

export function EvidenceQueueList({
  items,
  selectedId,
  onSelect,
  tab,
  onTabChange,
}: {
  items: EvidenceItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  tab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const counts = {
    pending: items.filter((i) => i.status === "pending").length,
    reviewed: items.filter((i) => i.status === "reviewed").length,
    flagged: items.filter((i) => i.status === "flagged").length,
    all: items.length,
  };
  const filtered = tab === "all" ? items : items.filter((it) => it.status === tab);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col h-[calc(100vh-13rem)] min-h-[640px] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold tracking-tight text-foreground">Inbox</h3>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {filtered.length} items
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search evidence…"
            className="w-full h-9 pl-9 pr-12 rounded-lg bg-secondary/60 border border-transparent focus:border-ring focus:bg-card focus:outline-none text-[12.5px] placeholder:text-muted-foreground transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
            /
          </kbd>
        </div>

        {/* Segmented tabs — pill style */}
        <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-lg">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`flex-1 h-7 rounded-md text-[11.5px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <span
                  className={`text-[10px] tabular-nums ${
                    active ? "text-primary" : "text-muted-foreground/70"
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.map((it) => {
          const active = it.id === selectedId;
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={`group relative w-full text-left px-3.5 py-3 rounded-xl transition-all mb-0.5 ${
                active
                  ? "bg-primary-soft/70"
                  : "hover:bg-secondary/60"
              }`}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary" />
              )}

              {/* Row 1: priority + id + deadline */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[it.priority]}`} />
                  <span className="text-[10.5px] font-medium tabular-nums text-muted-foreground">
                    {it.id}
                  </span>
                </div>
                <span
                  className={`text-[10.5px] font-medium tabular-nums flex items-center gap-1 ${
                    it.deadlineUrgent ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {it.deadlineUrgent && (
                    <span className="h-1 w-1 rounded-full bg-destructive animate-pulse" />
                  )}
                  {it.deadline}
                </span>
              </div>

              {/* Title */}
              <div className="text-[13px] font-medium text-foreground leading-snug line-clamp-1">
                {it.title}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                <span className="truncate flex-1">{it.submitter.name}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="shrink-0">{it.framework}</span>
                <span className={`shrink-0 font-medium tabular-nums ${riskTone(it.riskScore)}`}>
                  {it.riskScore}
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-3" />
            <div className="text-[13px] font-medium text-foreground">All clear</div>
            <div className="text-[11.5px] text-muted-foreground mt-1">
              Nothing waiting in this view.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
