import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sidebar } from "@/components/compliance/Sidebar";
import { Topbar } from "@/components/compliance/Topbar";
import { RulesList, type RulesTab } from "@/components/rules/RulesList";
import { RuleDetail } from "@/components/rules/RuleDetail";
import { rulesData } from "@/components/rules/rules-data";
import { ChevronDown, Plus, Command } from "lucide-react";

export const Route = createFileRoute("/rules")({
  component: RulesPage,
  head: () => ({
    meta: [
      { title: "Compliance Rules · OfficeSync" },
      {
        name: "description",
        content:
          "Create, version and monitor compliance rules across frameworks. Visual logic builder, change history and related violations in one workspace.",
      },
      { property: "og:title", content: "Compliance Rules · OfficeSync" },
      {
        property: "og:description",
        content:
          "Premium rule library: conditions, triggers, evidence, version history and impact tracking.",
      },
    ],
  }),
});

function RulesPage() {
  const [selectedId, setSelectedId] = useState<string>(rulesData[0].id);
  const [tab, setTab] = useState<RulesTab>("active");
  const selected = rulesData.find((r) => r.id === selectedId) ?? rulesData[0];

  const active = rulesData.filter((r) => r.status === "active").length;
  const drafts = rulesData.filter((r) => r.status === "draft").length;
  const avgPass = Math.round(
    rulesData.filter((r) => r.status === "active").reduce((a, r) => a + r.passRate, 0) /
      Math.max(active, 1),
  );
  const openViolations = rulesData.reduce(
    (acc, r) => acc + r.relatedViolations.filter((v) => v.status !== "resolved").length,
    0,
  );

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
                  <span className="text-foreground font-medium">Rules</span>
                </div>
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground leading-[1.1]">
                  Compliance rules
                </h1>
                <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-xl">
                  Author, version and monitor the controls that keep every framework on track.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All frameworks
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All categories
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
                <button className="h-9 px-3.5 rounded-lg text-[12.5px] font-semibold text-primary-foreground bg-gradient-primary hover:opacity-95 transition-opacity flex items-center gap-1.5 shadow-card">
                  <Plus className="h-3.5 w-3.5" />
                  New rule
                </button>
              </div>
            </div>

            {/* KPI ribbon */}
            <div className="mt-7 flex items-center gap-10 flex-wrap">
              <Stat label="Active rules" value={active.toString()} tone="primary" sub={`across 4 frameworks`} />
              <Divider />
              <Stat label="Drafts in flight" value={drafts.toString()} tone="default" sub="awaiting publish" />
              <Divider />
              <Stat label="Avg. pass rate" value={`${avgPass}%`} tone={avgPass >= 95 ? "success" : "default"} sub="last 30 days" />
              <Divider />
              <Stat label="Open violations" value={openViolations.toString()} tone={openViolations > 0 ? "danger" : "success"} sub="across all rules" />
            </div>
          </div>
        </div>

        {/* Workspace */}
        <main className="flex-1">
          <div className="max-w-[1500px] w-full mx-auto px-8 pb-8">
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
              <div className="xl:col-span-3">
                <RulesList
                  items={rulesData}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  tab={tab}
                  onTabChange={setTab}
                />
              </div>
              <div className="xl:col-span-7">
                <RuleDetail rule={selected} />
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
