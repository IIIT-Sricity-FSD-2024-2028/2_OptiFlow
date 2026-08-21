import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "@/components/compliance/Sidebar";
import { Topbar } from "@/components/compliance/Topbar";
import { ViolationsList, type ViolationsTab } from "@/components/violations/ViolationsList";
import { ViolationDetail } from "@/components/violations/ViolationDetail";
import { violationsData, type Violation } from "@/components/violations/violations-data";
import { ChevronDown, Command } from "lucide-react";

export const Route = createFileRoute("/violations")({
  component: ViolationsPage,
  head: () => ({
    meta: [
      { title: "Violations · OfficeSync" },
      {
        name: "description",
        content:
          "Triage, investigate and resolve compliance violations with SLA tracking, AI-suggested remediation and full audit traceability.",
      },
      { property: "og:title", content: "Violations · OfficeSync" },
      {
        property: "og:description",
        content:
          "Premium violation management workspace: case queue, investigation studio, remediation checklist and timeline.",
      },
    ],
  }),
});

function ViolationsPage() {
  const [selectedId, setSelectedId] = useState<string>(violationsData[0].id);
  const [tab, setTab] = useState<ViolationsTab>("open");
  const selected: Violation =
    violationsData.find((v) => v.id === selectedId) ?? violationsData[0];

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />

        {/* Page header */}
        <div className="bg-background">
          <div className="max-w-[1500px] w-full mx-auto px-8 pt-9 pb-6">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
                  <span>Compliance</span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-foreground font-medium">Violations</span>
                </div>
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground leading-[1.1]">
                  Violations
                </h1>
                <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-xl">
                  Investigate active incidents, track remediation, and close cases with full audit
                  traceability.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All severities
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All frameworks
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All owners
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

            {/* KPI ribbon */}
            <div className="mt-7 flex items-center gap-10 flex-wrap">
              <Stat label="Open cases" value="7" tone="primary" sub="2 critical" />
              <Divider />
              <Stat label="Critical" value="2" tone="danger" sub="both within SLA" />
              <Divider />
              <Stat label="Overdue SLAs" value="1" tone="danger" sub="6h late" />
              <Divider />
              <Stat label="Avg. resolution" value="3.2d" tone="default" sub="−14% vs last week" />
              <Divider />
              <Stat label="Resolved this week" value="11" tone="success" sub="92% within SLA" />
            </div>
          </div>
        </div>

        {/* Workspace 30/70 */}
        <main className="flex-1">
          <div className="max-w-[1500px] w-full mx-auto px-8 pb-8">
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
              <div className="xl:col-span-3">
                <ViolationsList
                  items={violationsData}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  tab={tab}
                  onTabChange={setTab}
                />
              </div>
              <div className="xl:col-span-7">
                <ViolationDetail item={selected} />
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
