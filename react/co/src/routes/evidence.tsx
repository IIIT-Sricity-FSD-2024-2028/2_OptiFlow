import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "@/components/compliance/Sidebar";
import { Topbar } from "@/components/compliance/Topbar";
import { EvidenceQueueList, type EvidenceItem } from "@/components/evidence/EvidenceQueueList";
import { EvidencePreview } from "@/components/evidence/EvidencePreview";
import { evidenceData } from "@/components/evidence/evidence-data";
import { ChevronDown, Command } from "lucide-react";

export const Route = createFileRoute("/evidence")({
  component: EvidenceReview,
  head: () => ({
    meta: [
      { title: "Evidence Review · OfficeSync" },
      {
        name: "description",
        content:
          "Triage and review compliance evidence — approve, reject, escalate or flag duplicates with full audit traceability.",
      },
      { property: "og:title", content: "Evidence Review · OfficeSync" },
      {
        property: "og:description",
        content:
          "Premium compliance review workspace: queue, preview, AI risk scoring and activity timeline.",
      },
    ],
  }),
});

function EvidenceReview() {
  const [selectedId, setSelectedId] = useState<string>(evidenceData[0].id);
  const [tab, setTab] = useState<"pending" | "reviewed" | "flagged" | "all">("pending");
  const selected: EvidenceItem =
    evidenceData.find((e) => e.id === selectedId) ?? evidenceData[0];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />

        {/* Page header — calm and spacious */}
        <div className="bg-background">
          <div className="max-w-[1500px] w-full mx-auto px-8 pt-9 pb-6">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
                  <span>Compliance</span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-foreground font-medium">Evidence review</span>
                </div>
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground leading-[1.1]">
                  Evidence review
                </h1>
                <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-xl">
                  Triage submissions, verify controls and clear your queue with confidence.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All frameworks
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All departments
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="h-5 w-px bg-border mx-1" />
                <button className="h-9 px-3 rounded-lg bg-card border border-border text-[12.5px] text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 shadow-sm">
                  <Command className="h-3.5 w-3.5" />
                  Shortcuts
                  <kbd className="ml-1 text-[10px] text-muted-foreground bg-secondary px-1 py-0.5 rounded">
                    ⌘ /
                  </kbd>
                </button>
              </div>
            </div>

            {/* Slim KPI ribbon */}
            <div className="mt-7 flex items-center gap-10 flex-wrap">
              <Stat label="Pending today" value="23" tone="primary" sub="8 high priority" />
              <Divider />
              <Stat label="Overdue" value="3" tone="danger" sub="avg. 6h late" />
              <Divider />
              <Stat label="Avg. review time" value="11m" tone="default" sub="−18% vs last week" />
              <Divider />
              <Stat label="Approved this week" value="47" tone="success" sub="94% first-pass" />
            </div>
          </div>
        </div>

        {/* Workspace — clean 30/70 split */}
        <main className="flex-1">
          <div className="max-w-[1500px] w-full mx-auto px-8 pb-8">
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
              <div className="xl:col-span-3">
                <EvidenceQueueList
                  items={evidenceData}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  tab={tab}
                  onTabChange={setTab}
                />
              </div>
              <div className="xl:col-span-7">
                <EvidencePreview item={selected} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "primary" | "danger" | "success" | "default";
}) {
  const dot =
    tone === "primary"
      ? "bg-primary"
      : tone === "danger"
      ? "bg-destructive"
      : tone === "success"
      ? "bg-success"
      : "bg-muted-foreground/40";
  return (
    <div className="flex items-center gap-3">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <div className="text-[22px] font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          <div className="text-[11.5px] text-muted-foreground">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-8 w-px bg-border" />;
}
