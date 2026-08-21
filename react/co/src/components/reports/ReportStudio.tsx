import { useState } from "react";
import {
  Search,
  Sparkles,
  ChevronDown,
  Calendar as CalendarIcon,
  Repeat,
  FileText,
  FileSpreadsheet,
  FileCode,
  BarChart3,
  Send,
  Eye,
  Building2,
  ShieldCheck,
  Users,
  Filter,
} from "lucide-react";
import { reportTypes, type ReportType, type ReportFormat } from "./reports-data";

const formats: { key: ReportFormat; label: string; icon: typeof FileText; sub: string }[] = [
  { key: "pdf", label: "PDF", icon: FileText, sub: "Board-ready" },
  { key: "xlsx", label: "XLSX", icon: FileSpreadsheet, sub: "Pivot & filter" },
  { key: "csv", label: "CSV", icon: FileCode, sub: "Raw export" },
];

const dateRanges = ["Last 7 days", "Last 30 days", "This quarter", "Year to date", "Custom"];

export function ReportStudio() {
  const [selected, setSelected] = useState<ReportType>(reportTypes[0]);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [recurring, setRecurring] = useState(false);
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [query, setQuery] = useState("");

  const filtered = reportTypes.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.category.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col h-[calc(100vh-13rem)] min-h-[640px] overflow-hidden">
      {/* Toolbar */}
      <div className="px-7 h-12 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Generation studio
        </div>
        <button className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <Filter className="h-3 w-3" />
          Saved presets
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Step 1 — Type */}
        <Section step="1" title="Choose report type">
          <div className="relative mb-3">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 24 report templates…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary/60 border border-transparent focus:border-ring focus:bg-card focus:outline-none text-[12.5px] placeholder:text-muted-foreground transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filtered.map((r) => {
              const Icon = r.icon;
              const active = selected.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`group relative text-left p-3.5 rounded-xl border transition-all ${
                    active
                      ? "border-primary/40 bg-primary-soft/50 shadow-sm"
                      : "border-border bg-card hover:border-primary/20 hover:bg-secondary/40"
                  }`}
                >
                  {r.popular && (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold uppercase tracking-wider text-primary bg-card px-1.5 py-0.5 rounded">
                      Popular
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 transition-colors ${
                        active ? "bg-gradient-primary text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-semibold text-foreground leading-tight">
                        {r.name}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                        {r.description}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-secondary/70">{r.category}</span>
                        <span>·</span>
                        <span className="tabular-nums">~{r.estPages} pages</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Step 2 — Filters */}
        <Section step="2" title="Filters & scope">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FilterSelect label="Date range" value={dateRange} icon={CalendarIcon}>
              {dateRanges.map((d) => (
                <button
                  key={d}
                  onClick={() => setDateRange(d)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-[12px] hover:bg-secondary transition-colors ${
                    d === dateRange ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </FilterSelect>
            <FilterSelect label="Department" value="All departments" icon={Building2} />
            <FilterSelect label="Framework" value="SOC 2 · ISO 27001" icon={ShieldCheck} />
            <FilterSelect label="Owner" value="Anyone" icon={Users} />
          </div>
        </Section>

        {/* Step 3 — Format */}
        <Section step="3" title="Output format">
          <div className="grid grid-cols-3 gap-2.5">
            {formats.map((f) => {
              const Icon = f.icon;
              const active = format === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`relative p-3.5 rounded-xl border transition-all text-left ${
                    active
                      ? "border-primary/40 bg-primary-soft/50 shadow-sm"
                      : "border-border bg-card hover:border-primary/20"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="text-[12.5px] font-semibold text-foreground">{f.label}</div>
                  <div className="text-[10.5px] text-muted-foreground mt-0.5">{f.sub}</div>
                  {active && (
                    <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setRecurring((r) => !r)}
            className={`mt-3 w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
              recurring
                ? "border-primary/40 bg-primary-soft/40"
                : "border-border bg-card hover:bg-secondary/40"
            }`}
          >
            <div
              className={`h-7 w-7 rounded-lg grid place-items-center ${
                recurring ? "bg-gradient-primary text-primary-foreground shadow-card" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[12.5px] font-medium text-foreground">Schedule recurring</div>
              <div className="text-[10.5px] text-muted-foreground mt-0.5">
                {recurring ? "Every Monday · 9:00 AM · Email to team" : "Generate this report on a cadence"}
              </div>
            </div>
            <span
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                recurring ? "bg-primary" : "bg-secondary border border-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${
                  recurring ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        </Section>

        {/* Preview */}
        <div className="mx-7 mb-7 rounded-2xl border border-border bg-gradient-to-br from-secondary/30 to-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
              Preview summary
            </div>
            <button className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Full preview
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-card shrink-0">
              <selected.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-foreground leading-tight">
                {selected.name}
              </div>
              <div className="text-[11.5px] text-muted-foreground mt-1">
                {dateRange} · {format.toUpperCase()} · ~{selected.estPages} pages
              </div>
            </div>
          </div>

          {/* Mini chart preview */}
          <div className="mt-4 rounded-xl bg-card border border-border p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-medium">
                <BarChart3 className="h-3 w-3" />
                Included visualizations
              </div>
              <span className="text-[10.5px] text-muted-foreground tabular-nums">4 charts</span>
            </div>
            <div className="flex items-end gap-1 h-14">
              {[40, 65, 52, 78, 45, 68, 82, 71, 88, 64, 76, 92].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky generate dock */}
      <div className="border-t border-border px-7 py-3.5 bg-card flex items-center gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground">Estimated generation</div>
          <div className="text-[12.5px] font-semibold text-foreground">~12 seconds</div>
        </div>
        <button className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          Save preset
        </button>
        <button className="h-9 px-4 rounded-lg text-[12.5px] font-semibold text-primary-foreground bg-gradient-primary hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-card">
          <Send className="h-3.5 w-3.5" />
          Generate report
          <kbd className="text-[10px] bg-white/20 px-1 py-0.5 rounded">⌘ ⏎</kbd>
        </button>
      </div>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-7 pt-6 pb-1">
      <div className="flex items-center gap-2.5 mb-3.5">
        <span className="h-5 w-5 rounded-full bg-primary-soft text-primary grid place-items-center text-[10.5px] font-semibold tabular-nums">
          {step}
        </span>
        <div className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  icon: typeof CalendarIcon;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
        {label}
      </div>
      <button
        onClick={() => children && setOpen((o) => !o)}
        className="w-full h-10 px-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors flex items-center gap-2.5 text-left"
      >
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-[12.5px] text-foreground truncate">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
      {open && children && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full rounded-lg bg-card border border-border shadow-lg p-1 space-y-0.5">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
