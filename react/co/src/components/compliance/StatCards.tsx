import { AlertTriangle, FileCheck2, ShieldCheck, ArrowDownRight, ArrowUpRight } from "lucide-react";

const stats = [
  {
    label: "Pending evidence",
    value: "23",
    delta: "-8",
    deltaTone: "down-good",
    sub: "since last week",
    icon: FileCheck2,
    accent: "primary",
  },
  {
    label: "Active violations",
    value: "7",
    delta: "+2",
    deltaTone: "up-bad",
    sub: "2 high severity",
    icon: AlertTriangle,
    accent: "danger",
  },
  {
    label: "Active policies",
    value: "128",
    delta: "+5",
    deltaTone: "up-good",
    sub: "3 awaiting review",
    icon: ShieldCheck,
    accent: "success",
  },
];

export function StatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => {
        const Icon = s.icon;
        const Arrow = s.deltaTone.startsWith("up") ? ArrowUpRight : ArrowDownRight;
        const tone =
          s.deltaTone === "up-bad"
            ? "text-destructive bg-destructive-soft"
            : s.deltaTone === "down-good" || s.deltaTone === "up-good"
            ? "text-success bg-success-soft"
            : "text-muted-foreground bg-muted";
        const iconBg =
          s.accent === "primary"
            ? "bg-primary-soft text-primary"
            : s.accent === "danger"
            ? "bg-destructive-soft text-destructive"
            : "bg-success-soft text-success";
        return (
          <div
            key={s.label}
            className="bg-card rounded-2xl border border-border shadow-card p-5 hover:shadow-elevated transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`h-9 w-9 rounded-xl grid place-items-center ${iconBg}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-0.5 ${tone}`}>
                <Arrow className="h-3 w-3" />
                {s.delta}
              </span>
            </div>
            <div className="text-[12px] text-muted-foreground">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-[28px] font-semibold tracking-tight text-foreground tabular-nums leading-none">
                {s.value}
              </div>
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-2">{s.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
