import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/compliance/Sidebar";
import { Topbar } from "@/components/compliance/Topbar";
import { AuditTable } from "@/components/audit/AuditTable";
import { ChevronDown, Command, Calendar } from "lucide-react";

export const Route = createFileRoute("/audit")({
  component: AuditPage,
  head: () => ({
    meta: [
      { title: "Audit Log · OfficeSync" },
      {
        name: "description",
        content:
          "Forensic-grade audit log of every compliance action, system event, before/after change and access attempt.",
      },
      { property: "og:title", content: "Audit Log · OfficeSync" },
      {
        property: "og:description",
        content:
          "Tamper-evident audit trail with anomaly detection, before/after diffs and full session metadata.",
      },
    ],
  }),
});

function AuditPage() {
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
                  <span className="text-foreground font-medium">Audit log</span>
                </div>
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground leading-[1.1]">
                  Audit log
                </h1>
                <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-xl">
                  Tamper-evident record of every action across OfficeSync — actors, changes, and outcomes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Last 24 hours
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button className="h-9 px-3 rounded-lg text-[12.5px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                  All actors
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
              <Stat label="Events (24h)" value="1,284" tone="primary" sub="+12% vs prior" />
              <Divider />
              <Stat label="Suspicious" value="1" tone="danger" sub="anomaly engine" />
              <Divider />
              <Stat label="Failed actions" value="14" tone="default" sub="auth · permissions" />
              <Divider />
              <Stat label="Retention" value="7 yrs" tone="success" sub="WORM storage" />
            </div>
          </div>
        </div>

        {/* Workspace */}
        <main className="flex-1">
          <div className="max-w-[1500px] w-full mx-auto px-8 pb-8">
            <AuditTable />
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
