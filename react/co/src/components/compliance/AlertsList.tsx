import { AlertTriangle, ShieldAlert, FileWarning, Lock } from "lucide-react";

const alerts = [
  {
    icon: ShieldAlert,
    severity: "Critical",
    title: "Unauthorized data export detected",
    meta: "Operations · 8 min ago",
    tone: "danger",
  },
  {
    icon: Lock,
    severity: "High",
    title: "MFA disabled for 3 admin accounts",
    meta: "Engineering · 42 min ago",
    tone: "danger",
  },
  {
    icon: FileWarning,
    severity: "Medium",
    title: "Vendor contract missing DPA addendum",
    meta: "Procurement · 2 h ago",
    tone: "warning",
  },
  {
    icon: AlertTriangle,
    severity: "Medium",
    title: "Policy conflict: Retention vs. GDPR-22",
    meta: "Legal · 5 h ago",
    tone: "warning",
  },
];

export function AlertsList() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:col-span-2">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Live monitoring
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Recent alerts
          </h3>
        </div>
        <button className="text-[12px] text-primary font-medium hover:underline">View all alerts</button>
      </div>

      <div className="space-y-1">
        {alerts.map((a, i) => {
          const Icon = a.icon;
          const tone =
            a.tone === "danger"
              ? "bg-destructive-soft text-destructive"
              : "bg-warning-soft text-warning-foreground";
          return (
            <div
              key={i}
              className="group flex items-start gap-3 px-3 py-3 -mx-3 rounded-xl hover:bg-secondary/60 transition-colors cursor-pointer"
            >
              <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${tone}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      a.tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"
                    }`}
                  >
                    {a.severity}
                  </span>
                </div>
                <div className="text-[13px] font-medium text-foreground truncate">{a.title}</div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">{a.meta}</div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-[11.5px] font-medium text-primary transition-opacity">
                Review →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
