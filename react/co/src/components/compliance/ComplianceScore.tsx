import { TrendingUp, ArrowUpRight } from "lucide-react";

const breakdown = [
  { label: "Data privacy", score: 96, tone: "success" },
  { label: "Financial", score: 91, tone: "success" },
  { label: "HR policies", score: 78, tone: "warning" },
  { label: "Vendor risk", score: 64, tone: "danger" },
];

export function ComplianceScore() {
  const score = 87;
  const circumference = 2 * Math.PI * 56;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 lg:col-span-2">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Compliance health
          </div>
          <h3 className="text-[17px] font-semibold tracking-tight text-foreground">
            Organization score
          </h3>
        </div>
        <button className="text-[12px] font-medium text-primary hover:underline flex items-center gap-1">
          Full report
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 items-center">
        {/* Radial */}
        <div className="relative h-36 w-36 mx-auto">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted" />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="url(#scoreGrad)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.55 0.19 258)" />
                <stop offset="100%" stopColor="oklch(0.68 0.16 200)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-[34px] font-semibold tracking-tight text-foreground leading-none tabular-nums">
                {score}
              </div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mt-1">
                of 100
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 text-[12px] text-success font-medium mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            +4.2 pts vs. last month
          </div>
          {breakdown.map((b) => (
            <div key={b.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-foreground/80">{b.label}</span>
                <span className="font-semibold tabular-nums text-foreground">{b.score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    b.tone === "success" ? "bg-success" : b.tone === "warning" ? "bg-warning" : "bg-destructive"
                  }`}
                  style={{ width: `${b.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
