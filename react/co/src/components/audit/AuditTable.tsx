import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Download,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Clock,
  X,
  ArrowRight,
  MapPin,
  Monitor,
  Globe,
  Hash,
  ExternalLink,
  Sparkles,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  auditEvents,
  type AuditEvent,
  type AuditOutcome,
  type AuditRisk,
  type AuditModule,
} from "./audit-data";

const outcomeStyle: Record<
  AuditOutcome,
  { icon: typeof CheckCircle2; cls: string; label: string }
> = {
  success: { icon: CheckCircle2, cls: "text-success bg-success-soft", label: "Success" },
  denied: { icon: XCircle, cls: "text-destructive bg-destructive-soft", label: "Denied" },
  warning: {
    icon: AlertTriangle,
    cls: "text-warning-foreground bg-warning-soft",
    label: "Warning",
  },
  info: { icon: Info, cls: "text-primary bg-primary-soft", label: "Info" },
};

const riskDot: Record<AuditRisk, string> = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-muted-foreground/40",
};

const riskLabel: Record<AuditRisk, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const modules: AuditModule[] = [
  "Evidence",
  "Violations",
  "Rules",
  "Reports",
  "Access",
  "System",
  "Settings",
];

export function AuditTable() {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<AuditModule | "all">("all");
  const [riskFilter, setRiskFilter] = useState<AuditRisk | "all">("all");
  const [outcomeFilter, setOutcomeFilter] = useState<AuditOutcome | "all">("all");
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const filtered = useMemo(() => {
    return auditEvents.filter((e) => {
      if (moduleFilter !== "all" && e.module !== moduleFilter) return false;
      if (riskFilter !== "all" && e.risk !== riskFilter) return false;
      if (outcomeFilter !== "all" && e.outcome !== outcomeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          e.action.toLowerCase().includes(q) ||
          e.actor.name.toLowerCase().includes(q) ||
          e.entity.label.toLowerCase().includes(q) ||
          e.entity.id.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [query, moduleFilter, riskFilter, outcomeFilter]);

  const suspiciousCount = filtered.filter((e) => e.suspicious).length;

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {/* Suspicious activity banner */}
        {suspiciousCount > 0 && (
          <div className="flex items-center gap-3 px-6 py-3 bg-destructive-soft/60 border-b border-destructive/20">
            <div className="h-8 w-8 rounded-lg bg-destructive/15 grid place-items-center shrink-0">
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-destructive">
                Suspicious activity detected
              </div>
              <div className="text-[11.5px] text-destructive/80 mt-0.5">
                {suspiciousCount} event{suspiciousCount > 1 ? "s" : ""} flagged by anomaly engine in the last 24 hours.
              </div>
            </div>
            <button className="text-[11.5px] font-semibold text-destructive hover:underline shrink-0">
              Review now →
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, action, entity ID, event ID…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary/60 border border-transparent focus:border-ring focus:bg-card focus:outline-none text-[12.5px] placeholder:text-muted-foreground transition-colors"
            />
          </div>

          <FilterDropdown
            label="Module"
            value={moduleFilter === "all" ? "All" : moduleFilter}
            options={["all", ...modules]}
            onSelect={(v) => setModuleFilter(v as AuditModule | "all")}
          />
          <FilterDropdown
            label="Risk"
            value={riskFilter === "all" ? "Any" : riskLabel[riskFilter as AuditRisk]}
            options={["all", "critical", "high", "medium", "low"]}
            onSelect={(v) => setRiskFilter(v as AuditRisk | "all")}
            renderOption={(o) =>
              o === "all" ? "Any" : riskLabel[o as AuditRisk]
            }
          />
          <FilterDropdown
            label="Outcome"
            value={outcomeFilter === "all" ? "Any" : outcomeStyle[outcomeFilter as AuditOutcome].label}
            options={["all", "success", "denied", "warning", "info"]}
            onSelect={(v) => setOutcomeFilter(v as AuditOutcome | "all")}
            renderOption={(o) => (o === "all" ? "Any" : outcomeStyle[o as AuditOutcome].label)}
          />

          <div className="h-5 w-px bg-border" />

          <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <button className="h-9 px-3 rounded-lg bg-card border border-border text-[12.5px] text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 shadow-sm">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 border-b border-border bg-secondary/30 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-4">Action · Entity</div>
          <div className="col-span-1">Module</div>
          <div className="col-span-1">Outcome</div>
          <div className="col-span-1">Risk</div>
          <div className="col-span-1 text-right">Event</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {filtered.map((e) => (
            <Row key={e.id} event={e} onClick={() => setSelected(e)} active={selected?.id === e.id} />
          ))}
          {filtered.length === 0 && (
            <div className="p-16 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
              <div className="text-[13px] font-medium text-foreground">No events match your filters</div>
              <div className="text-[11.5px] text-muted-foreground mt-1">
                Adjust filters or clear the search.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between text-[11.5px] text-muted-foreground">
          <div className="tabular-nums">
            Showing {filtered.length} of {auditEvents.length} events · last 24 hours
          </div>
          <div className="flex items-center gap-2">
            <button className="h-7 px-2.5 rounded-md hover:bg-secondary text-foreground transition-colors text-[11.5px] font-medium">
              Load older
            </button>
          </div>
        </div>
      </div>

      {selected && <DetailDrawer event={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function Row({
  event,
  onClick,
  active,
}: {
  event: AuditEvent;
  onClick: () => void;
  active: boolean;
}) {
  const Out = outcomeStyle[event.outcome];
  const isSystem = event.actor.initials === "SY";

  return (
    <button
      onClick={onClick}
      className={`group w-full grid grid-cols-12 gap-4 px-6 py-3.5 text-left items-center hover:bg-secondary/40 transition-colors ${
        active ? "bg-primary-soft/40" : ""
      } ${event.suspicious ? "bg-destructive-soft/20" : ""}`}
    >
      {/* Timestamp */}
      <div className="col-span-12 md:col-span-2 flex items-center gap-2 min-w-0">
        {event.suspicious && (
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-foreground tabular-nums">
            {event.time}
          </div>
          <div className="text-[10.5px] text-muted-foreground tabular-nums">{event.date}</div>
        </div>
      </div>

      {/* Actor */}
      <div className="col-span-12 md:col-span-2 flex items-center gap-2.5 min-w-0">
        <div
          className={`h-7 w-7 rounded-full grid place-items-center text-[10.5px] font-semibold shrink-0 ${
            isSystem
              ? "bg-secondary text-muted-foreground border border-border"
              : "bg-gradient-to-br from-primary to-primary/60 text-primary-foreground"
          }`}
        >
          {event.actor.initials}
        </div>
        <div className="min-w-0">
          <div className="text-[12.5px] font-medium text-foreground truncate">
            {event.actor.name}
          </div>
          <div className="text-[10.5px] text-muted-foreground truncate">{event.actor.role}</div>
        </div>
      </div>

      {/* Action + entity */}
      <div className="col-span-12 md:col-span-4 min-w-0">
        <div className="text-[12.5px] text-foreground leading-snug truncate">{event.action}</div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-muted-foreground min-w-0">
          <span className="font-mono tabular-nums shrink-0 px-1.5 py-0.5 bg-secondary/70 rounded">
            {event.entity.id}
          </span>
          <span className="truncate">{event.entity.label}</span>
        </div>
      </div>

      {/* Module */}
      <div className="col-span-6 md:col-span-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[11px] font-medium text-secondary-foreground">
          {event.module}
        </span>
      </div>

      {/* Outcome */}
      <div className="col-span-6 md:col-span-1">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${Out.cls}`}
        >
          <Out.icon className="h-3 w-3" />
          {Out.label}
        </span>
      </div>

      {/* Risk */}
      <div className="col-span-6 md:col-span-1">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${riskDot[event.risk]}`} />
          {riskLabel[event.risk]}
        </span>
      </div>

      {/* Event ID + chevron */}
      <div className="col-span-6 md:col-span-1 flex items-center justify-end gap-1 text-[10.5px] tabular-nums text-muted-foreground">
        <span className="font-mono">{event.id}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
      </div>
    </button>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
  renderOption,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  renderOption?: (o: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 rounded-lg text-[12.5px] text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 border border-border bg-card"
      >
        <Filter className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{value}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 right-0 min-w-[160px] rounded-lg bg-card border border-border shadow-lg p-1 space-y-0.5">
            {options.map((o) => {
              const display = renderOption ? renderOption(o) : o === "all" ? "All" : o;
              const active = (o === "all" ? "All" : display) === value || display === value;
              return (
                <button
                  key={o}
                  onClick={() => {
                    onSelect(o);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-[12px] hover:bg-secondary transition-colors ${
                    active ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {display}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function DetailDrawer({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  const Out = outcomeStyle[event.outcome];

  return (
    <>
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-screen w-full sm:w-[480px] bg-card shadow-elevated z-50 flex flex-col animate-in slide-in-from-right border-l border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span className="font-mono tabular-nums text-foreground font-medium">{event.id}</span>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-md hover:bg-secondary grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {event.suspicious && (
            <div className="mx-6 mt-5 rounded-xl border border-destructive/30 bg-destructive-soft/40 p-3.5 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-destructive">Flagged as suspicious</div>
                <div className="text-[11px] text-destructive/80 mt-0.5 leading-relaxed">
                  Anomaly engine detected this event matches known threat patterns.
                </div>
              </div>
            </div>
          )}

          {/* Hero */}
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[10.5px] font-medium text-secondary-foreground">
                {event.module}
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${Out.cls}`}>
                <Out.icon className="h-3 w-3" />
                {Out.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${riskDot[event.risk]}`} />
                {riskLabel[event.risk]} risk
              </span>
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-foreground leading-snug">
              {event.action}
            </h2>
            <div className="mt-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="tabular-nums">{event.date} · {event.time} UTC</span>
            </div>
          </div>

          {/* Actor card */}
          <div className="mx-6 mb-5 rounded-xl bg-secondary/40 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-[13px] font-semibold text-primary-foreground">
              {event.actor.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-foreground">{event.actor.name}</div>
              <div className="text-[11px] text-muted-foreground">{event.actor.role}</div>
              <div className="text-[10.5px] text-muted-foreground/80 mt-0.5">{event.actor.email}</div>
            </div>
          </div>

          {/* Entity */}
          <Section label="Affected entity">
            <a
              className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-primary/30 transition-colors"
              href="#"
            >
              <div className="h-9 w-9 rounded-lg bg-primary-soft text-primary grid place-items-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-foreground truncate">
                  {event.entity.label}
                </div>
                <div className="text-[10.5px] text-muted-foreground font-mono tabular-nums">
                  {event.entity.id}
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </Section>

          {/* Changes */}
          {event.changes && event.changes.length > 0 && (
            <Section label={`Before → After · ${event.changes.length} field${event.changes.length > 1 ? "s" : ""}`}>
              <div className="space-y-2">
                {event.changes.map((c) => (
                  <div key={c.field} className="rounded-xl border border-border p-3.5">
                    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      {c.field}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] text-muted-foreground line-through bg-destructive-soft/40 px-2 py-1 rounded font-mono">
                        {c.before ?? "—"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[12px] font-medium text-success bg-success-soft px-2 py-1 rounded font-mono">
                        {c.after ?? "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Notes */}
          {event.notes && (
            <Section label="Notes">
              <div className="rounded-xl bg-secondary/40 p-3.5 text-[12.5px] text-foreground leading-relaxed">
                {event.notes}
              </div>
            </Section>
          )}

          {/* Related */}
          {event.related && event.related.length > 0 && (
            <Section label="Related records">
              <div className="space-y-1">
                {event.related.map((r) => (
                  <a
                    key={r.id}
                    href="#"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/40 transition-colors"
                  >
                    <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground bg-secondary/70 px-1.5 py-0.5 rounded">
                      {r.id}
                    </span>
                    <span className="flex-1 text-[12px] text-foreground truncate">{r.label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Session metadata */}
          <Section label="Session metadata">
            <div className="rounded-xl border border-border divide-y divide-border">
              <MetaRow icon={Globe} label="IP address" value={event.ip} mono />
              <MetaRow icon={Monitor} label="Device" value={event.device} />
              <MetaRow icon={MapPin} label="Location" value={event.location} />
              <MetaRow icon={Hash} label="Session ID" value={event.sessionId} mono />
            </div>
          </Section>

          {/* AI insight */}
          <div className="mx-6 mb-6 rounded-xl border border-primary/15 bg-gradient-to-br from-primary-soft/70 to-card p-4">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-lg bg-gradient-primary grid place-items-center shadow-card shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-foreground">AI summary</div>
                <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">
                  {event.suspicious
                    ? "This event significantly deviates from the actor's normal behavior pattern. Recommend immediate review by security team."
                    : `Routine ${event.module.toLowerCase()} activity. ${event.actor.name} performs similar actions ${Math.floor(Math.random() * 8) + 3} times per week on average.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex items-center gap-2 shrink-0 bg-card">
          <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export event
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="h-9 px-3.5 rounded-lg text-[12.5px] font-medium text-foreground bg-secondary hover:bg-secondary/70 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-6 mb-5">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Globe;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11.5px] text-muted-foreground w-20 shrink-0">{label}</span>
      <span
        className={`text-[12px] text-foreground truncate flex-1 text-right ${
          mono ? "font-mono tabular-nums" : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
