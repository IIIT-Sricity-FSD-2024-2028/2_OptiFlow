import { useState } from "react";
import {
  Download,
  MoreHorizontal,
  FileText,
  FileSpreadsheet,
  FileCode,
  Search,
  Repeat,
  Star,
  Clock,
} from "lucide-react";
import { recentReports, reportTypes, type ReportFormat } from "./reports-data";

const formatIcon: Record<ReportFormat, typeof FileText> = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  csv: FileCode,
};

const formatTone: Record<ReportFormat, string> = {
  pdf: "text-destructive bg-destructive-soft",
  xlsx: "text-success bg-success-soft",
  csv: "text-primary bg-primary-soft",
};

type Tab = "all" | "mine" | "scheduled";

export function RecentReports() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  const filtered = recentReports.filter((r) => {
    if (tab === "mine" && r.generatedBy.initials !== "EM") return false;
    if (tab === "scheduled" && !r.scheduled) return false;
    if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: recentReports.length,
    mine: recentReports.filter((r) => r.generatedBy.initials === "EM").length,
    scheduled: recentReports.filter((r) => r.scheduled).length,
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card flex flex-col h-[calc(100vh-13rem)] min-h-[640px] overflow-hidden">
      {/* Header */}
      <div className="px-7 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
              Recent reports
            </h3>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              {filtered.length} of {recentReports.length} · synced 2 min ago
            </p>
          </div>
          <button className="text-[11.5px] font-medium text-primary hover:underline">
            View archive
          </button>
        </div>

        {/* Search + tabs */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary/60 border border-transparent focus:border-ring focus:bg-card focus:outline-none text-[12.5px] placeholder:text-muted-foreground transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-lg shrink-0">
            {(["all", "mine", "scheduled"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`h-7 px-2.5 rounded-md text-[11.5px] font-medium transition-all flex items-center gap-1.5 ${
                  tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "All" : t === "mine" ? "Mine" : "Scheduled"}
                <span className={`text-[10px] tabular-nums ${tab === t ? "text-primary" : "text-muted-foreground/70"}`}>
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filtered.map((r) => {
          const type = reportTypes.find((t) => t.id === r.typeId);
          const FmtIcon = formatIcon[r.format];
          const TypeIcon = type?.icon ?? FileText;
          return (
            <div
              key={r.id}
              className="group p-4 rounded-xl hover:bg-secondary/40 transition-colors mb-1 cursor-pointer"
            >
              <div className="flex items-start gap-3.5">
                {/* Type icon */}
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary-soft border border-primary/10 grid place-items-center shrink-0">
                  <TypeIcon className="h-4 w-4 text-primary" />
                </div>

                {/* Main */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-foreground leading-tight truncate">
                      {r.name}
                    </span>
                    {r.scheduled && (
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-primary bg-primary-soft px-1.5 py-0.5 rounded">
                        <Repeat className="h-2.5 w-2.5" />
                        Scheduled
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    {r.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium text-secondary-foreground bg-secondary/70 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Meta */}
                  <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-[8.5px] font-semibold text-white">
                        {r.generatedBy.initials}
                      </span>
                      {r.generatedBy.name}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="tabular-nums">{r.createdAt}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider text-[9.5px] ${formatTone[r.format]}`}>
                      <FmtIcon className="h-2.5 w-2.5" />
                      {r.format}
                    </span>
                    <span className="tabular-nums">{r.size}</span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-muted-foreground/80">
                    <span className="flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Last opened {r.lastAccessed}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="tabular-nums">{r.downloads} downloads</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button className="h-8 w-8 rounded-md hover:bg-card grid place-items-center text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                    <Star className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-8 w-8 rounded-md hover:bg-card grid place-items-center text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-8 px-2.5 rounded-md bg-card border border-border hover:border-primary/30 hover:text-primary text-foreground grid place-items-center transition-colors">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
            <div className="text-[13px] font-medium text-foreground">No reports here</div>
            <div className="text-[11.5px] text-muted-foreground mt-1">
              Try a different filter or generate one.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
