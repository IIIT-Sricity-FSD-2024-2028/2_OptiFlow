const rows = [
  { dept: "Finance", risk: 22, level: "Low", trend: -3, color: "success" },
  { dept: "Engineering", risk: 38, level: "Low", trend: -1, color: "success" },
  { dept: "Marketing", risk: 54, level: "Medium", trend: +6, color: "warning" },
  { dept: "Sales", risk: 61, level: "Medium", trend: +2, color: "warning" },
  { dept: "Operations", risk: 78, level: "High", trend: +9, color: "danger" },
  { dept: "Legal", risk: 18, level: "Low", trend: 0, color: "success" },
];

export function RiskByDepartment() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Risk profile
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            By department
          </h3>
        </div>
        <button className="text-[12px] text-muted-foreground hover:text-foreground">View all</button>
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.dept} className="space-y-1.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{r.dept}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    r.color === "success"
                      ? "bg-success-soft text-success"
                      : r.color === "warning"
                      ? "bg-warning-soft text-warning-foreground"
                      : "bg-destructive-soft text-destructive"
                  }`}
                >
                  {r.level}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-foreground/80">{r.risk}</span>
                <span
                  className={`text-[10.5px] tabular-nums ${
                    r.trend > 0 ? "text-destructive" : r.trend < 0 ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {r.trend > 0 ? "+" : ""}
                  {r.trend}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  r.color === "success" ? "bg-success" : r.color === "warning" ? "bg-warning" : "bg-destructive"
                }`}
                style={{ width: `${r.risk}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
