import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/compliance/Sidebar";
import { Topbar } from "@/components/compliance/Topbar";
import { ComplianceScore } from "@/components/compliance/ComplianceScore";
import { StatCards } from "@/components/compliance/StatCards";
import { TrendChart } from "@/components/compliance/TrendChart";
import { RiskByDepartment } from "@/components/compliance/RiskByDepartment";
import { AlertsList } from "@/components/compliance/AlertsList";
import { AuditFeed } from "@/components/compliance/AuditFeed";
import { QuickActions } from "@/components/compliance/QuickActions";
import { EvidenceQueue } from "@/components/compliance/EvidenceQueue";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Compliance Overview · OfficeSync" },
      {
        name: "description",
        content:
          "OfficeSync compliance dashboard — monitor health, violations, evidence, audit activity and risk across your organization.",
      },
    ],
  }),
});

function Dashboard() {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="flex-1 px-6 lg:px-8 py-7 space-y-6 max-w-[1500px] w-full mx-auto">
          {/* Hero header */}
          <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-[12px] font-medium text-primary mb-1.5">Good morning, Elena</div>
              <h1 className="text-[26px] md:text-[28px] font-semibold tracking-tight text-foreground leading-tight">
                Compliance overview
              </h1>
              <p className="text-[13.5px] text-muted-foreground mt-1.5 max-w-xl">
                A real-time pulse of your organization's controls, evidence and risk posture.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-success-soft text-success font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                All systems monitored
              </div>
            </div>
          </section>

          {/* Top row: score + stats */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ComplianceScore />
            <div className="lg:col-span-1">
              <QuickActions />
            </div>
          </section>

          <section>
            <StatCards />
          </section>

          {/* Trend + risk */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <TrendChart />
            <RiskByDepartment />
          </section>

          {/* Alerts + audit */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <AlertsList />
            <AuditFeed />
          </section>

          {/* Evidence */}
          <section>
            <EvidenceQueue />
          </section>

          <footer className="pt-4 pb-2 text-center text-[11.5px] text-muted-foreground">
            OfficeSync Compliance · synced 2 minutes ago
          </footer>
        </main>
      </div>
    </div>
  );
}
